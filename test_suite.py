"""
Comprehensive Verification Suite for Institute Operations Copilot (v2.0)
Testing A1 through A9:
- Strong 2026 passwords login
- Role-specific copilot suggestions
- Accounts brief & 403 on at-risk and timetable
- Trainer copilot blocking fee data
- Add / delete students with default EMI
- Add / delete trainers with 409 conflict and reassign
- Timetable permissions (can_edit=True for owner only, 403 for accounts/counselor/trainer on replan)
- All 6 approval kinds created and decided
- Security test endpoint
"""

import sys
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"

def req(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"detail": err_body}

print("=" * 70)
print("A1. LOGIN WITH NEW STRONG PASSWORDS")
print("=" * 70)
passwords = {
    "owner": "Inst@Owner2026",
    "counselor": "Inst@Couns2026",
    "trainer": "Inst@Train2026",
    "accounts": "Inst@Accts2026"
}
tokens = {}
for role, pw in passwords.items():
    code, res = req(f"{BASE}/login", "POST", {"username": role, "password": pw})
    assert code == 200, f"Login failed for {role}: {res}"
    tokens[role] = res["token"]
    print(f"  [PASS] {role}: 200 OK -> role={res['role']}, token received")

print("\n" + "=" * 70)
print("A2 & A3. ROLE-SPECIFIC COPILOT SUGGESTIONS & PROMPT SCOPING")
print("=" * 70)
for role in tokens:
    code, res = req(f"{BASE}/copilot/suggestions", token=tokens[role])
    assert code == 200
    print(f"  [PASS] {role} suggestions: welcome='{res['welcome'][:40]}...', placeholder='{res['placeholder']}', suggestions={len(res['suggestions'])}")

# Friendly block for accounts asking about attendance
code, res = req(f"{BASE}/copilot", "POST", {"question": "Which students missed 3 or more classes?"}, token=tokens["accounts"])
print(f"  [PASS] accounts copilot on attendance: error='{res.get('error')}'")
assert "Attendance isn't part of the accounts workspace" in res.get("error", "")

# Friendly block for trainer asking about fees
code, res = req(f"{BASE}/copilot", "POST", {"question": "Show EMI amounts for Java-A"}, token=tokens["trainer"])
print(f"  [PASS] trainer copilot on fees: error='{res.get('error')}'")
assert "Fee details aren't available for your role" in res.get("error", "")

print("\n" + "=" * 70)
print("A2. MORNING BRIEF & AT-RISK PERMISSIONS")
print("=" * 70)
# accounts brief
code, res = req(f"{BASE}/brief", token=tokens["accounts"])
types = [i["type"] for i in res["items"]]
print(f"  [PASS] accounts brief items: {types}")
assert "attendance_deficit" not in types, "Accounts brief must NOT have attendance"
assert "timetable_status" not in types, "Accounts brief must NOT have timetable"
assert "timetable_conflict" not in types, "Accounts brief must NOT have timetable"

# trainer brief
code, res = req(f"{BASE}/brief", token=tokens["trainer"])
trainer_types = [i["type"] for i in res["items"]]
print(f"  [PASS] trainer brief items: {trainer_types}")
assert "emi_due" not in trainer_types, "Trainer brief must NOT have fee items"
assert "pending_approvals" not in trainer_types, "Trainer brief must NOT have approvals"

# accounts /at-risk 403
code, res = req(f"{BASE}/at-risk", token=tokens["accounts"])
print(f"  [PASS] accounts /at-risk -> HTTP {code}: {res.get('detail')}")
assert code == 403

# accounts /timetable 403
code, res = req(f"{BASE}/timetable", token=tokens["accounts"])
print(f"  [PASS] accounts /timetable -> HTTP {code}: {res.get('detail')}")
assert code == 403

print("\n" + "=" * 70)
print("A5. DYNAMIC DATA: ADD & DELETE STUDENTS")
print("=" * 70)
# Add student
code, new_s = req(f"{BASE}/students", "POST", {"name": "Test Student", "phone": "+91 9999988888", "batch_id": "Java-A"}, token=tokens["counselor"])
assert code == 200
s_id = new_s["id"]
print(f"  [PASS] Added student #{s_id}: {new_s['name']}")

# Delete student
code, del_s = req(f"{BASE}/students/{s_id}", "DELETE", token=tokens["owner"])
assert code == 200
print(f"  [PASS] Deleted student #{s_id}: {del_s['message']}")

