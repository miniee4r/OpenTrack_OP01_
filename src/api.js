/**
 * API Helper for Institute Operations Copilot
 * Backend URL: http://localhost:8000
 * In-memory token management (no localStorage).
 * Automatic Bearer header injection and 401 Unauthorized handling.
 */

export const BACKEND_URL = "http://localhost:8000";

let authToken = "";
let unauthorizedHandler = null;

export const setAuthToken = (token) => {
  authToken = token || "";
};

export const getAuthToken = () => {
  return authToken;
};

export const registerUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

/**
 * Common fetch wrapper for all authenticated endpoints.
 */
async function request(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Add Bearer token for all requests except /login
  if (endpoint !== "/login" && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized: trigger redirect to login
    if (res.status === 401) {
      if (endpoint !== "/login" && unauthorizedHandler) {
        unauthorizedHandler();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Unauthorized (401). Please log in again.");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg = errData.detail || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = errData;
      throw error;
    }

    return await res.json();
  } catch (err) {
    if (err.message && err.message.includes("Failed to fetch")) {
      throw new Error(`Cannot connect to backend at ${BACKEND_URL}. Please ensure the backend server is running.`);
    }
    throw err;
  }
}

// 1. POST /login {username, password} -> {token, role, username}
export async function loginUser(username, password) {
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

// 2. GET /brief -> morning brief
export async function fetchBrief() {
  return await request("/brief");
}

// 3. GET /copilot/suggestions -> {welcome, placeholder, helper, suggestions:[...]}
export async function fetchCopilotSuggestions() {
  return await request("/copilot/suggestions");
}

// 4. POST /copilot {question} -> {welcome, summary, sql, columns, rows, pending, follow_ups, error}
export async function askCopilot(question) {
  return await request("/copilot", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

// 5. GET /at-risk -> list of students with risk score and reasons
export async function fetchAtRiskStudents() {
  return await request("/at-risk");
}

// 6. STUDENTS: GET /students, POST /students, DELETE /students/{id}
export async function fetchStudents() {
  return await request("/students");
}

export async function createStudent({ name, phone, batch_id }) {
  return await request("/students", {
    method: "POST",
    body: JSON.stringify({ name, phone, batch_id }),
  });
}

export async function deleteStudent(studentId) {
  return await request(`/students/${encodeURIComponent(studentId)}`, {
    method: "DELETE",
  });
}

// 7. TRAINERS & BATCHES: GET /trainers, POST /trainers, DELETE /trainers/{id}, POST /batches, DELETE /batches/{id}
export async function fetchTrainers() {
  return await request("/trainers");
}

export async function createTrainer({ name, specialization, email, phone }) {
  return await request("/trainers", {
    method: "POST",
    body: JSON.stringify({ name, specialization, email, phone }),
  });
}

export async function deleteTrainer(trainerId, reassignTo = null) {
  const query = reassignTo ? `?reassign_to=${encodeURIComponent(reassignTo)}` : "";
  return await request(`/trainers/${encodeURIComponent(trainerId)}${query}`, {
    method: "DELETE",
  });
}

export async function createBatch({ name, course, trainer_id, size }) {
  return await request("/batches", {
    method: "POST",
    body: JSON.stringify({ name, course, trainer_id: Number(trainer_id), size: Number(size || 20) }),
  });
}

export async function deleteBatch(batchId) {
  return await request(`/batches/${encodeURIComponent(batchId)}`, {
    method: "DELETE",
  });
}

// 8. APPROVALS: GET /approvals, POST /approvals, POST /approvals/{id}/approve, POST /approvals/{id}/reject
export async function fetchApprovals(status = "", kind = "") {
  const params = new URLSearchParams();
  if (status && status !== "all") params.append("status", status);
  if (kind && kind !== "all") params.append("kind", kind);
  const qs = params.toString();
  return await request(`/approvals${qs ? `?${qs}` : ""}`);
}

export async function createApproval({ kind, title, details }) {
  return await request("/approvals", {
    method: "POST",
    body: JSON.stringify({ kind, title, details }),
  });
}

export async function approveApproval(approvalId) {
  return await request(`/approvals/${encodeURIComponent(approvalId)}/approve`, {
    method: "POST",
  });
}

export async function rejectApproval(approvalId) {
  return await request(`/approvals/${encodeURIComponent(approvalId)}/reject`, {
    method: "POST",
  });
}

// Legacy /pending fallbacks
export async function fetchPendingActions() {
  try {
    return await request("/approvals?status=pending");
  } catch {
    return await request("/pending");
  }
}

export async function approvePendingAction(id) {
  try {
    return await approveApproval(id);
  } catch {
    return await request(`/pending/${encodeURIComponent(id)}/approve`, { method: "POST" });
  }
}

export async function rejectPendingAction(id) {
  try {
    return await rejectApproval(id);
  } catch {
    return await request(`/pending/${encodeURIComponent(id)}/reject`, { method: "POST" });
  }
}

// 9. TIMETABLE: GET /timetable, POST /timetable/replan, POST /timetable/reset
export async function fetchTimetable() {
  return await request("/timetable");
}

export async function replanTimetable(trainer, day) {
  return await request("/timetable/replan", {
    method: "POST",
    body: JSON.stringify({ trainer, day }),
  });
}

export async function resetTimetable() {
  return await request("/timetable/reset", {
    method: "POST",
  });
}

// 10. AUDIT LOG (GET /audit)
export async function fetchAuditLogs() {
  return await request("/audit");
}

// 11. SECURITY TEST (GET /security-test)
export async function runSecurityTest() {
  return await request("/security-test");
}
