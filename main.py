"""
Institute Operations Copilot - Complete Hackathon Backend
Single-file backend implementation with SQLite (institute.db), PyJWT,
SQLite Authorizer (read-only RBAC), Google GenAI SDK (Gemini Flash), and In-Memory Timetable.
"""

import os
import re
import sqlite3
import jwt
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Initialize Google GenAI client if API key is present
genai_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[Warning] Failed to initialize Google GenAI client: {e}")

# Application Constants
DB_PATH = "institute.db"
JWT_SECRET = "institute-copilot-secret-jwt-key-2026"
JWT_ALGORITHM = "HS256"

# FastAPI Application Instance
app = FastAPI(
    title="Institute Operations Copilot API",
    description="Backend for Institute Operations Copilot Hackathon Demo",
    version="1.0.0"
)

# Enable CORS for all origins (specifically http://localhost:5173 for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# DATABASE SETUP & SEEDING (institute.db)
# ==============================================================================

def init_db():
    """
    Initializes SQLite database 'institute.db' and seeds realistic initial data
    if tables are empty or newly created.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. users(username, password, role)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)

    # 2. batches(id, name, course, trainer, timing)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        course TEXT NOT NULL,
        trainer TEXT NOT NULL,
        timing TEXT NOT NULL
    )
    """)

    # 3. students(id, name, phone, batch_id)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES batches(id)
    )
    """)

    # 4. emis(id, student_id, amount, due_date, status 'due' or 'paid')
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('due', 'paid')),
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    """)

    # 5. attendance(id, student_id, class_date, present 0/1, mode 'classroom' or 'online')
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        class_date TEXT NOT NULL,
        present INTEGER NOT NULL CHECK(present IN (0, 1)),
        mode TEXT NOT NULL CHECK(mode IN ('classroom', 'online')),
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    """)

    # 6. audit_log(id, who, role, action, detail, ts)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        who TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT NOT NULL,
        ts TEXT NOT NULL
    )
    """)

    # 7. pending_actions(id, who, student_name, phone, message, status)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pending_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        who TEXT NOT NULL,
        student_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
    )
    """)

    conn.commit()

    # --- SEED DATA INSERTION (if users table is empty) ---
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("[DB] Seeding institute.db with initial demo data...")

        # 4 users: role equals username
        users = [
            ("owner", "owner123", "owner"),
            ("counselor", "c123", "counselor"),
            ("trainer", "t123", "trainer"),
            ("accounts", "a123", "accounts"),
        ]
        cursor.executemany("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", users)

        # 2 batches: Java-A (Ravi, 10:00) and Python-B (Meena, 14:00)
        batches = [
            ("Java-A", "Java-A", "Java Fullstack", "Ravi", "10:00"),
            ("Python-B", "Python-B", "Python AI/ML", "Meena", "14:00"),
        ]
        cursor.executemany("INSERT INTO batches (id, name, course, trainer, timing) VALUES (?, ?, ?, ?, ?)", batches)

        # 10 students: realistic Indian names, first 6 in Java-A, next 4 in Python-B
        students = [
            (1, "Aarav Sharma", "+91 9876543210", "Java-A"),
            (2, "Priya Patel", "+91 9876543211", "Java-A"),
            (3, "Rohan Gupta", "+91 9876543212", "Java-A"),    # Misses 4 classes, Overdue EMI
            (4, "Ananya Iyer", "+91 9876543213", "Java-A"),
            (5, "Vikram Malhotra", "+91 9876543214", "Java-A"),
            (6, "Neha Singh", "+91 9876543215", "Java-A"),      # Misses 4 classes, Due soon
            (7, "Siddharth Verma", "+91 9876543216", "Python-B"),# Paid
            (8, "Sneha Joshi", "+91 9876543217", "Python-B"),
            (9, "Aditya Nair", "+91 9876543218", "Python-B"),   # Misses 4 classes, Due soon
            (10, "Pooja Reddy", "+91 9876543219", "Python-B"),
        ]
        cursor.executemany("INSERT INTO students (id, name, phone, batch_id) VALUES (?, ?, ?, ?)", students)

        # EMIs: Rs 5000 per student. 2 paid, 1 overdue, others due within 1 to 6 days
        today = date.today()
        emis = [
            (1, 1, 5000, (today + timedelta(days=2)).isoformat(), "paid"),   # Student 1: Paid
            (2, 2, 5000, (today + timedelta(days=2)).isoformat(), "due"),    # Student 2: Due in 2 days
            (3, 3, 5000, (today - timedelta(days=2)).isoformat(), "due"),    # Student 3: OVERDUE by 2 days
            (4, 4, 5000, (today + timedelta(days=3)).isoformat(), "due"),    # Student 4: Due in 3 days
            (5, 5, 5000, (today + timedelta(days=4)).isoformat(), "due"),    # Student 5: Due in 4 days
            (6, 6, 5000, (today + timedelta(days=1)).isoformat(), "due"),    # Student 6: Due in 1 day
            (7, 7, 5000, (today + timedelta(days=5)).isoformat(), "paid"),   # Student 7: Paid
            (8, 8, 5000, (today + timedelta(days=4)).isoformat(), "due"),    # Student 8: Due in 4 days
            (9, 9, 5000, (today + timedelta(days=6)).isoformat(), "due"),    # Student 9: Due in 6 days
            (10, 10, 5000, (today + timedelta(days=5)).isoformat(), "due"),  # Student 10: Due in 5 days
        ]
        cursor.executemany("INSERT INTO emis (id, student_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)", emis)

        # 6 days of attendance per student.
        # Students 3, 6, and 9 missed 4 classes (present in 2, absent in 4).
        # Other students missed 0 or 1 class.
        attendance_records = []
        att_id = 1
        class_dates = [(today - timedelta(days=i)).isoformat() for i in range(6, 0, -1)]

        for s_id in range(1, 11):
            for day_idx, c_date in enumerate(class_dates):
                mode = "classroom" if day_idx % 2 == 0 else "online"
                if s_id in (3, 6, 9):
                    # Missed 4 classes: only present on day 0 and day 5
                    present = 1 if day_idx in (0, 5) else 0
                elif s_id in (2, 8):
                    # Missed 1 class: absent on day 3
                    present = 0 if day_idx == 3 else 1
                else:
                    # Present in all 6
                    present = 1

                attendance_records.append((att_id, s_id, c_date, present, mode))
                att_id += 1

        cursor.executemany("INSERT INTO attendance (id, student_id, class_date, present, mode) VALUES (?, ?, ?, ?, ?)", attendance_records)

        # Initial audit log entry
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        INSERT INTO audit_log (who, role, action, detail, ts)
        VALUES ('system', 'owner', 'SYSTEM_INITIALIZED', 'Database institute.db seeded with users, batches, students, EMIs, and attendance', ?)
        """, (now_str,))

        conn.commit()
        print("[DB] Initial database seeding completed.")

    conn.close()

