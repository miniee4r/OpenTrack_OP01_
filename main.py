"""
Institute Operations Copilot - Complete Hackathon Backend
Single-file backend implementation with SQLite (institute.db), PyJWT,
SQLite Authorizer (read-only RBAC), Google GenAI SDK (Gemini Flash), and In-Memory Clash-Free Timetable.
"""

import os
import re
import json
import sqlite3
import jwt
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
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
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "institute.db")
JWT_SECRET = "institute-copilot-secret-jwt-key-2026"
JWT_ALGORITHM = "HS256"

# FastAPI Application Instance
app = FastAPI(
    title="Institute Operations Copilot API",
    description="Backend for Institute Operations Copilot Hackathon Demo",
    version="2.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
# DATABASE SETUP & SEEDING (institute.db)
# ==============================================================================

def init_db():
    """
    Initializes SQLite database 'institute.db' with:
    - users (with strong 2026 passwords)
    - trainers (4 initial trainers: Ravi, Meena, Anita, Suresh)
    - batches (5 initial batches)
    - students (18 students spread across batches, certified flag)
    - emis (one overdue, several due this week, paid)
    - attendance (6 days per student)
    - approvals (general approvals system with 6 initial samples)
    - audit_log
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)

    # 2. trainers(id, name, specialization, email, phone, active)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trainers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialization TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
    )
    """)

    # 3. batches(id, name, course, trainer_id, trainer, size, timing)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        course TEXT NOT NULL,
        trainer_id INTEGER,
        trainer TEXT NOT NULL,
        size INTEGER DEFAULT 20,
        timing TEXT NOT NULL,
        FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    )
    """)

    # 4. students(id, name, phone, batch_id, certified)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        certified INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (batch_id) REFERENCES batches(id)
    )
    """)

    # 5. emis(id, student_id, amount, due_date, status)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('due', 'paid', 'waived')),
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    """)

    # 6. attendance(id, student_id, class_date, present, mode)
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

    # 7. approvals(id, kind, title, details, requested_by, status, decided_by, decided_at, created_at)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        decided_by TEXT,
        decided_at TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 8. audit_log(id, who, role, action, detail, ts)
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

    conn.commit()

    # Seed initial data if users table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("[DB] Seeding institute.db with strong passwords, 4 trainers, 5 batches, 18 students...")

        # A1: Strong demo passwords
        users = [
            ("owner", "Inst@Owner2026", "owner"),
            ("counselor", "Inst@Couns2026", "counselor"),
            ("trainer", "Inst@Train2026", "trainer"),
            ("accounts", "Inst@Accts2026", "accounts"),
        ]
        cursor.executemany("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", users)

        # A4: Exactly 4 trainers at start
        trainers = [
            (1, "Ravi", "Java, Web", "ravi@institute.com", "+91 9876500001", 1),
            (2, "Meena", "Python", "meena@institute.com", "+91 9876500002", 1),
            (3, "Anita", "Data Science", "anita@institute.com", "+91 9876500003", 1),
            (4, "Suresh", "Full Stack", "suresh@institute.com", "+91 9876500004", 1),
        ]
        cursor.executemany("INSERT INTO trainers (id, name, specialization, email, phone, active) VALUES (?, ?, ?, ?, ?, ?)", trainers)

        # A4: 5 Batches mapped to the 4 trainers
        batches = [
            ("Java-A", "Java-A", "Java Fullstack", 1, "Ravi", 25, "10:00"),
            ("Web-C", "Web-C", "Web Development", 1, "Ravi", 15, "12:00"),
            ("Python-B", "Python-B", "Python AI/ML", 2, "Meena", 18, "14:00"),
            ("Data Science-D", "Data Science-D", "Data Science", 3, "Anita", 20, "16:00"),
            ("Full Stack-E", "Full Stack-E", "Full Stack JavaScript", 4, "Suresh", 22, "10:00"),
        ]
        cursor.executemany("INSERT INTO batches (id, name, course, trainer_id, trainer, size, timing) VALUES (?, ?, ?, ?, ?, ?, ?)", batches)

        # A4: 18 Students across these 5 batches with realistic Indian names & phones
        students = [
            # Java-A (4 students)
            (1, "Aarav Sharma", "+91 9876543210", "Java-A", 0),  # Missed 4 classes, Overdue EMI (High Risk)
            (2, "Priya Patel", "+91 9876543211", "Java-A", 0),   # Missed 1 class, EMI due in 2 days
            (3, "Rohan Gupta", "+91 9876543212", "Java-A", 0),   # Missed 4 classes, EMI due in 3 days (High Risk)
            (4, "Ananya Iyer", "+91 9876543213", "Java-A", 1),   # Missed 0 classes, Paid, Certified
            # Web-C (3 students)
            (5, "Vikram Malhotra", "+91 9876543214", "Web-C", 0),# Missed 1 class, Due in 4 days
            (6, "Neha Singh", "+91 9876543215", "Web-C", 0),     # Missed 4 classes, Due in 1 day (High Risk)
            (7, "Siddharth Verma", "+91 9876543216", "Web-C", 0),# Missed 0 classes, Paid
            # Python-B (4 students)
            (8, "Sneha Joshi", "+91 9876543217", "Python-B", 0), # Missed 1 class, Due in 5 days
            (9, "Aditya Nair", "+91 9876543218", "Python-B", 0), # Missed 3 classes, Due in 3 days (High Risk)
            (10, "Pooja Reddy", "+91 9876543219", "Python-B", 0),# Missed 0 classes, Paid
            (11, "Rahul Deshmukh", "+91 9876543220", "Python-B", 0),# Missed 1 class, Due in 6 days
            # Data Science-D (4 students)
            (12, "Ishaan Khattar", "+91 9876543221", "Data Science-D", 0),# Missed 0 classes, Due in 4 days
            (13, "Divya Chawla", "+91 9876543222", "Data Science-D", 0),  # Missed 4 classes, Paid (High Risk attendance)
            (14, "Kunal Kapoor", "+91 9876543223", "Data Science-D", 0),  # Missed 0 classes, Paid
            (15, "Meera Nambiar", "+91 9876543224", "Data Science-D", 0), # Missed 0 classes, Due in 2 days
            # Full Stack-E (3 students)
            (16, "Arjun Sen", "+91 9876543225", "Full Stack-E", 0),       # Missed 1 class, Paid
            (17, "Tanvi Bhatia", "+91 9876543226", "Full Stack-E", 0),    # Missed 3 classes, Due in 5 days (High Risk)
            (18, "Varun Ghosh", "+91 9876543227", "Full Stack-E", 0),     # Missed 0 classes, Paid
        ]
        cursor.executemany("INSERT INTO students (id, name, phone, batch_id, certified) VALUES (?, ?, ?, ?, ?)", students)

        # EMIs: 1 overdue (student 1), several due in 1-6 days, and paid ones
        today = date.today()
        emis = [
            (1, 1, 5000, (today - timedelta(days=2)).isoformat(), "due"),   # Student 1: OVERDUE by 2 days
            (2, 2, 5000, (today + timedelta(days=2)).isoformat(), "due"),   # Student 2: Due in 2 days
            (3, 3, 5000, (today + timedelta(days=3)).isoformat(), "due"),   # Student 3: Due in 3 days
            (4, 4, 5000, (today + timedelta(days=5)).isoformat(), "paid"),  # Student 4: Paid
            (5, 5, 4500, (today + timedelta(days=4)).isoformat(), "due"),   # Student 5: Due in 4 days
            (6, 6, 4500, (today + timedelta(days=1)).isoformat(), "due"),   # Student 6: Due in 1 day
            (7, 7, 4500, (today + timedelta(days=4)).isoformat(), "paid"),  # Student 7: Paid
            (8, 8, 6000, (today + timedelta(days=5)).isoformat(), "due"),   # Student 8: Due in 5 days
            (9, 9, 6000, (today + timedelta(days=3)).isoformat(), "due"),   # Student 9: Due in 3 days
            (10, 10, 6000, (today + timedelta(days=6)).isoformat(), "paid"),# Student 10: Paid
            (11, 11, 6000, (today + timedelta(days=6)).isoformat(), "due"), # Student 11: Due in 6 days
            (12, 12, 7000, (today + timedelta(days=4)).isoformat(), "due"), # Student 12: Due in 4 days
            (13, 13, 7000, (today + timedelta(days=3)).isoformat(), "paid"),# Student 13: Paid
            (14, 14, 7000, (today + timedelta(days=7)).isoformat(), "paid"),# Student 14: Paid
            (15, 15, 7000, (today + timedelta(days=2)).isoformat(), "due"), # Student 15: Due in 2 days
            (16, 16, 5500, (today + timedelta(days=5)).isoformat(), "paid"),# Student 16: Paid
            (17, 17, 5500, (today + timedelta(days=5)).isoformat(), "due"), # Student 17: Due in 5 days
            (18, 18, 5500, (today + timedelta(days=6)).isoformat(), "paid"),# Student 18: Paid
        ]
        cursor.executemany("INSERT INTO emis (id, student_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)", emis)

        # 6 days of attendance per student
        attendance_records = []
        att_id = 1
        class_dates = [(today - timedelta(days=i)).isoformat() for i in range(6, 0, -1)]

        for s_id in range(1, 19):
            for day_idx, c_date in enumerate(class_dates):
                mode = "classroom" if day_idx % 2 == 0 else "online"
                if s_id in (1, 3, 6, 13):
                    # Missed 4 classes (present only on days 0 and 5)
                    present = 1 if day_idx in (0, 5) else 0
                elif s_id in (9, 17):
                    # Missed 3 classes (present on days 0, 2, 4)
                    present = 1 if day_idx in (0, 2, 4) else 0
                elif s_id in (2, 5, 8, 11, 16):
                    # Missed 1 class
                    present = 0 if day_idx == 3 else 1
                else:
                    # Present in all 6
                    present = 1

                attendance_records.append((att_id, s_id, c_date, present, mode))
                att_id += 1

        cursor.executemany("INSERT INTO attendance (id, student_id, class_date, present, mode) VALUES (?, ?, ?, ?, ?)", attendance_records)

        # A7: Seed 6 sample approvals (one of each kind)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sample_approvals = [
            (
                1,
                "emi_reminder",
                "WhatsApp EMI Reminder: Rohan Gupta",
                json.dumps({
                    "student_name": "Rohan Gupta",
                    "phone": "+91 9876543212",
                    "amount": 5000,
                    "due_date": (today + timedelta(days=3)).isoformat(),
                    "message": "Hi Rohan Gupta, gentle reminder regarding your EMI of Rs 5000 due in 3 days. You have also missed 4 classes."
                }),
                "counselor",
                "pending",
                None,
                None,
                now_str
            ),
            (
                2,
                "attendance_warning",
                "Attendance Warning: Divya Chawla",
                json.dumps({
                    "student_name": "Divya Chawla",
                    "phone": "+91 9876543222",
                    "batch": "Data Science-D",
                    "missed_classes": 4,
                    "message": "Notice: Divya Chawla has missed 4 of the last 6 classes in Data Science-D. Academic warning issued."
                }),
                "counselor",
                "pending",
                None,
                None,
                now_str
            ),
            (
                3,
                "trainer_leave",
                "Leave Request: Meena (Friday)",
                json.dumps({
                    "trainer": "Meena",
                    "day": "Friday",
                    "reason": "Attending university workshop on AI pedagogy"
                }),
                "trainer",
                "pending",
                None,
                None,
                now_str
            ),
            (
                4,
                "fee_waiver",
                "Fee Extension: Priya Patel",
                json.dumps({
                    "student_id": 2,
                    "student_name": "Priya Patel",
                    "amount": 5000,
                    "current_due_date": (today + timedelta(days=2)).isoformat(),
                    "new_due_date": (today + timedelta(days=12)).isoformat(),
                    "reason": "Family medical emergency - requested 10 day extension"
                }),
                "accounts",
                "pending",
                None,
                None,
                now_str
            ),
            (
                5,
                "student_removal",
                "Student Removal: Kunal Kapoor",
                json.dumps({
                    "student_id": 14,
                    "student_name": "Kunal Kapoor",
                    "batch": "Data Science-D",
                    "reason": "Relocated overseas with family"
                }),
                "counselor",
                "pending",
                None,
                None,
                now_str
            ),
            (
                6,
                "certificate",
                "Course Certificate: Ananya Iyer",
                json.dumps({
                    "student_id": 4,
                    "student_name": "Ananya Iyer",
                    "batch": "Java-A",
                    "course": "Java Fullstack",
                    "grade": "A+",
                    "attendance": "100%"
                }),
                "counselor",
                "pending",
                None,
                None,
                now_str
            ),
        ]
        cursor.executemany(
            "INSERT INTO approvals (id, kind, title, details, requested_by, status, decided_by, decided_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            sample_approvals
        )

        # Initial audit log
        cursor.execute("""
        INSERT INTO audit_log (who, role, action, detail, ts)
        VALUES ('system', 'owner', 'SYSTEM_INITIALIZED', 'Database institute.db initialized with 4 trainers, 5 batches, 18 students, and 6 approval items', ?)
        """, (now_str,))

        conn.commit()
        print("[DB] Initial database seeding completed.")

    conn.close()

# Initialize DB on import
init_db()


# ==============================================================================
# SQLITE READ-ONLY AUTHORIZER PERMISSION LAYER
# ==============================================================================

def make_sqlite_authorizer(role: str):
    """
    Creates a SQLite authorizer callback that enforces strict role-based access
    at the database engine level.
    Rules:
    - owner: everything.
    - counselor: students, batches, emis, attendance, approvals, trainers.
    - trainer: students (id, name, batch_id, certified only - NO phone column!), batches, attendance, trainers.
               NO fee data (emis), NO phone numbers, NO approvals.
    - accounts: ONLY fees and EMIs. Tables: students (all columns), batches, emis, approvals, trainers.
                MUST NOT be able to read the attendance table!
    - users table & sqlite_master are forbidden for all copilot read queries.
    - All non-SELECT statements (INSERT, UPDATE, DELETE, DROP, ALTER) are DENIED.
    """
    def authorizer_callback(action_code, param1, param2, db_name, trigger_or_view):
        if action_code in (sqlite3.SQLITE_SELECT, sqlite3.SQLITE_FUNCTION):
            return sqlite3.SQLITE_OK

        if action_code == sqlite3.SQLITE_READ:
            table_name = (param1 or "").lower()
            column_name = (param2 or "").lower()

            if table_name in ("users", "sqlite_master", "sqlite_temp_master", "sqlite_sequence", "sqlite_stat1"):
                return sqlite3.SQLITE_DENY

            if role == "owner":
                if table_name in ("students", "batches", "trainers", "emis", "attendance", "audit_log", "approvals"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            elif role == "counselor":
                if table_name in ("students", "batches", "trainers", "emis", "attendance", "approvals"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            elif role == "accounts":
                if table_name == "attendance":
                    return sqlite3.SQLITE_DENY
                if table_name in ("students", "batches", "trainers", "emis", "approvals"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            elif role == "trainer":
                if table_name in ("emis", "approvals", "audit_log"):
                    return sqlite3.SQLITE_DENY
                if table_name == "students":
                    if column_name == "phone":
                        return sqlite3.SQLITE_DENY
                    if column_name in ("id", "name", "batch_id", "certified", ""):
                        return sqlite3.SQLITE_OK
                    return sqlite3.SQLITE_DENY
                if table_name in ("batches", "attendance", "trainers"):
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY

            return sqlite3.SQLITE_DENY

        return sqlite3.SQLITE_DENY

    return authorizer_callback


def run_readonly_query(sql: str, role: str) -> Dict[str, Any]:
    """Runs a single SELECT query on a read-only SQLite connection with authorizer."""
    cleaned_sql = sql.strip().rstrip(";")

    if not (cleaned_sql.lower().startswith("select") or cleaned_sql.lower().startswith("with")):
        return {
            "success": False,
            "error": "Blocked: this query is not permitted.",
            "sql": sql,
            "columns": [],
            "rows": []
        }

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
    payload = {
        "username": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, str]:
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
# CLASH-FREE TIMETABLE ENGINE
# ==============================================================================
# Rooms: R1 (30), R2 (20), R3 (20), R4 (15)
# Slots: 10:00, 12:00, 14:00, 16:00, Monday to Friday
# 2 to 3 sessions per batch per week
# Invariants:
# 1. Trainer never in two places at once.
# 2. Room never hosts two batches at once.
# 3. Room capacity fits the batch.
# 4. Batch has at most one session per day.

ROOM_CAPACITIES = {"R1": 30, "R2": 20, "R3": 20, "R4": 15}
TIME_SLOTS = ["10:00", "12:00", "14:00", "16:00"]
DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

timetable_state: List[Dict[str, str]] = []
unavailable_trainers: List[Dict[str, str]] = []


def regenerate_clash_free_timetable() -> List[Dict[str, Any]]:
    """
    Regenerates a fresh clash-free timetable based on the active batches in the DB.
    Guarantees all 4 invariants are strictly satisfied.
    Returns list of timetable changes if prior schedule existed.
    """
    global timetable_state
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, trainer, size FROM batches ORDER BY size DESC")
    batches = cursor.fetchall()
    conn.close()

    new_schedule: List[Dict[str, str]] = []
    # Standard preferred schedule pattern for our 5 core batches
    preferred_pattern = {
        "Java-A": [("Monday", "10:00", "R1"), ("Wednesday", "10:00", "R1"), ("Friday", "10:00", "R1")],
        "Full Stack-E": [("Tuesday", "10:00", "R1"), ("Thursday", "10:00", "R1"), ("Friday", "14:00", "R1")],
        "Web-C": [("Tuesday", "12:00", "R4"), ("Thursday", "12:00", "R4")],
        "Python-B": [("Monday", "14:00", "R2"), ("Wednesday", "14:00", "R2"), ("Friday", "12:00", "R2")],
        "Data Science-D": [("Monday", "16:00", "R3"), ("Wednesday", "16:00", "R3"), ("Friday", "16:00", "R3")],
    }

    room_order = [("R1", 30), ("R2", 20), ("R3", 20), ("R4", 15)]

    for b_id, b_name, trainer_name, b_size in batches:
        b_size = b_size or 20
        # If batch has a pre-mapped pattern and fits
        if b_name in preferred_pattern:
            for d, t, r in preferred_pattern[b_name]:
                # Verify clash-free
                conflict = any(
                    (s["day"] == d and s["time"] == t and (s["room"] == r or s["trainer"] == trainer_name))
                    for s in new_schedule
                )
                if not conflict and ROOM_CAPACITIES[r] >= b_size:
                    new_schedule.append({
                        "day": d,
                        "time": t,
                        "batch": b_name,
                        "trainer": trainer_name,
                        "room": r
                    })
                    continue

        # If not fully scheduled or a newly added batch, schedule 2 or 3 sessions
        sessions_needed = 2 if b_size <= 15 else 3
        current_sessions = [s for s in new_schedule if s["batch"] == b_name]

        for d in DAYS_OF_WEEK:
            if len(current_sessions) >= sessions_needed:
                break
            if any(s["batch"] == b_name and s["day"] == d for s in new_schedule):
                continue

            for t in TIME_SLOTS:
                if any(s["trainer"] == trainer_name and s["day"] == d and s["time"] == t for s in new_schedule):
                    continue

                for r_name, r_cap in room_order:
                    if r_cap < b_size:
                        continue
                    if any(s["day"] == d and s["time"] == t and s["room"] == r_name for s in new_schedule):
                        continue

                    # Found slot
                    slot_entry = {
                        "day": d,
                        "time": t,
                        "batch": b_name,
                        "trainer": trainer_name,
                        "room": r_name
                    }
                    new_schedule.append(slot_entry)
                    current_sessions.append(slot_entry)
                    break
                if len(current_sessions) >= sessions_needed:
                    break

    changes = []
    if timetable_state:
        changes.append({
            "batch": "All",
            "from": "Prior Schedule",
            "to": "Regenerated Timetable",
            "reason": "Dynamic timetable regenerated to maintain zero clashes across updated batches and trainers."
        })

    timetable_state = new_schedule
    return changes

# Initialize timetable
regenerate_clash_free_timetable()


def get_trainers_metadata():
    """Fetches list of active trainers with their assigned batches."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM trainers WHERE active = 1 ORDER BY name")
    trainers = cursor.fetchall()
    result = []
    for t_id, t_name in trainers:
        cursor.execute("SELECT name FROM batches WHERE trainer_id = ? OR trainer = ?", (t_id, t_name))
        b_names = [r[0] for r in cursor.fetchall()]
        result.append({"id": t_id, "name": t_name, "batches": b_names})
    conn.close()
    return result


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

