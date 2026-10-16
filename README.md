# Novix: Institute Administration Platform with AI Operations Copilot
> **Sponsored by TechSummitTrainers**

[![TechSummitTrainers](https://img.shields.io/badge/Sponsored%20by-TechSummitTrainers-6366f1.svg?style=for-the-badge)](https://github.com/miniee4r/Novix)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Training institutes run on spreadsheets, WhatsApp groups and memory: batches, trainer schedules, hybrid attendance, fee instalments, and recordings live in different places, and the signals that matter (a student falling behind, a missed EMI, a double-booked trainer) surface too late.

**Novix** is an enterprise institute operations platform with an **AI Operations Copilot** at its centre that unifies academic delivery, physical-to-virtual hybrid classrooms, automated fee statement reconciliation, and clash-free timetable scheduling.

---

## 🌟 Key Capabilities

### 1. 🤖 AI Operations Copilot (Human-in-the-Loop)
- **Natural Language Interaction**: Staff ask plain English operational questions, e.g.:
  > *"Which students in the Java batch have missed three or more classes and have an EMI due this week? Draft a WhatsApp reminder for each."*
- **Safe Read-Only Query Translation**: Translates requests into safe, deterministic read-only queries (SQL / schema format) and displays the query, latency, and rows inspected so the answer can be verified.
- **Human-in-the-Loop Action Approval**: Any action that modifies data or dispatches communications (e.g., WhatsApp reminders, schedule shifts) generates an interactive preview card that a staff member must explicitly review, edit, or approve before execution.
- **Immutable Audit Logging**: Every query, approved action, rejected action, and operator role is permanently logged with timestamps.

### 2. 🛡️ Role-Based Access Control (RBAC) & Security Shield
- Four distinct personas with dynamic permission matrices:
  - 👑 **Owner / Director**: Full administrative, operational, and financial control.
  - 🤝 **Academic Counselor**: Admissions, attendance monitoring, and student dropout interventions.
  - 🎓 **Lead Trainer**: Cohort syllabus, hybrid attendance marking, and recording uploads.
    - **STRICT SECURITY INVARIANT**: *A trainer must NEVER see fee details (amounts, EMIs, payments, dues), however the question is phrased.*
    - If a trainer asks *"What are the fee dues for the Java batch?"*, the Copilot triggers an immediate **Security Policy Intercept** (HTTP 403).
  - 💳 **Accounts Executive**: Fee registers, EMI instalments, and UPI statement reconciliations.

### 3. 🗓️ Clash-Free Timetable Generator & Autonomous Re-Planner
- Synthesizes clash-free weekly schedules from:
  - Trainer availability calendars and daily slot limits.
  - Room physical seating capacity (Classroom 101, Lab 204, Seminar Hall).
  - Batch timings and syllabi hours.
  - Virtual stream seat limits (Zoom / Google Meet license limits).
- **Sub-Second Re-Planner**: Re-plans in $<1$ second when a trainer becomes unavailable or a batch is added, outputting an explainable step-by-step diff of every adjustment.

### 4. 💳 Bank & UPI Statement Reconciler
- Ingests raw UPI / Bank statement entries (UTR number, payer name, timestamp, amount).
- Executes fuzzy matching against student EMI records based on phone numbers, UTR patterns, and instalment figures.
- One-click ledger reconciliation automatically clears student dues and updates receivables.

### 5. 🚨 Student Dropout Early Warning System
- Heuristic predictive risk engine evaluating:
  - Hybrid attendance deficits ($<75\%$).
  - Missed or upcoming EMIs ($>7$ days overdue).
  - Virtual recording watch durations and drop-offs.
  - Delayed assignment submissions.
- Surfaces visual risk badges (🔴 Critical, 🟡 Moderate, 🟢 On Track) with prescriptive counselor intervention workflows.

### 6. 🎓 Verifiable Completion Certificates
- Cryptographically signed digital credentials with gold seal, student name, cohort mastery, and embedded QR verification code for instant employer verification.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 19, Vanilla CSS Design System (Custom tokens, glassmorphism, responsive grid, zero Tailwind dependency).
- **Icons**: Lucide React.
- **Build System**: Vite 8.
- **State Management**: React Context (`RoleContext`) with dynamic RBAC evaluation and audit trail dispatchers.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested with Node v24)
- npm 9+

### Installation & Run Locally

```bash
# Clone the repository
git clone https://github.com/miniee4r/Novix.git
cd Novix

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

---

## 🧪 Testing the Problem Statement Features

1. **Test Copilot Query Translation & WhatsApp Broadcast Approval**:
   - Open the Copilot via **⌘K** or the header button.
   - Click the prompt chip: *"Java Missed Classes + EMI Due"* (or type the query).
   - Inspect the verified read-only SQL query box.
   - In the approval card, click **Approve & Dispatch Now**.
2. **Test Strict Trainer RBAC Security**:
   - In the top header, switch the role dropdown to **🎓 Lead Trainer (No Fee Access)**.
   - Observe that the **Fees & UPI Reconciler** tab in the sidebar is locked.
   - In the Copilot, click **Test Trainer RBAC Shield**.
   - Verify that the Copilot immediately halts execution with an explainable **Security Policy Intercept**.
3. **Test Autonomous Timetable Re-planning**:
   - Switch back to **Owner / Director** and navigate to **Clash-Free Timetable**.
   - Click **Simulate Trainer Absence & Re-Plan**.
   - Observe the 18ms re-planning algorithm reassigning the slot to a qualified substitute with zero clashes.
4. **Test UPI Reconciliation**:
   - Navigate to **Fees & UPI Reconciler**.
   - Click **1-Click Reconcile** on transaction `TXN-8801` (Aarav Mehta).
   - Check the student ledger balance update.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE). Sponsored by **TechSummitTrainers**.