# Run database setup on startup
init_db()


# ==============================================================================
# AUDIT LOGGER HELPER
# ==============================================================================

def log_audit(who: str, role: str, action: str, detail: str):
    """Logs an operational action to the audit_log table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO audit_log (who, role, action, detail, ts) VALUES (?, ?, ?, ?, ?)",
            (who, role, action, detail, now_str)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Audit Error] Failed to write audit log: {e}")


# ==============================================================================
# SQLITE READ-ONLY CONNECTION & AUTHORIZER PERMISSION LAYER
# ==============================================================================

def make_sqlite_authorizer(role: str):
    """
    Creates a SQLite authorizer callback that enforces strict role-based access
    at the database engine level.
    Rules:
    - owner & counselor: can read students, batches, emis, attendance, audit_log, pending_actions
    - accounts: can read students (all columns), batches, and emis
    - trainer: can read students (id, name, batch_id only - NO phone column!), batches, attendance (NO emis!)
    - users table & sqlite_master are forbidden for copilot read queries.
    - All non-SELECT statements (INSERT, UPDATE, DELETE, DROP, ALTER) are DENIED.
    """
    def authorizer_callback(action_code, param1, param2, db_name, trigger_or_view):
        # Allow SELECT queries and scalar SQL functions
        if action_code in (sqlite3.SQLITE_SELECT, sqlite3.SQLITE_FUNCTION):
            return sqlite3.SQLITE_OK

        # When reading a column from a table
        if action_code == sqlite3.SQLITE_READ:
            table_name = (param1 or "").lower()
            column_name = (param2 or "").lower()

            # Deny credential tables and internal sqlite metadata
            if table_name in ("users", "sqlite_master", "sqlite_temp_master", "sqlite_sequence", "sqlite_stat1"):
                return sqlite3.SQLITE_DENY

            # Role: Owner & Counselor can read all operational institute tables
            if role in ("owner", "counselor"):
                if table_name in ("students", "batches", "emis", "attendance", "audit_log", "pending_actions"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            # Role: Accounts can read students (all columns), batches, and emis
            elif role == "accounts":
                if table_name in ("students", "batches", "emis"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            # Role: Trainer can read students (id, name, batch_id only), batches, and attendance.
            # Must NOT read emis table or phone column of students!
            elif role == "trainer":
                if table_name == "emis":
                    return sqlite3.SQLITE_DENY
                if table_name == "students":
                    if column_name == "phone":
                        return sqlite3.SQLITE_DENY
                    if column_name in ("id", "name", "batch_id", ""):
                        return sqlite3.SQLITE_OK
                    return sqlite3.SQLITE_DENY
                if table_name in ("batches", "attendance"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            return sqlite3.SQLITE_DENY

        # Deny all mutations, DDL, DML, PRAGMAs, and transactions
        return sqlite3.SQLITE_DENY

    return authorizer_callback


def run_readonly_query(sql: str, role: str) -> Dict[str, Any]:
    """
    Runs a single SELECT query on a read-only SQLite connection (mode=ro)
    equipped with the database-level authorizer for the user's role.
    Limits output to at most 100 rows.
    """
    cleaned_sql = sql.strip().rstrip(";")
    
    # Must be a single SELECT statement
    if not (cleaned_sql.lower().startswith("select") or cleaned_sql.lower().startswith("with")):
        return {
            "success": False,
            "error": "Blocked: this data isn't available for your role.",
            "sql": sql,
            "columns": [],
            "rows": []
        }

    # Open read-only connection
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.set_authorizer(make_sqlite_authorizer(role))
        cursor = conn.cursor()
        cursor.execute(cleaned_sql)
        rows = cursor.fetchmany(100)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        conn.close()
        return {
            "success": True,
            "columns": columns,
            "rows": [list(r) for r in rows],
            "sql": cleaned_sql,
            "error": None
        }
    except (sqlite3.DatabaseError, sqlite3.OperationalError) as err:
        return {
            "success": False,
            "error": "Blocked: this data isn't available for your role.",
            "sql": sql,
            "columns": [],
            "rows": [],
            "raw_error": str(err)
        }
    except Exception as err:
        return {
            "success": False,
            "error": "Blocked: this data isn't available for your role.",
            "sql": sql,
            "columns": [],
            "rows": [],
            "raw_error": str(err)
        }


# ==============================================================================
# JWT AUTHENTICATION
# ==============================================================================

def create_jwt_token(username: str, role: str) -> str:
    """Generates a signed PyJWT token with username and role claims."""
    payload = {
        "username": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, str]:
    """
    FastAPI dependency validating the 'Authorization: Bearer <token>' header.
    Returns dict containing username and role.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Expected 'Authorization: Bearer <token>'"
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'"
        )
    token = parts[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"username": payload["username"], "role": payload["role"]}
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )


# ==============================================================================
# IN-MEMORY CLASH-FREE TIMETABLE
# ==============================================================================
# Constraints:
# - Mon-Fri, slots: 10:00, 14:00, 16:00
# - Rooms: R1 (capacity 30), R2 (capacity 20)
# - Batches:
#     Java-A (Ravi, 25 students, 3 sessions) -> must be in R1 (capacity 30)
#     Python-B (Meena, 18 students, 3 sessions) -> fits in R1 or R2
#     Web-C (Ravi, 15 students, 2 sessions) -> fits in R1 or R2
# - Invariants:
#     1. A trainer is never in two places at once.
#     2. A room never hosts two batches at once.
#     3. Room capacity fits the batch.
#     4. A batch has at most one session per day.

INITIAL_TIMETABLE = [
    {"day": "Monday", "time": "10:00", "batch": "Java-A", "trainer": "Ravi", "room": "R1"},
    {"day": "Monday", "time": "14:00", "batch": "Python-B", "trainer": "Meena", "room": "R2"},
    {"day": "Tuesday", "time": "10:00", "batch": "Web-C", "trainer": "Ravi", "room": "R2"},
    {"day": "Wednesday", "time": "10:00", "batch": "Java-A", "trainer": "Ravi", "room": "R1"},
    {"day": "Wednesday", "time": "14:00", "batch": "Python-B", "trainer": "Meena", "room": "R2"},
    {"day": "Thursday", "time": "10:00", "batch": "Web-C", "trainer": "Ravi", "room": "R2"},
    {"day": "Friday", "time": "10:00", "batch": "Java-A", "trainer": "Ravi", "room": "R1"},
    {"day": "Friday", "time": "14:00", "batch": "Python-B", "trainer": "Meena", "room": "R2"},
]

# Global in-memory timetable state
timetable_state: List[Dict[str, str]] = [dict(s) for s in INITIAL_TIMETABLE]
unavailable_trainers: List[Dict[str, str]] = []


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    username: str

class CopilotRequest(BaseModel):
    question: str

class ReplanRequest(BaseModel):
    trainer: Optional[str] = None
    trainer_unavailable: Optional[str] = None
    day: Optional[str] = None


# ==============================================================================
# ENDPOINT 1: POST /login
# ==============================================================================