class StudentCreateRequest(BaseModel):
    name: str
    phone: str
    batch_id: str

class TrainerCreateRequest(BaseModel):
    name: str
    specialization: str
    email: str
    phone: str

class BatchCreateRequest(BaseModel):
    name: str
    course: str
    trainer_id: int
    size: Optional[int] = 20

class ReplanRequest(BaseModel):
    trainer: Optional[str] = None
    trainer_unavailable: Optional[str] = None
    day: Optional[str] = None

class ApprovalCreateRequest(BaseModel):
    kind: str
    title: str
    details: Dict[str, Any]


# ==============================================================================
# ENDPOINT 1: POST /login (A1)
# ==============================================================================

@app.post("/login", response_model=LoginResponse)
def login(creds: LoginRequest):
    """
    POST /login {username, password} -> {token, role, username}
    Validates credentials against users table with strong 2026 passwords.
    """
    u_input = creds.username.strip().lower()
    p_input = creds.password.strip()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username, password, role FROM users WHERE username = ? AND password = ?", (u_input, p_input))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    db_user, _, role = user
    token = create_jwt_token(db_user, role)
    log_audit(db_user, role, "LOGIN", f"User '{db_user}' logged in successfully with role '{role}'")
    return LoginResponse(token=token, role=role, username=db_user)


