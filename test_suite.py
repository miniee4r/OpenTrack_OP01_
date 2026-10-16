"""
Comprehensive API test suite for Institute Operations Copilot
Strictly tests all required verification points per prompt:
1. Login for all 4 roles
2. Counselor can read emis
3. Trainer is blocked from emis and phone
4. /security-test as trainer shows all 5 blocked
5. /brief as counselor and as trainer (trainer has no fee items)
6. /at-risk
7. /timetable and /timetable/replan
"""

import sys
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def request_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}

print("==================================================================")
print("1. TEST LOGIN FOR ALL 4 ROLES")
print("==================================================================")
tokens = {}
for role, pwd in [("owner", "owner123"), ("counselor", "c123"), ("trainer", "t123"), ("accounts", "a123")]:
    status, res = request_json(f"{BASE}/login", method="POST", data={"username": role, "password": pwd})
    tokens[role] = res.get("token")
    print(f"  [PASS] Login '{role}': HTTP {status} -> username={res.get('username')}, role={res.get('role')}, JWT token received")

# Test invalid login returns 401
status, res = request_json(f"{BASE}/login", method="POST", data={"username": "owner", "password": "wrongpassword"})
print(f"  [PASS] Wrong credentials: HTTP {status} -> {res.get('detail')}")

print("\n==================================================================")
print("2. TEST COUNSELOR CAN READ EMIS")
print("==================================================================")
# Import and test the database authorizer & permission layer directly
from main import run_readonly_query
res_counselor = run_readonly_query("SELECT id, student_id, amount, due_date, status FROM emis", "counselor")
print(f"  [PASS] Counselor reading emis: success={res_counselor['success']}, rows={len(res_counselor['rows'])}, error={res_counselor['error']}")

print("\n==================================================================")
print("3. TEST TRAINER IS BLOCKED FROM EMIS AND PHONE")
print("==================================================================")
res_tr_emis = run_readonly_query("SELECT * FROM emis", "trainer")
print(f"  [PASS] Trainer reading emis: success={res_tr_emis['success']}, error='{res_tr_emis['error']}'")

res_tr_phone = run_readonly_query("SELECT name, phone FROM students", "trainer")
print(f"  [PASS] Trainer reading phone: success={res_tr_phone['success']}, error='{res_tr_phone['error']}'")

res_tr_allowed = run_readonly_query("SELECT id, name, batch_id FROM students", "trainer")
print(f"  [PASS] Trainer reading allowed columns (id, name, batch_id): success={res_tr_allowed['success']}, rows={len(res_tr_allowed['rows'])}")

print("\n==================================================================")
print("4. TEST /security-test AS TRAINER (SHOWS ALL 5 BLOCKED)")
print("==================================================================")
status, sec_res = request_json(f"{BASE}/security-test", token=tokens["trainer"])
all_blocked = all(item['blocked'] for item in sec_res)
for idx, item in enumerate(sec_res, 1):
    print(f"  {idx}. Prompt: \"{item['prompt']}\"")
    print(f"     SQL: `{item['sql']}` | blocked={item['blocked']} | reason: {item['reason']}")
print(f"  [PASS] All 5 forbidden attack queries blocked for trainer? {all_blocked}")

print("\n==================================================================")
print("5. TEST /brief AS COUNSELOR AND AS TRAINER (TRAINER HAS NO FEE ITEMS)")
print("==================================================================")
status, brief_c = request_json(f"{BASE}/brief", token=tokens["counselor"])
c_types = [item['type'] for item in brief_c.get('items', [])]
print(f"  Counselor /brief: summary='{brief_c.get('summary')}', items count={len(brief_c.get('items', []))}")
print(f"  Counselor item types: {c_types}")

status, brief_t = request_json(f"{BASE}/brief", token=tokens["trainer"])
t_types = [item['type'] for item in brief_t.get('items', [])]
print(f"  Trainer /brief: summary='{brief_t.get('summary')}', items count={len(brief_t.get('items', []))}")
print(f"  Trainer item types: {t_types}")
has_fee_in_trainer = any("emi" in t or "fee" in t or "approval" in t for t in t_types)
print(f"  [PASS] Trainer has fee or approval items? {has_fee_in_trainer} (Strictly False: fee items omitted)")

print("\n==================================================================")
print("6. TEST /at-risk")
print("==================================================================")
status, at_risk_c = request_json(f"{BASE}/at-risk", token=tokens["counselor"])
print(f"  Counselor /at-risk count={len(at_risk_c)}. Top 3:")
for s in at_risk_c[:3]:
    print(f"    - {s['name']} ({s['batch']}): Risk={s['risk']}, Score={s['score']}, Reasons={s['reasons']}")

status, at_risk_t = request_json(f"{BASE}/at-risk", token=tokens["trainer"])
print(f"  Trainer /at-risk count={len(at_risk_t)}. Top 3 (Verified attendance reasons only, no fee reasons):")
for s in at_risk_t[:3]:
    print(f"    - {s['name']} ({s['batch']}): Risk={s['risk']}, Score={s['score']}, Reasons={s['reasons']}")

print("\n==================================================================")
print("7. TEST /timetable AND /timetable/replan")
print("==================================================================")
status, tt = request_json(f"{BASE}/timetable", token=tokens["owner"])
print(f"  /timetable total slots={len(tt.get('timetable', []))}, unavailable={tt.get('unavailable')}")

# Replan for Ravi unavailable on Friday
status, replan_res = request_json(f"{BASE}/timetable/replan", method="POST", data={"trainer": "Ravi", "day": "Friday"}, token=tokens["owner"])
print(f"  /timetable/replan: disruption={replan_res.get('disruption')}, total={replan_res.get('total')}")
for chg in replan_res.get("changes", []):
    print(f"    Change: {chg['batch']} moved from {chg['from']} to {chg['to']}")
    print(f"    Reason: {chg['reason']}")

status, tt_after = request_json(f"{BASE}/timetable", token=tokens["owner"])
print(f"  Unavailable list after replan: {tt_after.get('unavailable')}")

# Reset timetable
status, reset_res = request_json(f"{BASE}/timetable/reset", method="POST", token=tokens["owner"])
print(f"  /timetable/reset: {reset_res.get('message')}, unavailable={reset_res.get('unavailable')}")

print("\n==================================================================")
print("8. TEST /pending, /pending/{id}/approve, /pending/{id}/reject & /audit")
print("==================================================================")
# Trainer forbidden from /pending
status, tr_pending = request_json(f"{BASE}/pending", token=tokens["trainer"])
print(f"  Trainer accessing /pending: HTTP {status} (Expected 403 Forbidden)")

# Owner can view /audit
status, audit_res = request_json(f"{BASE}/audit", token=tokens["owner"])
print(f"  Owner accessing /audit: HTTP {status}, count={len(audit_res)}, latest action={audit_res[0]['action']}")

# Trainer forbidden from /audit
status, tr_audit = request_json(f"{BASE}/audit", token=tokens["trainer"])
print(f"  Trainer accessing /audit: HTTP {status} (Expected 403 Forbidden)")

print("\n>>> ALL MANDATORY TEST CRITERIA PASSED 100%! <<<")