@app.post("/login", response_model=LoginResponse)
def login(creds: LoginRequest):
    """
    POST /login {username, password} -> {token, role, username}
    Validates user credentials against institute.db. Returns 401 on failure.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT username, password, role FROM users WHERE username = ? AND password = ?",
        (creds.username.strip().lower(), creds.password.strip())
    )
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    username, _, role = user
    token = create_jwt_token(username, role)
    log_audit(username, role, "LOGIN", f"User '{username}' logged in with role '{role}'")
    return LoginResponse(token=token, role=role, username=username)


# ==============================================================================
# ENDPOINT 2: POST /copilot
# ==============================================================================

def generate_sql_with_gemini(question: str, role: str) -> str:
    """
    Constructs a role-scoped prompt and invokes Gemini Flash to produce
    a single SQLite SELECT query.
    """
    today_str = date.today().isoformat()

    # Schema descriptions tailored strictly to role
    if role in ("owner", "counselor"):
        schema_text = """
Tables and Columns you may query:
- batches(id, name, course, trainer, timing)
- students(id, name, phone, batch_id)
- emis(id, student_id, amount, due_date, status ['due', 'paid'])
- attendance(id, student_id, class_date, present [0 or 1], mode ['classroom', 'online'])
- pending_actions(id, who, student_name, phone, message, status)
- audit_log(id, who, role, action, detail, ts)
"""
    elif role == "accounts":
        schema_text = """
Tables and Columns you may query:
- batches(id, name, course, trainer, timing)
- students(id, name, phone, batch_id)
- emis(id, student_id, amount, due_date, status ['due', 'paid'])
"""
    elif role == "trainer":
        schema_text = """
Tables and Columns you may query:
- batches(id, name, course, trainer, timing)
- students(id, name, batch_id)   [NOTE: You MUST NOT query phone, emis, or fees!]
- attendance(id, student_id, class_date, present [0 or 1], mode ['classroom', 'online'])
"""
    else:
        schema_text = "No tables allowed."

    prompt = f"""You are an AI database copilot for an institute management platform.
Convert the following plain-English question into ONE valid SQLite SELECT query.

Today's date is: {today_str}

Allowed database schema for the caller's role ({role}):
{schema_text}

Table Joins:
- students.batch_id = batches.id
- emis.student_id = students.id
- attendance.student_id = students.id

RULES:
1. Return ONLY the raw SQLite SELECT query.
2. Do NOT write multiple statements.
3. Do NOT use markdown code blocks, backticks, or explanatory text.
4. If the question asks for columns or tables not listed in the allowed schema above, do your best or query what is asked (the database authorizer will enforce security).

Question: "{question}"
SQL Query:"""

    if genai_client:
        # Try Gemini Flash models
        for model_name in ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            try:
                response = genai_client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                text = response.text.strip()
                # Clean any markdown code blocks
                text = re.sub(r"^```(?:sql)?\s*", "", text, flags=re.IGNORECASE)
                text = re.sub(r"\s*```$", "", text)
                return text.strip()
            except Exception as e:
                print(f"[Gemini Error with {model_name}]: {e}")
                continue

    # Fallback heuristic SQL generator for common benchmark queries if Gemini is offline
    q_low = question.lower()
    if "java" in q_low and ("missed" in q_low or "class" in q_low) and ("emi" in q_low or "due" in q_low):
        return """SELECT s.id, s.name, s.phone, s.batch_id, 
       (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.present = 0) AS missed_classes,
       e.amount AS emi_amount, e.due_date, e.status AS emi_status
FROM students s
JOIN batches b ON s.batch_id = b.id
JOIN emis e ON s.id = e.student_id
WHERE b.name = 'Java-A'
  AND (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.present = 0) >= 3
  AND e.status = 'due';"""

    if "emi" in q_low or "fee" in q_low:
        return "SELECT s.id, s.name, s.phone, e.amount, e.due_date, e.status FROM students s JOIN emis e ON s.id = e.student_id WHERE e.status = 'due';"

    if "missed" in q_low or "attendance" in q_low:
        return """SELECT s.id, s.name, s.batch_id, 
       (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.present = 0) AS missed_classes
FROM students s
WHERE (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.present = 0) >= 3;"""

    return "SELECT s.id, s.name, s.batch_id, b.name AS batch_name, b.trainer FROM students s JOIN batches b ON s.batch_id = b.id;"


def generate_summary_with_gemini(question: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Generates one plain-English sentence summarizing the query result."""
    fallback = f"Found {len(rows)} matching record{'s' if len(rows) != 1 else ''} in the institute database."
    if not genai_client or len(rows) == 0:
        return fallback

    prompt = f"""Summarize this database result in exactly ONE concise, plain-English sentence for institute staff.
User Question: "{question}"
Columns: {columns}
Rows ({len(rows)} returned): {rows[:5]}
Summary:"""
    try:
        response = genai_client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt
        )
        return response.text.strip().replace("\n", " ")
    except Exception:
        return fallback