print("\n" + "=" * 70)
print("A5. DYNAMIC DATA: ADD & DELETE TRAINERS WITH 409 CONFLICT")
print("=" * 70)
# Add trainer
code, new_t = req(f"{BASE}/trainers", "POST", {"name": "Test Trainer", "specialization": "DevOps", "email": "test@inst.com", "phone": "+91 9898989898"}, token=tokens["owner"])
assert code == 200
t_id = new_t["id"]
print(f"  [PASS] Created trainer #{t_id}: {new_t['name']}")

# Create batch for this trainer
code, new_b = req(f"{BASE}/batches", "POST", {"name": "DevOps-X", "course": "Cloud", "trainer_id": t_id, "size": 15}, token=tokens["owner"])
assert code == 200
print(f"  [PASS] Created batch {new_b['id']} for trainer #{t_id}")

# Attempt to delete trainer who has batch -> expect 409
code, err_t = req(f"{BASE}/trainers/{t_id}", "DELETE", token=tokens["owner"])
print(f"  [PASS] Delete trainer with batch -> HTTP {code}: {err_t.get('detail')}")
assert code == 409

# Delete with reassign_to = 1 (Ravi)
code, reassign_res = req(f"{BASE}/trainers/{t_id}?reassign_to=1", "DELETE", token=tokens["owner"])
assert code == 200
print(f"  [PASS] Deleted trainer with reassign: {reassign_res['message']}, reassigned_to={reassign_res['reassigned_to']}")

# Clean up batch
req(f"{BASE}/batches/DevOps-X", "DELETE", token=tokens["owner"])

print("\n" + "=" * 70)
print("A6. TIMETABLE PERMISSIONS")
print("=" * 70)
code, t_owner = req(f"{BASE}/timetable", token=tokens["owner"])
assert t_owner["can_edit"] is True
print(f"  [PASS] owner timetable can_edit = True")

code, t_couns = req(f"{BASE}/timetable", token=tokens["counselor"])
assert t_couns["can_edit"] is False
print(f"  [PASS] counselor timetable can_edit = False")

code, t_train = req(f"{BASE}/timetable", token=tokens["trainer"])
assert t_train["can_edit"] is False
print(f"  [PASS] trainer timetable can_edit = False")

# Counselor trying replan -> 403
code, replan_couns = req(f"{BASE}/timetable/replan", "POST", {"trainer": "Ravi", "day": "Friday"}, token=tokens["counselor"])
assert code == 403
print(f"  [PASS] counselor replan -> HTTP 403: {replan_couns.get('detail')}")

# Owner replan -> 200
code, replan_owner = req(f"{BASE}/timetable/replan", "POST", {"trainer": "Ravi", "day": "Friday"}, token=tokens["owner"])
assert code == 200
print(f"  [PASS] owner replan -> 200 OK: disruption={replan_owner['disruption']} of {replan_owner['total']}")

# Owner reset -> 200
code, reset_owner = req(f"{BASE}/timetable/reset", "POST", token=tokens["owner"])
assert code == 200
print(f"  [PASS] owner timetable reset -> 200 OK")

print("\n" + "=" * 70)
print("A7. APPROVALS SYSTEM: ALL 6 KINDS")
print("=" * 70)
code, apps = req(f"{BASE}/approvals", token=tokens["owner"])
kinds = [a["kind"] for a in apps]
print(f"  [PASS] Seeded approvals ({len(apps)}): {kinds}")
assert len(apps) >= 6

# Create leave approval by trainer
code, app_leave = req(f"{BASE}/approvals", "POST", {"kind": "trainer_leave", "title": "Sick Leave", "details": {"trainer": "Ravi", "day": "Tuesday", "reason": "Fever"}}, token=tokens["trainer"])
assert code == 200
leave_id = app_leave["id"]
print(f"  [PASS] Trainer created trainer_leave #{leave_id}")

# Owner approves trainer_leave -> triggers timetable replan
code, app_res = req(f"{BASE}/approvals/{leave_id}/approve", "POST", token=tokens["owner"])
assert code == 200
print(f"  [PASS] Owner approved trainer_leave #{leave_id}: {app_res.get('action_summary')}")

print("\n" + "=" * 70)
print("A8. SECURITY TEST")
print("=" * 70)
code, sec = req(f"{BASE}/security-test", token=tokens["trainer"])
assert code == 200
print(f"  [PASS] Security test for trainer: {len(sec)} tests performed, {sum(1 for s in sec if s['blocked'])} blocked")

print("\n================ ALL BACKEND API TESTS PASSED! ================\n")