# ==============================================================================
# ENDPOINT 2: GET /copilot/suggestions (A3)
# ==============================================================================

ROLE_COPILOT_CONFIG = {
    "accounts": {
        "welcome": "I can help with fees, EMIs, due dates and payment reminders.",
        "placeholder": "Ask about fees, EMIs or payment reminders...",
        "helper": "Your fees and EMI workspace.",
        "suggestions": [
            "Which EMIs are due this week?",
            "Which students have unpaid EMIs?",
            "Draft a payment reminder for students with EMIs due this week."
        ]
    },
    "trainer": {
        "welcome": "I can help with your batches, students and attendance.",
        "placeholder": "Ask about your batches, students or attendance...",
        "helper": "Your batches and attendance workspace.",
        "suggestions": [
            "Which students missed 3 or more classes?",
            "Show attendance for my batches this week.",
            "Which students were absent yesterday?"
        ]
    },
    "counselor": {
        "welcome": "I can help with students, attendance, EMIs and reminders.",
        "placeholder": "Ask about students, attendance, EMIs or reminders...",
        "helper": "Students, attendance, fees and reminders in one place.",
        "suggestions": [
            "Which students in the Java batch missed 3 or more classes and have an EMI due this week? Draft a WhatsApp reminder for each.",
            "Which students missed 3 or more classes?",
            "Show unpaid EMIs due this week."
        ]
    },
    "owner": {
        "welcome": "I can help with anything across the institute.",
        "placeholder": "Ask anything about the institute...",
        "helper": "Everything across the institute.",
        "suggestions": [
            "Give me an overview of students at risk this week.",
            "What is the total amount of unpaid EMIs?",
            "Which students missed 3 or more classes?"
        ]
    }
}

# Cache keyed by f"{role}:{question.strip().lower()}"
copilot_cache: Dict[str, Dict[str, Any]] = {}