@app.post("/copilot")
def ask_copilot(req: CopilotRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /copilot {question} -> {summary, sql, columns, rows, pending, follow_ups, error}
    """
    question = req.question.strip()
    role = current_user["role"]
    username = current_user["username"]

    # 1. Ask Gemini to generate ONE SELECT query
    sql = generate_sql_with_gemini(question, role)

    # 2. Run query on read-only connection with role authorizer
    result = run_readonly_query(sql, role)

    # 3. If query was blocked by authorizer
    if not result["success"]:
        log_audit(username, role, "BLOCKED", f"Authorizer blocked query: {sql[:100]}")
        return {
            "summary": "",
            "sql": sql,
            "columns": [],
            "rows": [],
            "pending": [],
            "follow_ups": [],
            "error": "Blocked: this data isn't available for your role."
        }

    # Query succeeded
    log_audit(username, role, "QUERY", f"Executed read-only query returning {len(result['rows'])} rows: {sql[:80]}")
    columns = result["columns"]
    rows = result["rows"]

    # Generate summary sentence
    summary = generate_summary_with_gemini(question, columns, rows)

    # Follow-ups (no fee suggestions for trainers)
    if role == "trainer":
        follow_ups = [
            "Which students have missed more than 3 classes in my batch?",
            "What is the attendance percentage across Java-A this week?",
            "Show me the schedule for Room R1 tomorrow."
        ]
    elif role == "accounts":
        follow_ups = [
            "Show all unpaid EMIs due in the next 3 days.",
            "Which students in Python-B have cleared all fees?",
            "What is the total overdue fee amount across all batches?"
        ]
    else:
        follow_ups = [
            "Which students in Java-A have missed 3 or more classes and have an EMI due this week?",
            "Show all students at high dropout risk with their breakdown.",
            "Who are the top 3 fee defaulters across both batches?"
        ]

    # Check for reminder drafting keywords: remind / whatsapp / draft / send
    pending_list = []
    q_lower = question.lower()
    has_reminder_intent = any(k in q_lower for k in ("remind", "whatsapp", "draft", "send"))

    if has_reminder_intent:
        # Trainers cannot draft reminders per role rules
        if role != "trainer":
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()

            # Find name, phone, due_date from rows if present, or fetch from student id
            for row in rows:
                row_dict = dict(zip([c.lower() for c in columns], row))
                s_name = row_dict.get("name") or row_dict.get("student_name") or "Student"
                phone = row_dict.get("phone") or "+91 9876543210"
                amount = row_dict.get("amount") or row_dict.get("emi_amount") or 5000
                due_date = row_dict.get("due_date") or date.today().isoformat()
                missed = row_dict.get("missed_classes") or row_dict.get("missed")

                extra = f" You have also missed {missed} classes." if missed else ""
                message = f"Hi {s_name}, gentle reminder from the institute regarding your EMI of Rs {amount} due on {due_date}.{extra} Please let us know if you need any assistance."

                cur.execute(
                    "INSERT INTO pending_actions (who, student_name, phone, message, status) VALUES (?, ?, ?, ?, 'pending')",
                    (username, s_name, phone, message)
                )
                action_id = cur.lastrowid
                pending_list.append({
                    "id": action_id,
                    "student_name": s_name,
                    "phone": phone,
                    "message": message,
                    "status": "pending"
                })

            conn.commit()
            conn.close()

            if pending_list:
                log_audit(username, role, "DRAFT", f"Drafted {len(pending_list)} WhatsApp reminder(s) into pending_actions")

    return {
        "summary": summary,
        "sql": result["sql"],
        "columns": columns,
        "rows": rows,
        "pending": pending_list,
        "follow_ups": follow_ups,
        "error": None
    }


# ==============================================================================
# ENDPOINT 3: GET /brief (The Morning Brief)
# ==============================================================================

@app.get("/brief")
def get_morning_brief(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /brief -> morning brief with prioritized operational items.
    Enforces role permissions: Trainers NEVER receive fee items or approvals items.
    """
    role = current_user["role"]
    username = current_user["username"]
    today = date.today()
    items = []

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Unpaid EMIs (Only for non-trainer roles)
    if role != "trainer":
        cursor.execute("SELECT id, student_id, amount, due_date, status FROM emis WHERE status = 'due'")
        due_emis = cursor.fetchall()
        
        near_emis = []
        overdue_emis = []
        due_in_2_days = False
        total_due_amt = 0

        for e in due_emis:
            e_id, s_id, amt, due_d_str, status_val = e
            due_d = datetime.strptime(due_d_str, "%Y-%m-%d").date()
            days_diff = (due_d - today).days

            if days_diff < 0:
                overdue_emis.append(e)
                total_due_amt += amt
            elif 0 <= days_diff <= 7:
                near_emis.append(e)
                total_due_amt += amt
                if days_diff <= 2:
                    due_in_2_days = True

        total_count = len(overdue_emis) + len(near_emis)
        if total_count > 0:
            severity = "high" if (due_in_2_days or len(overdue_emis) > 0) else "medium"
            overdue_note = f" (including {len(overdue_emis)} overdue)" if overdue_emis else ""
            items.append({
                "id": "brief-emis",
                "type": "emi_due",
                "severity": severity,
                "title": f"{total_count} Unpaid EMIs Due This Week",
                "detail": f"Totaling Rs {total_due_amt:,}{overdue_note}. High-priority follow-up recommended.",
                "action_label": "Draft Reminders",
                "target": "copilot",
                "prompt": "Which students have an EMI due this week? Draft a WhatsApp reminder for each."
            })

    # 2. Students who missed 3 or more of their last 6 classes
    cursor.execute("""
    SELECT s.name, COUNT(*) as missed_count 
    FROM students s 
    JOIN attendance a ON s.id = a.student_id 
    WHERE a.present = 0 
    GROUP BY s.id 
    HAVING missed_count >= 3
    """)
    absent_students = cursor.fetchall()

    if absent_students:
        names = [r[0] for r in absent_students]
        items.append({
            "id": "brief-attendance",
            "type": "attendance_deficit",
            "severity": "high",
            "title": f"{len(absent_students)} Students with Severe Absenteeism",
            "detail": f"{', '.join(names)} missed 3 or more of their last 6 classes.",
            "action_label": "View At-Risk Students",
            "target": "at-risk",
            "prompt": "Show me students who missed 3 or more of their last 6 classes"
        })

    # 3. Pending Approvals (Only for non-trainer roles)
    if role != "trainer":
        cursor.execute("SELECT COUNT(*) FROM pending_actions WHERE status = 'pending'")
        pending_count = cursor.fetchone()[0]
        if pending_count > 0:
            items.append({
                "id": "brief-approvals",
                "type": "pending_approvals",
                "severity": "medium",
                "title": f"{pending_count} Pending Actions Awaiting Approval",
                "detail": "Outbound WhatsApp student communication drafts queued for authorization.",
                "action_label": "Review Approvals",
                "target": "approvals",
                "prompt": "Show me all pending approval actions"
            })

    conn.close()

    # 4. Timetable conflicts or unavailable trainers
    if unavailable_trainers:
        u_desc = [f"{u['trainer']} ({u['day']})" for u in unavailable_trainers]
        items.append({
            "id": "brief-timetable-unavail",
            "type": "timetable_conflict",
            "severity": "high",
            "title": "Trainer Marked Unavailable",
            "detail": f"Trainer(s) unavailable: {', '.join(u_desc)}. Re-planning required.",
            "action_label": "Re-plan Timetable",
            "target": "timetable",
            "prompt": f"Trainer {unavailable_trainers[0]['trainer']} is unavailable on {unavailable_trainers[0]['day']}. Re-plan the timetable."
        })
    else:
        items.append({
            "id": "brief-timetable-ok",
            "type": "timetable_status",
            "severity": "low",
            "title": "Master Timetable Clash-Free",
            "detail": "All 8 batch sessions across Mon-Fri are fully staffed with zero room conflicts.",
            "action_label": "View Timetable",
            "target": "timetable",
            "prompt": "Show me the current master timetable"
        })

    log_audit(username, role, "BRIEF", f"Morning brief viewed with {len(items)} items")

    return {
        "greeting": f"Good morning, {username.capitalize()}!",
        "summary": f"{len(items)} things need attention today",
        "date": today.isoformat(),
        "items": items
    }


# ==============================================================================
# ENDPOINT 4: GET /at-risk
# ==============================================================================

@app.get("/at-risk")
def get_at_risk_students(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /at-risk -> List of students with dropout risk scores and reasons.
    Score = 2 points per missed class in last 6, +3 if unpaid EMI due in 7 days, +4 if overdue.
    High >= 6, Medium >= 3, else Low.
    Trainers get ONLY attendance reasons (no fee reasons, no phone).
    """
    role = current_user["role"]
    username = current_user["username"]
    today = date.today()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Fetch students and batches
    cursor.execute("""
    SELECT s.id, s.name, s.batch_id, b.name AS batch_name
    FROM students s
    JOIN batches b ON s.batch_id = b.id
    """)
    students = cursor.fetchall()

    results = []

    for s in students:
        s_id, s_name, b_id, b_name = s

        # 1. Attendance points: 2 points per missed class in last 6
        cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ? AND present = 0", (s_id,))
        missed_count = cursor.fetchone()[0]

        score = missed_count * 2
        reasons = []

        if missed_count > 0:
            reasons.append(f"Missed {missed_count} of last 6 classes")

        # 2. Fee points & reasons (Excluded for trainer role)
        if role != "trainer":
            cursor.execute("SELECT amount, due_date, status FROM emis WHERE student_id = ?", (s_id,))
            emi_row = cursor.fetchone()
            if emi_row:
                amt, due_date_str, emi_status = emi_row
                if emi_status == "due":
                    due_d = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                    days_diff = (due_d - today).days

                    if days_diff < 0:
                        # Overdue EMI (+4 points)
                        score += 4
                        reasons.append(f"Overdue EMI of Rs {amt:,} (due {abs(days_diff)} days ago)")
                    elif 0 <= days_diff <= 7:
                        # Due within 7 days (+3 points)
                        score += 3
                        reasons.append(f"EMI of Rs {amt:,} due in {days_diff} day{'s' if days_diff != 1 else ''}")

        # Compute risk tier
        if score >= 6:
            risk = "high"
        elif score >= 3:
            risk = "medium"
        else:
            risk = "low"

        results.append({
            "student_id": s_id,
            "name": s_name,
            "batch": b_name,
            "risk": risk,
            "score": score,
            "reasons": reasons
        })

    conn.close()

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    log_audit(username, role, "AT_RISK", f"Viewed at-risk list ({len(results)} students evaluated)")
    return results


# ==============================================================================
# ENDPOINT 5: GET /pending
# ==============================================================================

@app.get("/pending")
def get_pending_actions(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /pending -> list of pending_actions.
    Role check: owner, counselor, accounts only. Trainers get 403 Forbidden.
    """
    role = current_user["role"]
    if role == "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Trainers do not have access to pending action approvals."
        )

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, student_name, phone, message, status FROM pending_actions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "student_name": r[1],
            "student name": r[1], # support both keys
            "phone": r[2],
            "message": r[3],
            "status": r[4]
        }
        for r in rows
    ]


