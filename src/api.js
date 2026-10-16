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
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
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

// 3. POST /copilot {question} -> {summary, sql, columns, rows, pending, follow_ups, error}
export async function askCopilot(question) {
  return await request("/copilot", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

// 4. GET /at-risk -> list of students with risk score and reasons
export async function fetchAtRiskStudents() {
  return await request("/at-risk");
}

// 5. GET /pending -> list of pending actions
export async function fetchPendingActions() {
  return await request("/pending");
}

// 6. POST /pending/{id}/approve & POST /pending/{id}/reject
export async function approvePendingAction(id) {
  return await request(`/pending/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
}

export async function rejectPendingAction(id) {
  return await request(`/pending/${encodeURIComponent(id)}/reject`, {
    method: "POST",
  });
}

// 7. GET /timetable -> {timetable, unavailable}
export async function fetchTimetable() {
  return await request("/timetable");
}

// POST /timetable/replan {trainer, day}
export async function replanTimetable(trainer, day) {
  return await request("/timetable/replan", {
    method: "POST",
    body: JSON.stringify({ trainer, day }),
  });
}

// POST /timetable/reset
export async function resetTimetable() {
  return await request("/timetable/reset", {
    method: "POST",
  });
}

// 8. GET /audit -> audit logs (owner only)
export async function fetchAuditLogs() {
  return await request("/audit");
}

// 9. GET /security-test -> runs 5 hardcoded attack queries
export async function runSecurityTest() {
  return await request("/security-test");
}