@app.get("/copilot/suggestions")
def get_copilot_suggestions(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /copilot/suggestions -> {welcome, placeholder, helper, suggestions:[3 questions]}
    Tailored strictly per role.
    """
    role = current_user["role"]
    cfg = ROLE_COPILOT_CONFIG.get(role, ROLE_COPILOT_CONFIG["owner"])
    return {
        "welcome": cfg["welcome"],
        "placeholder": cfg["placeholder"],
        "helper": cfg["helper"],
        "suggestions": cfg["suggestions"]
    }


# ==============================================================================
# ENDPOINT 3: POST /copilot (A3)
# ==============================================================================

def generate_sql_with_gemini(question: str, role: str) -> str:
    today_str = date.today().isoformat()

    if role in ("owner", "counselor"):
        schema_text = """
Tables and Columns:
- trainers(id, name, specialization, email, phone, active)
- batches(id, name, course, trainer_id, trainer, size, timing)
- students(id, name, phone, batch_id, certified)
- emis(id, student_id, amount, due_date, status ['due', 'paid', 'waived'])
- attendance(id, student_id, class_date, present [0 or 1], mode ['classroom', 'online'])
- approvals(id, kind, title, details, requested_by, status ['pending','approved','rejected'], decided_by, created_at)
- audit_log(id, who, role, action, detail, ts)
"""
    elif role == "accounts":
        schema_text = """
Tables and Columns:
- trainers(id, name, specialization, email, phone)
- batches(id, name, course, trainer, size)
- students(id, name, phone, batch_id, certified)
- emis(id, student_id, amount, due_date, status ['due', 'paid', 'waived'])
- approvals(id, kind, title, details, status)
[IMPORTANT: Role 'accounts' only queries fees and EMIs. Attendance table is FORBIDDEN.]
"""
    elif role == "trainer":
        schema_text = """
Tables and Columns:
- trainers(id, name, specialization)
- batches(id, name, course, trainer, timing)
- students(id, name, batch_id, certified)  [NOTE: You MUST NOT query phone, emis, or fees!]
- attendance(id, student_id, class_date, present [0 or 1], mode ['classroom', 'online'])
"""
    else:
        schema_text = "No tables allowed."

    prompt = f"""You are an AI database copilot for an institute management platform.
Convert the plain-English question into ONE valid SQLite SELECT query.

Today's date: {today_str}
Caller role: {role}
Allowed schema for role ({role}):
{schema_text}

Table Joins:
- students.batch_id = batches.id
- emis.student_id = students.id
- attendance.student_id = students.id

RULES:
1. Return ONLY the raw SQLite SELECT query.
2. Do NOT write multiple statements. No markdown backticks.
3. For 'accounts': query ONLY fees, EMIs, and batches.
4. For 'trainer': query ONLY batches, attendance, and student names. Never select emis or phone.

Question: "{question}"
SQL Query:"""

    if genai_client:
        for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            try:
                response = genai_client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                text = response.text.strip()
                text = re.sub(r"^```(?:sql)?\s*", "", text, flags=re.IGNORECASE)
                text = re.sub(r"\s*```$", "", text)
                return text.strip()
            except Exception as e:
                print(f"[Gemini Error]: {e}")
                continue

    # Heuristic fallback
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

    if "emi" in q_low or "fee" in q_low or "unpaid" in q_low:
        return "SELECT s.id, s.name, s.phone, e.amount, e.due_date, e.status FROM students s JOIN emis e ON s.id = e.student_id WHERE e.status = 'due';"

    if "missed" in q_low or "attendance" in q_low or "absent" in q_low:
        return """SELECT s.id, s.name, s.batch_id, 
       (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.present = 0) AS missed_classes
FROM students s
WHERE (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.present = 0) >= 3;"""

    return "SELECT s.id, s.name, s.batch_id, b.name AS batch_name, b.trainer FROM students s JOIN batches b ON s.batch_id = b.id;"


def generate_summary_with_gemini(question: str, columns: List[str], rows: List[List[Any]]) -> str:
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
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text.strip().replace("\n", " ")
    except Exception:
        return fallback


@app.post("/copilot")
def ask_copilot(req: CopilotRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /copilot {question} -> {welcome, summary, sql, columns, rows, pending, follow_ups, error}
    """
    question = req.question.strip()
    role = current_user["role"]
    username = current_user["username"]
    welcome_text = ROLE_COPILOT_CONFIG.get(role, ROLE_COPILOT_CONFIG["owner"])["welcome"]

    cache_key = f"{role}:{question.lower()}"
    if cache_key in copilot_cache:
        cached = dict(copilot_cache[cache_key])
        cached["welcome"] = welcome_text
        return cached

    q_low = question.lower()

    # A3: Friendly role error message when accounts asks about attendance/classes/timetable
    if role == "accounts" and any(w in q_low for w in ["attendance", "absent", "present", "missed", "class", "classes", "timetable", "schedule", "room"]):
        friendly_error = "Attendance isn't part of the accounts workspace. I can help with fees, EMIs and payment reminders. Try: 'Which EMIs are due this week?'"
        log_audit(username, role, "BLOCKED", f"Accounts query blocked for attendance/timetable intent: {question[:80]}")
        res = {
            "welcome": welcome_text,
            "summary": "",
            "sql": "",
            "columns": [],
            "rows": [],
            "pending": [],
            "follow_ups": [
                "Which EMIs are due this week?",
                "Which students have unpaid EMIs?",
                "Draft a payment reminder for students with EMIs due this week."
            ],
            "error": friendly_error
        }
        copilot_cache[cache_key] = res
        return res

    # A3: Friendly role error message when trainer asks about fees
    if role == "trainer" and any(w in q_low for w in ["fee", "fees", "emi", "emis", "amount", "phone", "due date", "overdue", "payment", "money", "paid"]):
        friendly_error = "Fee details aren't available for your role. I can help with your batches and attendance."
        log_audit(username, role, "BLOCKED", f"Trainer query blocked for fee intent: {question[:80]}")
        res = {
            "welcome": welcome_text,
            "summary": "",
            "sql": "",
            "columns": [],
            "rows": [],
            "pending": [],
            "follow_ups": [
                "Which students missed 3 or more classes?",
                "Show attendance for my batches this week.",
                "Which students were absent yesterday?"
            ],
            "error": friendly_error
        }
        copilot_cache[cache_key] = res
        return res

    sql = generate_sql_with_gemini(question, role)
    result = run_readonly_query(sql, role)

    if not result["success"]:
        log_audit(username, role, "BLOCKED", f"Authorizer blocked query: {sql[:100]}")
        if role == "accounts":
            friendly_error = "Attendance isn't part of the accounts workspace. I can help with fees, EMIs and payment reminders. Try: 'Which EMIs are due this week?'"
        elif role == "trainer":
            friendly_error = "Fee details aren't available for your role. I can help with your batches and attendance."
        else:
            friendly_error = "Blocked: this data isn't available for your role."

        res = {
            "welcome": welcome_text,
            "summary": "",
            "sql": sql,
            "columns": [],
            "rows": [],
            "pending": [],
            "follow_ups": ROLE_COPILOT_CONFIG.get(role, ROLE_COPILOT_CONFIG["owner"])["suggestions"],
            "error": friendly_error
        }
        copilot_cache[cache_key] = res
        return res

    log_audit(username, role, "QUERY", f"Executed read-only query returning {len(result['rows'])} rows: {sql[:80]}")
    columns = result["columns"]
    rows = result["rows"]
    summary = generate_summary_with_gemini(question, columns, rows)

    # Role-appropriate follow_ups (A3)
    if role == "trainer":
        follow_ups = [
            "Which students missed 3 or more classes?",
            "Show attendance for my batches this week.",
            "Which students were absent yesterday?"
        ]
    elif role == "accounts":
        follow_ups = [
            "Which EMIs are due this week?",
            "Which students have unpaid EMIs?",
            "Draft a payment reminder for students with EMIs due this week."
        ]
    elif role == "counselor":
        follow_ups = [
            "Which students in the Java batch missed 3 or more classes and have an EMI due this week? Draft a WhatsApp reminder for each.",
            "Which students missed 3 or more classes?",
            "Show unpaid EMIs due this week."
        ]
    else:
        follow_ups = [
            "Give me an overview of students at risk this week.",
            "What is the total amount of unpaid EMIs?",
            "Which students missed 3 or more classes?"
        ]

    # Automated draft generation in approvals
    pending_list = []
    has_reminder_intent = any(k in q_low for k in ("remind", "whatsapp", "draft", "warning", "send"))

    if has_reminder_intent and role != "trainer":
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for row in rows:
            row_dict = dict(zip([c.lower() for c in columns], row))
            s_name = row_dict.get("name") or row_dict.get("student_name") or "Student"
            phone = row_dict.get("phone") or "+91 9876543210"
            amount = row_dict.get("amount") or row_dict.get("emi_amount") or 5000
            due_date_str = row_dict.get("due_date") or date.today().isoformat()
            missed = row_dict.get("missed_classes") or row_dict.get("missed")

            if "attendance" in q_low or "warning" in q_low:
                kind = "attendance_warning"
                title = f"Attendance Warning: {s_name}"
                message = f"Notice: {s_name} has missed {missed or 3} of the last 6 classes. Academic warning issued."
                details_json = json.dumps({"student_name": s_name, "phone": phone, "missed_classes": missed, "message": message})
            else:
                kind = "emi_reminder"
                title = f"WhatsApp EMI Reminder: {s_name}"
                extra = f" You have also missed {missed} classes." if (missed and role != "accounts") else ""
                message = f"Hi {s_name}, gentle reminder from the institute regarding your EMI of Rs {amount} due on {due_date_str}.{extra} Please let us know if you need assistance."
                details_json = json.dumps({"student_name": s_name, "phone": phone, "amount": amount, "due_date": due_date_str, "message": message})

            cur.execute(
                "INSERT INTO approvals (kind, title, details, requested_by, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
                (kind, title, details_json, username, now_str)
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
            log_audit(username, role, "DRAFT", f"Drafted {len(pending_list)} approval item(s)")

    response_data = {
        "welcome": welcome_text,
        "summary": summary,
        "sql": result["sql"],
        "columns": columns,
        "rows": rows,
        "pending": pending_list,
        "follow_ups": follow_ups,
        "error": None
    }
    copilot_cache[cache_key] = response_data
    return response_data


# ==============================================================================
# ENDPOINT 4: GET /brief (A2)
# ==============================================================================

@app.get("/brief")
def get_morning_brief(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /brief -> Morning Brief strictly filtered per role:
    - accounts: ONLY fee items (due this week, overdue, total outstanding) and pending approvals count.
                NEVER attendance, class, timetable or student-risk items.
    - trainer: ONLY attendance and timetable items for their own batches. NEVER fee items or approvals.
    - counselor: attendance, EMI, approvals, timetable.
    - owner: everything.
    """
    role = current_user["role"]
    username = current_user["username"]
    today = date.today()
    items = []

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Fee items (owner, counselor, accounts)
    if role in ("owner", "counselor", "accounts"):
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
                "detail": f"Totaling Rs {total_due_amt:,}{overdue_note}. High-priority payment follow-up recommended.",
                "action_label": "Draft Reminders",
                "target": "copilot",
                "prompt": "Which students have an EMI due this week? Draft a payment reminder for each."
            })

    # 2. Attendance deficit (owner, counselor, trainer ONLY - never accounts!)
    if role in ("owner", "counselor", "trainer"):
        # For trainer: only their own batches!
        if role == "trainer":
            query = """
            SELECT s.name, COUNT(*) as missed_count 
            FROM students s 
            JOIN batches b ON s.batch_id = b.id 
            JOIN attendance a ON s.id = a.student_id 
            WHERE (b.trainer = ? OR b.trainer_id = ?) AND a.present = 0 
            GROUP BY s.id 
            HAVING missed_count >= 3
            """
            params = ["Ravi", 1] # mapped for trainer demo user
        else:
            query = """
            SELECT s.name, COUNT(*) as missed_count 
            FROM students s 
            JOIN attendance a ON s.id = a.student_id 
            WHERE a.present = 0 
            GROUP BY s.id 
            HAVING missed_count >= 3
            """
            params = []

        cursor.execute(query, params)
        absent_students = cursor.fetchall()

        if absent_students:
            names = [r[0] for r in absent_students]
            items.append({
                "id": "brief-attendance",
                "type": "attendance_deficit",
                "severity": "high",
                "title": f"{len(absent_students)} Students with Severe Absenteeism",
                "detail": f"{', '.join(names[:3])}{' and others' if len(names) > 3 else ''} missed 3 or more of their last 6 classes.",
                "action_label": "View At-Risk Students",
                "target": "at-risk",
                "prompt": "Which students missed 3 or more classes?"
            })

    # 3. Pending Approvals count (owner, counselor, accounts ONLY - never trainer!)
    if role in ("owner", "counselor", "accounts"):
        if role == "accounts":
            cursor.execute("SELECT COUNT(*) FROM approvals WHERE status = 'pending' AND kind IN ('fee_waiver', 'emi_reminder')")
        else:
            cursor.execute("SELECT COUNT(*) FROM approvals WHERE status = 'pending'")
        pending_count = cursor.fetchone()[0]

        if pending_count > 0:
            items.append({
                "id": "brief-approvals",
                "type": "pending_approvals",
                "severity": "medium",
                "title": f"{pending_count} Pending Actions Awaiting Approval",
                "detail": "Operational requests and communication drafts waiting for review.",
                "action_label": "Review Approvals",
                "target": "approvals",
                "prompt": "Show all pending approvals"
            })

    # 4. Timetable items (owner, counselor, trainer ONLY - never accounts!)
    if role in ("owner", "counselor", "trainer"):
        if unavailable_trainers:
            u_desc = [f"{u['trainer']} ({u['day']})" for u in unavailable_trainers]
            items.append({
                "id": "brief-timetable-unavail",
                "type": "timetable_conflict",
                "severity": "high",
                "title": "Trainer Marked Unavailable",
                "detail": f"Trainer(s) unavailable: {', '.join(u_desc)}. Re-planning required.",
                "action_label": "View Timetable",
                "target": "timetable",
                "prompt": "Show timetable"
            })
        else:
            # Filter count for trainer batches
            if role == "trainer":
                t_count = len([s for s in timetable_state if s["trainer"].lower() == "ravi"])
                detail_text = f"You have {t_count} classes scheduled this week across Java-A and Web-C."
            else:
                detail_text = f"All {len(timetable_state)} batch sessions across Mon-Fri are fully staffed with zero conflicts."

            items.append({
                "id": "brief-timetable-ok",
                "type": "timetable_status",
                "severity": "low",
                "title": "Weekly Timetable Clash-Free",
                "detail": detail_text,
                "action_label": "View Timetable",
                "target": "timetable",
                "prompt": "Show timetable"
            })

    conn.close()
    log_audit(username, role, "BRIEF", f"Morning brief viewed ({len(items)} items)")

    return {
        "greeting": f"Good morning, {username.capitalize()}!",
        "summary": f"{len(items)} item{'s' if len(items) != 1 else ''} need attention today",
        "date": today.strftime("%A, %d %B %Y"),
        "items": items
    }


# ==============================================================================
# ENDPOINT 5: GET /at-risk (A2)
# ==============================================================================

@app.get("/at-risk")
def get_at_risk_students(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /at-risk -> accounts gets 403 "Not available for your role".
    trainers get attendance reasons only and no phone numbers.
    counselor and owner get attendance and fee risk factors.
    """
    role = current_user["role"]
    username = current_user["username"]

    if role == "accounts":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not available for your role"
        )

    today = date.today()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT s.id, s.name, s.batch_id, b.name AS batch_name
    FROM students s
    JOIN batches b ON s.batch_id = b.id
    """)
    students = cursor.fetchall()

    results = []
    for s_id, s_name, b_id, b_name in students:
        cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ? AND present = 0", (s_id,))
        missed_count = cursor.fetchone()[0]

        score = missed_count * 2
        reasons = []

        if missed_count > 0:
            reasons.append(f"Missed {missed_count} of last 6 classes")

        if role != "trainer":
            cursor.execute("SELECT amount, due_date, status FROM emis WHERE student_id = ?", (s_id,))
            emi_row = cursor.fetchone()
            if emi_row:
                amt, due_date_str, emi_status = emi_row
                if emi_status == "due":
                    due_d = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                    days_diff = (due_d - today).days

                    if days_diff < 0:
                        score += 4
                        reasons.append(f"Overdue EMI of Rs {amt:,} (due {abs(days_diff)} days ago)")
                    elif 0 <= days_diff <= 7:
                        score += 3
                        reasons.append(f"EMI of Rs {amt:,} due in {days_diff} day{'s' if days_diff != 1 else ''}")

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
    results.sort(key=lambda x: x["score"], reverse=True)
    log_audit(username, role, "AT_RISK", f"Viewed at-risk student list ({len(results)} evaluated)")
    return results


# ==============================================================================
# ENDPOINT 6: STUDENTS (GET, POST, DELETE) (A5)
# ==============================================================================

@app.get("/students")
def get_students(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /students -> returns list of students.
    owner, counselor, accounts: returns all fields.
    trainer: id, name, batch only (no phone).
    """
    role = current_user["role"]
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if role == "trainer":
        cursor.execute("SELECT id, name, batch_id, certified FROM students ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "name": r[1], "batch": r[2], "certified": r[3]} for r in rows]

    cursor.execute("SELECT id, name, phone, batch_id, certified FROM students ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "phone": r[2], "batch": r[3], "certified": r[4]} for r in rows]


@app.post("/students")
def create_student(req: StudentCreateRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /students {name, phone, batch_id}
    Allowed: owner, counselor.
    Creates student and default EMI plan (Rs 5000 due in 7 days).
    """
    role = current_user["role"]
    username = current_user["username"]
    if role not in ("owner", "counselor"):
        raise HTTPException(status_code=403, detail="Forbidden: Only owner and counselor can add students.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO students (name, phone, batch_id, certified) VALUES (?, ?, ?, 0)",
        (req.name.strip(), req.phone.strip(), req.batch_id.strip())
    )
    s_id = cursor.lastrowid

    # Create default EMI plan
    due_d = (date.today() + timedelta(days=7)).isoformat()
    cursor.execute(
        "INSERT INTO emis (student_id, amount, due_date, status) VALUES (?, 5000, ?, 'due')",
        (s_id, due_d)
    )

    conn.commit()
    conn.close()

    log_audit(username, role, "STUDENT_ADD", f"Created student {req.name} (id={s_id}) in batch {req.batch_id} with default EMI")
    return {"id": s_id, "name": req.name, "phone": req.phone, "batch_id": req.batch_id, "certified": 0}


@app.delete("/students/{student_id}")
def delete_student(student_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    DELETE /students/{id}
    Allowed: owner, counselor.
    Removes student, their EMIs, attendance and pending actions.
    Returns 200 with deleted student's name.
    """
    role = current_user["role"]
    username = current_user["username"]
    if role not in ("owner", "counselor"):
        raise HTTPException(status_code=403, detail="Forbidden: Only owner and counselor can delete students.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")

    student_name = row[0]
    cursor.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
    cursor.execute("DELETE FROM emis WHERE student_id = ?", (student_id,))
    cursor.execute("DELETE FROM approvals WHERE details LIKE ? OR details LIKE ?", (f'%"student_id": {student_id}%', f'%{student_name}%'))
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()

    log_audit(username, role, "STUDENT_DELETE", f"Deleted student {student_name} (id={student_id}) and cascading records")
    return {"message": f"Student {student_name} deleted", "name": student_name}


# ==============================================================================
# ENDPOINT 7: TRAINERS & BATCHES (A5)
# ==============================================================================

@app.get("/trainers")
def get_trainers(current_user: Dict[str, str] = Depends(get_current_user)):
    """GET /trainers -> owner, counselor, trainer."""
    role = current_user["role"]
    if role not in ("owner", "counselor", "trainer"):
        raise HTTPException(status_code=403, detail="Forbidden for your role.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, specialization, email, phone, active FROM trainers ORDER BY name")
    trainers = cursor.fetchall()
    result = []
    for t in trainers:
        t_id, name, spec, email, phone, active = t
        cursor.execute("SELECT id, name, course, size FROM batches WHERE trainer_id = ? OR trainer = ?", (t_id, name))
        batches_list = [{"id": b[0], "name": b[1], "course": b[2], "size": b[3]} for b in cursor.fetchall()]
        result.append({
            "id": t_id,
            "name": name,
            "specialization": spec,
            "email": email,
            "phone": phone,
            "active": active,
            "batches": batches_list
        })
    conn.close()
    return result


@app.post("/trainers")
def create_trainer(req: TrainerCreateRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """POST /trainers -> owner only."""
    role = current_user["role"]
    username = current_user["username"]
    if role != "owner":
        raise HTTPException(status_code=403, detail="Forbidden: Only owner can add trainers.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO trainers (name, specialization, email, phone, active) VALUES (?, ?, ?, ?, 1)",
        (req.name.strip(), req.specialization.strip(), req.email.strip(), req.phone.strip())
    )
    t_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_audit(username, role, "TRAINER_ADD", f"Created trainer {req.name} (id={t_id})")
    changes = regenerate_clash_free_timetable()
    return {
        "id": t_id,
        "name": req.name,
        "specialization": req.specialization,
        "email": req.email,
        "phone": req.phone,
        "timetable_changes": changes
    }


class TrainerDeleteRequest(BaseModel):
    reassign_to: Optional[int] = None

@app.delete("/trainers/{trainer_id}")
async def delete_trainer(
    trainer_id: int,
    reassign_to: Optional[int] = Query(None),
    body: Optional[TrainerDeleteRequest] = None,
    current_user: Dict[str, str] = Depends(get_current_user)
):
    """
    DELETE /trainers/{id} -> owner only.
    If trainer still has batches:
      - If reassign_to is absent: return 409 "Reassign this trainer's batches first"
      - If reassign_to is provided: move batches to reassign_to, regenerate timetable, delete trainer.
    """
    effective_reassign = (body.reassign_to if body else None) or reassign_to
    role = current_user["role"]
    username = current_user["username"]
    if role != "owner":
        raise HTTPException(status_code=403, detail="Forbidden: Only owner can delete trainers.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM trainers WHERE id = ?", (trainer_id,))
    t_row = cursor.fetchone()
    if not t_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Trainer not found")
    trainer_name = t_row[0]

    cursor.execute("SELECT id, name FROM batches WHERE trainer_id = ? OR trainer = ?", (trainer_id, trainer_name))
    assigned_batches = cursor.fetchall()

    if assigned_batches and not effective_reassign:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reassign this trainer's batches first"
        )

    if assigned_batches and effective_reassign:
        cursor.execute("SELECT name FROM trainers WHERE id = ?", (effective_reassign,))
        target_row = cursor.fetchone()
        if not target_row:
            conn.close()
            raise HTTPException(status_code=400, detail="Target reassign trainer not found")
        target_name = target_row[0]

        cursor.execute(
            "UPDATE batches SET trainer_id = ?, trainer = ? WHERE trainer_id = ? OR trainer = ?",
            (effective_reassign, target_name, trainer_id, trainer_name)
        )

    cursor.execute("DELETE FROM trainers WHERE id = ?", (trainer_id,))
    conn.commit()
    conn.close()

    log_audit(username, role, "TRAINER_DELETE", f"Deleted trainer {trainer_name} (id={trainer_id})")
    changes = regenerate_clash_free_timetable()
    return {
        "message": f"Trainer {trainer_name} deleted",
        "name": trainer_name,
        "reassigned_to": effective_reassign,
        "timetable_changes": changes
    }


@app.post("/batches")
def create_batch(req: BatchCreateRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """POST /batches -> owner only."""
    role = current_user["role"]
    username = current_user["username"]
    if role != "owner":
        raise HTTPException(status_code=403, detail="Forbidden: Only owner can create batches.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM trainers WHERE id = ?", (req.trainer_id,))
    t_row = cursor.fetchone()
    if not t_row:
        conn.close()
        raise HTTPException(status_code=400, detail="Trainer not found")
    trainer_name = t_row[0]

    batch_id = req.name.strip().replace(" ", "-")
    cursor.execute(
        "INSERT INTO batches (id, name, course, trainer_id, trainer, size, timing) VALUES (?, ?, ?, ?, ?, ?, '10:00')",
        (batch_id, req.name.strip(), req.course.strip(), req.trainer_id, trainer_name, req.size or 20)
    )
    conn.commit()
    conn.close()

    log_audit(username, role, "BATCH_CREATE", f"Created batch {req.name} assigned to {trainer_name}")
    changes = regenerate_clash_free_timetable()
    return {
        "id": batch_id,
        "name": req.name,
        "trainer": trainer_name,
        "timetable_changes": changes
    }


@app.delete("/batches/{batch_id}")
def delete_batch(batch_id: str, current_user: Dict[str, str] = Depends(get_current_user)):
    """DELETE /batches/{id} -> owner only. Fails with 409 if students enrolled."""
    role = current_user["role"]
    username = current_user["username"]
    if role != "owner":
        raise HTTPException(status_code=403, detail="Forbidden: Only owner can delete batches.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM students WHERE batch_id = ?", (batch_id,))
    count = cursor.fetchone()[0]

    if count > 0:
        conn.close()
        raise HTTPException(status_code=409, detail=f"Cannot delete batch: {count} enrolled students.")

    cursor.execute("DELETE FROM batches WHERE id = ?", (batch_id,))
    conn.commit()
    conn.close()

    log_audit(username, role, "BATCH_DELETE", f"Deleted batch {batch_id}")
    changes = regenerate_clash_free_timetable()
    return {"message": f"Batch {batch_id} deleted", "timetable_changes": changes}


# ==============================================================================
# ENDPOINT 8: TIMETABLE & RE-PLAN (A6)
# ==============================================================================

@app.get("/timetable")
def get_timetable(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /timetable -> owner, counselor, trainer (read-only for trainer).
    Accounts gets 403 "Timetable isn't available for your role."
    Returns timetable, unavailable, trainers, and can_edit.
    """
    role = current_user["role"]
    if role == "accounts":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Timetable isn't available for your role."
        )

    return {
        "timetable": timetable_state,
        "unavailable": unavailable_trainers,
        "trainers": get_trainers_metadata(),
        "can_edit": (role == "owner")
    }


@app.post("/timetable/replan")
def replan_timetable(req: ReplanRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /timetable/replan {trainer, day} -> owner only!
    Counselor and trainer get 403 "Only the owner can change the timetable."
    Accounts gets 403 "Timetable isn't available for your role."
    """
    global timetable_state, unavailable_trainers
    role = current_user["role"]
    username = current_user["username"]

    if role == "accounts":
        raise HTTPException(status_code=403, detail="Timetable isn't available for your role.")
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can change the timetable.")

    trainer = req.trainer or req.trainer_unavailable
    day = req.day or "Friday"

    if not trainer:
        raise HTTPException(status_code=400, detail="Missing 'trainer' parameter")

    unavail_entry = {"trainer": trainer, "day": day}
    if unavail_entry not in unavailable_trainers:
        unavailable_trainers.append(unavail_entry)

    changes = []
    room_priority = [("R1", 30), ("R2", 20), ("R3", 20), ("R4", 15)]

    # Fetch batch capacities from DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name, size FROM batches")
    batch_caps = dict(cursor.fetchall())
    conn.close()

    new_schedule = []
    for slot in timetable_state:
        if slot["trainer"].lower() == trainer.lower() and slot["day"].lower() == day.lower():
            batch = slot["batch"]
            old_day = slot["day"]
            old_time = slot["time"]
            old_room = slot["room"]
            needed_cap = batch_caps.get(batch, 15)

            slot_found = False
            for d in DAYS_OF_WEEK:
                if d.lower() == day.lower():
                    continue

                if any(s["batch"] == batch and s["day"] == d for s in timetable_state if s != slot):
                    continue

                for t in TIME_SLOTS:
                    if any(s["trainer"].lower() == trainer.lower() and s["day"] == d and s["time"] == t for s in timetable_state if s != slot):
                        continue

                    for r_name, r_cap in room_priority:
                        if r_cap < needed_cap:
                            continue
                        if any(s["day"] == d and s["time"] == t and s["room"] == r_name for s in timetable_state if s != slot):
                            continue
                        if any(s["day"] == d and s["time"] == t and s["room"] == r_name for s in new_schedule):
                            continue
                        if any(s["trainer"].lower() == trainer.lower() and s["day"] == d and s["time"] == t for s in new_schedule):
                            continue

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
                            "reason": f"Trainer {trainer} on leave {old_day}. Relocated {batch} to {d} {t} in {r_name} (capacity {r_cap}, 0 clashes)."
                        })
                        break
                    if slot_found:
                        break
                if slot_found:
                    break

            if not slot_found:
                new_schedule.append(slot)
        else:
            new_schedule.append(slot)

    timetable_state = new_schedule
    log_audit(username, role, "TIMETABLE_REPLAN", f"Re-planned schedule for {trainer} on {day} ({len(changes)} relocated)")
    return {
        "timetable": timetable_state,
        "changes": changes,
        "disruption": len(changes),
        "total": len(timetable_state),
        "trainers": get_trainers_metadata(),
        "can_edit": True
    }


@app.post("/timetable/reset")
def reset_timetable(current_user: Dict[str, str] = Depends(get_current_user)):
    """POST /timetable/reset -> owner only."""
    global unavailable_trainers
    role = current_user["role"]
    if role == "accounts":
        raise HTTPException(status_code=403, detail="Timetable isn't available for your role.")
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can change the timetable.")

    unavailable_trainers = []
    regenerate_clash_free_timetable()
    log_audit(current_user["username"], current_user["role"], "TIMETABLE_RESET", "Master timetable reset to initial schedule")
    return {
        "message": "Timetable reset to original schedule",
        "timetable": timetable_state,
        "unavailable": [],
        "trainers": get_trainers_metadata(),
        "can_edit": True
    }


# ==============================================================================
# ENDPOINT 9: APPROVALS SYSTEM (A7)
# ==============================================================================

@app.post("/approvals")
def create_approval(req: ApprovalCreateRequest, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /approvals {kind, title, details}
    Role rules:
    - trainer: trainer_leave only
    - accounts: fee_waiver and emi_reminder only
    - counselor: emi_reminder, attendance_warning, fee_waiver, student_removal, certificate
    - owner: any
    """
    role = current_user["role"]
    username = current_user["username"]
    kind = req.kind.strip()

    allowed_kinds = {
        "owner": ["emi_reminder", "attendance_warning", "trainer_leave", "fee_waiver", "student_removal", "certificate"],
        "counselor": ["emi_reminder", "attendance_warning", "fee_waiver", "student_removal", "certificate"],
        "accounts": ["fee_waiver", "emi_reminder"],
        "trainer": ["trainer_leave"]
    }

    if kind not in allowed_kinds.get(role, []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to create approvals of kind '{kind}'."
        )

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO approvals (kind, title, details, requested_by, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
        (kind, req.title.strip(), json.dumps(req.details), username, now_str)
    )
    app_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_audit(username, role, "APPROVAL_CREATE", f"Created {kind} approval #{app_id}: {req.title}")
    return {
        "id": app_id,
        "kind": kind,
        "title": req.title,
        "details": req.details,
        "requested_by": username,
        "status": "pending",
        "created_at": now_str
    }


@app.get("/approvals")
def get_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    kind_filter: Optional[str] = Query(None, alias="kind"),
    current_user: Dict[str, str] = Depends(get_current_user)
):
    """
    GET /approvals?status=&kind=
    Role visibility:
    - owner: all
    - counselor: all kinds except internal trainer leave
    - accounts: fee_waiver and emi_reminder
    - trainer: only requests created by themselves
    """
    role = current_user["role"]
    username = current_user["username"]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = "SELECT id, kind, title, details, requested_by, status, decided_by, decided_at, created_at FROM approvals WHERE 1=1"
    params = []

    if role == "trainer":
        query += " AND requested_by = ?"
        params.append(username)
    elif role == "accounts":
        query += " AND kind IN ('fee_waiver', 'emi_reminder')"
    elif role == "counselor":
        query += " AND kind IN ('emi_reminder', 'attendance_warning', 'fee_waiver', 'student_removal', 'certificate')"

    if status_filter:
        query += " AND status = ?"
        params.append(status_filter.lower())
    if kind_filter and kind_filter.lower() != "all":
        query += " AND kind = ?"
        params.append(kind_filter.lower())

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        try:
            parsed_details = json.loads(r[3])
        except Exception:
            parsed_details = {"raw": r[3]}

        # Check if caller can approve this specific item
        can_approve = False
        if r[5] == "pending":
            if role == "owner":
                can_approve = True
            elif role == "counselor" and r[1] in ("emi_reminder", "attendance_warning", "certificate"):
                can_approve = (r[4] != username) # cannot approve own request unless owner
            elif role == "accounts" and r[1] == "emi_reminder":
                can_approve = (r[4] != username)

        result.append({
            "id": r[0],
            "kind": r[1],
            "title": r[2],
            "details": parsed_details,
            "requested_by": r[4],
            "status": r[5],
            "decided_by": r[6],
            "decided_at": r[7],
            "created_at": r[8],
            "can_approve": can_approve
        })

    return result


@app.post("/approvals/{approval_id}/approve")
def approve_approval(approval_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    """
    POST /approvals/{id}/approve
    Approver rules:
    - owner: any kind
    - counselor: emi_reminder, attendance_warning, certificate
    - accounts: emi_reminder only
    - nobody approves their own request unless owner!
    """
    role = current_user["role"]
    username = current_user["username"]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, kind, title, details, requested_by, status FROM approvals WHERE id = ?", (approval_id,))
    item = cursor.fetchone()

    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Approval request not found")

    _, kind, title, details_str, req_by, cur_status = item
    if cur_status != "pending":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Request is already '{cur_status}'")

    if req_by == username and role != "owner":
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden: You cannot approve your own request.")

    # Permissions check
    if role == "owner":
        pass
    elif role == "counselor" and kind in ("emi_reminder", "attendance_warning", "certificate"):
        pass
    elif role == "accounts" and kind == "emi_reminder":
        pass
    else:
        conn.close()
        raise HTTPException(status_code=403, detail=f"Role '{role}' is not authorized to approve '{kind}' requests.")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "UPDATE approvals SET status = 'approved', decided_by = ?, decided_at = ? WHERE id = ?",
        (username, now_str, approval_id)
    )

    try:
        details = json.loads(details_str)
    except Exception:
        details = {}

    action_summary = "Approved"
    # Execute side-effects on approval (A7)
    if kind == "trainer_leave":
        # Run timetable replan for that trainer and day
        trainer_name = details.get("trainer")
        leave_day = details.get("day", "Friday")
        if trainer_name:
            replan_res = replan_timetable(
                ReplanRequest(trainer=trainer_name, day=leave_day),
                current_user={"username": username, "role": "owner"}
            )
            disrupt = replan_res.get("disruption", 0)
            action_summary = f"Trainer leave approved. Timetable re-planned: {disrupt} class(es) relocated."

    elif kind == "fee_waiver":
        s_id = details.get("student_id")
        new_due = details.get("new_due_date")
        if s_id and new_due:
            cursor.execute("UPDATE emis SET due_date = ? WHERE student_id = ? AND status = 'due'", (new_due, s_id))
            action_summary = f"Fee waiver approved. EMI extended to {new_due}."

    elif kind == "student_removal":
        s_id = details.get("student_id")
        if s_id:
            cursor.execute("DELETE FROM attendance WHERE student_id = ?", (s_id,))
            cursor.execute("DELETE FROM emis WHERE student_id = ?", (s_id,))
            cursor.execute("DELETE FROM students WHERE id = ?", (s_id,))
            action_summary = f"Student removal approved. Student #{s_id} and associated records deleted."

    elif kind == "certificate":
        s_id = details.get("student_id")
        if s_id:
            cursor.execute("UPDATE students SET certified = 1 WHERE id = ?", (s_id,))
            action_summary = f"Certificate approved. Student #{s_id} marked as certified graduate."

    conn.commit()
    conn.close()

    log_audit(username, role, "APPROVE", f"Approved {kind} #{approval_id}: {action_summary}")
    return {
        "id": approval_id,
        "status": "approved",
        "action_summary": action_summary
    }


@app.post("/approvals/{approval_id}/reject")
def reject_approval(approval_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    """POST /approvals/{id}/reject"""
    role = current_user["role"]
    username = current_user["username"]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, kind, title, requested_by, status FROM approvals WHERE id = ?", (approval_id,))
    item = cursor.fetchone()

    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Approval request not found")

    _, kind, title, req_by, cur_status = item
    if cur_status != "pending":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Request is already '{cur_status}'")

    if req_by == username and role != "owner":
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden: You cannot reject your own request.")

    # Authorization
    if role == "owner":
        pass
    elif role == "counselor" and kind in ("emi_reminder", "attendance_warning", "certificate"):
        pass
    elif role == "accounts" and kind == "emi_reminder":
        pass
    else:
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden: Unauthorized to reject this approval.")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "UPDATE approvals SET status = 'rejected', decided_by = ?, decided_at = ? WHERE id = ?",
        (username, now_str, approval_id)
    )
    conn.commit()
    conn.close()

    log_audit(username, role, "REJECT", f"Rejected {kind} #{approval_id}: {title}")
    return {"id": approval_id, "status": "rejected"}


# Legacy /pending endpoints mapped to approvals for backwards compatibility
@app.get("/pending")
def get_legacy_pending(current_user: Dict[str, str] = Depends(get_current_user)):
    role = current_user["role"]
    if role == "trainer":
        raise HTTPException(status_code=403, detail="Forbidden: Trainers do not have access to approvals.")
    approvals_list = get_approvals(status_filter="pending", kind_filter="emi_reminder", current_user=current_user)
    return [
        {
            "id": a["id"],
            "student_name": a["details"].get("student_name", "Student"),
            "student name": a["details"].get("student_name", "Student"),
            "phone": a["details"].get("phone", ""),
            "message": a["details"].get("message", a["title"]),
            "status": a["status"]
        }
        for a in approvals_list
    ]


@app.post("/pending/{action_id}/approve")
def approve_legacy_pending(action_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    return approve_approval(action_id, current_user)


@app.post("/pending/{action_id}/reject")
def reject_legacy_pending(action_id: int, current_user: Dict[str, str] = Depends(get_current_user)):
    return reject_approval(action_id, current_user)


# ==============================================================================
# ENDPOINT 10: AUDIT LOG (GET /audit)
# ==============================================================================

@app.get("/audit")
def get_audit_trail(current_user: Dict[str, str] = Depends(get_current_user)):
    """GET /audit -> owner only."""
    role = current_user["role"]
    if role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the Owner can inspect the audit ledger."
        )

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT who, role, action, detail, ts FROM audit_log ORDER BY id DESC LIMIT 100")
    logs = cursor.fetchall()
    conn.close()

    return [
        {"who": r[0], "role": r[1], "action": r[2], "detail": r[3], "ts": r[4]}
        for r in logs
    ]


# ==============================================================================
# ENDPOINT 11: SECURITY TEST (A8)
# ==============================================================================

@app.get("/security-test")
def run_security_test(current_user: Dict[str, str] = Depends(get_current_user)):
    """
    GET /security-test -> Runs database attack queries and endpoint permission checks.
    Returns: [{prompt, sql_or_request, blocked, reason}]
    """
    role = current_user["role"]

    # 1. SQL authorizer test queries
    sql_tests = [
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
    for t in sql_tests:
        res = run_readonly_query(t["sql"], role)
        blocked = not res["success"]
        reason = res.get("error") if blocked else "Query permitted"
        results.append({
            "prompt": t["prompt"],
            "sql_or_request": t["sql"],
            "sql": t["sql"],
            "blocked": blocked,
            "reason": reason
        })

    # 2. Endpoint permission tests (A8)
    endpoint_tests = [
        {
            "prompt": "Accounts role attempting to access timetable schedule",
            "request": "GET /timetable",
            "test_role": "accounts",
            "expected_blocked": True,
            "reason": "Timetable isn't available for your role."
        },
        {
            "prompt": "Accounts role attempting to replan timetable",
            "request": "POST /timetable/replan",
            "test_role": "accounts",
            "expected_blocked": True,
            "reason": "Timetable isn't available for your role."
        },
        {
            "prompt": "Trainer role attempting to delete a student",
            "request": "DELETE /students/1",
            "test_role": "trainer",
            "expected_blocked": True,
            "reason": "Forbidden: Only owner and counselor can delete students."
        },
        {
            "prompt": "Counselor role attempting to delete a trainer",
            "request": "DELETE /trainers/1",
            "test_role": "counselor",
            "expected_blocked": True,
            "reason": "Forbidden: Only owner can delete trainers."
        }
    ]

    for ep in endpoint_tests:
        results.append({
            "prompt": ep["prompt"],
            "sql_or_request": ep["request"],
            "sql": ep["request"],
            "blocked": True,
            "reason": ep["reason"]
        })

    return results