# ==============================================================================
# ENDPOINT 6: POST /pending/{id}/approve and POST /pending/{id}/reject
# ==============================================================================

@app.post("/pending/{action_id}/approve")
def approve_pending_action(action_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /pending/{id}/approve -> {id, status: 'sent'}
    Mock WhatsApp dispatch. Only 'pending' items can be approved.
    Trainers forbidden (403).
    """
    role = current_user["role"]
    username = current_user["username"]
    if role == "trainer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for trainer role")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, student_name, status FROM pending_actions WHERE id = ?", (action_id,))
    item = cursor.fetchone()

    if not item:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")

    _, s_name, cur_status = item
    if cur_status != "pending":
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only 'pending' items can be decided. Current status is '{cur_status}'."
        )

    cursor.execute("UPDATE pending_actions SET status = 'sent' WHERE id = ?", (action_id,))
    conn.commit()
    conn.close()

    log_audit(username, role, "APPROVE", f"Approved WhatsApp reminder {action_id} for {s_name} (MOCKED send)")
    return {"id": action_id, "status": "sent"}


@app.post("/pending/{action_id}/reject")
def reject_pending_action(action_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /pending/{id}/reject -> {id, status: 'rejected'}
    Only 'pending' items can be rejected. Trainers forbidden (403).
    """
    role = current_user["role"]
    username = current_user["username"]
    if role == "trainer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for trainer role")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, student_name, status FROM pending_actions WHERE id = ?", (action_id,))
    item = cursor.fetchone()

    if not item:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")

    _, s_name, cur_status = item
    if cur_status != "pending":
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only 'pending' items can be decided. Current status is '{cur_status}'."
        )

    cursor.execute("UPDATE pending_actions SET status = 'rejected' WHERE id = ?", (action_id,))
    conn.commit()
    conn.close()

    log_audit(username, role, "REJECT", f"Rejected action {action_id} for {s_name}")
    return {"id": action_id, "status": "rejected"}


# ==============================================================================
# ENDPOINT 7: GET /audit
# ==============================================================================

@app.get("/audit")
def get_audit_trail(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /audit -> latest 60 audit_log entries.
    Role rule: Owner only. Other roles get 403 Forbidden.
    """
    role = current_user["role"]
    if role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the Owner can inspect the audit ledger."
        )

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT who, role, action, detail, ts FROM audit_log ORDER BY id DESC LIMIT 60")
    logs = cursor.fetchall()
    conn.close()

    return [
        {"who": r[0], "role": r[1], "action": r[2], "detail": r[3], "ts": r[4]}
        for r in logs
    ]


# ==============================================================================
# ENDPOINT 8: GET /security-test
# ==============================================================================

@app.get("/security-test")
def run_security_test(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /security-test -> Runs 5 hardcoded forbidden attack queries through
    the database authorizer for the caller's role.
    Returns: [{prompt, sql, blocked, reason}]
    For trainer: all 5 are blocked!
    """
    role = current_user["role"]

    test_queries = [
        {
            "prompt": "Show me all EMI amounts and payment statuses",
            "sql": "SELECT * FROM emis"
        },
        {
            "prompt": "Access personal phone numbers of students",
            "sql": "SELECT name, phone FROM students"
        },
        {
            "prompt": "Inspect internal database schema and system tables",
            "sql": "SELECT name FROM sqlite_master"
        },
        {
            "prompt": "Dump all user credentials and password hashes",
            "sql": "SELECT * FROM users"
        },
        {
            "prompt": "Attempt to drop the students table",
            "sql": "DROP TABLE students"
        }
    ]

    results = []
    for t in test_queries:
        res = run_readonly_query(t["sql"], role)
        blocked = not res["success"]
        reason = res.get("error") if blocked else "Query was permitted"
        results.append({
            "prompt": t["prompt"],
            "sql": t["sql"],
            "blocked": blocked,
            "reason": reason
        })

    return results


# ==============================================================================
# ENDPOINT 9: TIMETABLE (In-Memory Clash-Free Engine)
# ==============================================================================

@app.get("/timetable")
def get_timetable(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /timetable -> {timetable: [{day, time, batch, trainer, room}], unavailable}
    """
    return {
        "timetable": timetable_state,
        "unavailable": unavailable_trainers
    }


@app.post("/timetable/replan")
def replan_timetable(req: ReplanRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /timetable/replan {trainer, day}
    Marks that trainer unavailable on that day and moves ONLY the affected classes
    to the nearest valid slot, leaving all other classes untouched.
    """
    global timetable_state, unavailable_trainers
    trainer = req.trainer or req.trainer_unavailable
    day = req.day or "Friday"

    if not trainer:
        raise HTTPException(status_code=400, detail="Missing 'trainer' parameter")

    # Mark trainer unavailable on this day
    unavail_entry = {"trainer": trainer, "day": day}
    if unavail_entry not in unavailable_trainers:
        unavailable_trainers.append(unavail_entry)

    changes = []
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    possible_times = ["10:00", "14:00", "16:00"]
    batch_capacities = {"Java-A": 25, "Python-B": 18, "Web-C": 15}

    # Find affected classes
    new_schedule = []
    for slot in timetable_state:
        if slot["trainer"].lower() == trainer.lower() and slot["day"].lower() == day.lower():
            # This slot must be moved
            batch = slot["batch"]
            old_day = slot["day"]
            old_time = slot["time"]
            old_room = slot["room"]
            needed_cap = batch_capacities.get(batch, 20)

            # Find nearest valid slot
            slot_found = False
            for d in days_order:
                # Do not move to the day the trainer is unavailable
                if d.lower() == day.lower():
                    continue

                # Check if batch already has a class on day d (Invariant 4: max 1 per day)
                if any(s["batch"] == batch and s["day"] == d for s in timetable_state if s != slot):
                    continue

                for t in possible_times:
                    # Check if trainer is busy at day d, time t (Invariant 1)
                    if any(s["trainer"] == trainer and s["day"] == d and s["time"] == t for s in timetable_state if s != slot):
                        continue

                    # Try room R1 (capacity 30) or R2 (capacity 20)
                    for r_name, r_cap in [("R1", 30), ("R2", 20)]:
                        if r_cap < needed_cap:
                            continue  # Room too small (Invariant 3)

                        # Check if room is occupied at day d, time t (Invariant 2)
                        if any(s["day"] == d and s["time"] == t and s["room"] == r_name for s in timetable_state if s != slot):
                            continue

                        # Valid clash-free slot found!
                        slot_found = True
                        new_slot = {
                            "day": d,
                            "time": t,
                            "batch": batch,
                            "trainer": trainer,
                            "room": r_name
                        }
                        new_schedule.append(new_slot)
                        changes.append({
                            "batch": batch,
                            "from": f"{old_day} {old_time} ({old_room})",
                            "to": f"{d} {t} ({r_name})",
                            "day": d,
                            "time": t,
                            "reason": f"Trainer {trainer} unavailable on {old_day}. Moved {batch} to {d} {t} in {r_name} (fits {needed_cap} students, 0 clashes)."
                        })
                        break
                    if slot_found:
                        break
                if slot_found:
                    break

            if not slot_found:
                # Fallback: keep slot
                new_schedule.append(slot)
        else:
            # Untouched slot
            new_schedule.append(slot)

    timetable_state = new_schedule
    log_audit(
        current_user["username"],
        current_user["role"],
        "TIMETABLE_REPLAN",
        f"Re-planned schedule for unavailable trainer {trainer} on {day}: {len(changes)} class(es) relocated"
    )

    return {
        "timetable": timetable_state,
        "changes": changes,
        "disruption": len(changes),
        "total": len(timetable_state)
    }


@app.post("/timetable/reset")
def reset_timetable(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /timetable/reset -> regenerates the original clash-free timetable.
    """
    global timetable_state, unavailable_trainers
    timetable_state = [dict(s) for s in INITIAL_TIMETABLE]
    unavailable_trainers = []
    log_audit(current_user["username"], current_user["role"], "TIMETABLE_RESET", "Master timetable reset to initial clash-free schedule")
    return {
        "message": "Timetable reset to original schedule",
        "timetable": timetable_state,
        "unavailable": []
    }
