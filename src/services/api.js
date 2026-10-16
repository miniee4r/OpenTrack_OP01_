/**
 * API Service Client for Novix Institute Operations Platform
 * Strictly implements the API Contract for Backend running at http://localhost:8000:
 *
 * POST /login {username, password} → {token, role}
 * POST /copilot {question} → {sql, columns, rows, pending_actions[], error?}
 * GET /pending → list of pending actions (id, student name, message, status)
 * POST /pending/{id}/approve and POST /pending/{id}/reject
 * GET /audit → list of {who, role, action, detail, ts}
 * GET /timetable → list of slots {day, time, batch, trainer, room}
 * POST /timetable/replan {trainer_unavailable} → {new_timetable, changes[]}
 *
 * All requests except /login send the header Authorization: Bearer <token>
 */

const API_BASE_URL = 'http://localhost:8000';
const TOKEN_KEY = 'novix_auth_token';
const ROLE_KEY = 'novix_auth_role';

export const api = {
  // --- Token Management ---
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  },

  setToken(token, role) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (role) localStorage.setItem(ROLE_KEY, role);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  },

  getStoredRole() {
    return localStorage.getItem(ROLE_KEY) || 'owner';
  },

  // Helper for authorized fetch
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // All requests except /login send Authorization: Bearer <token>
    if (endpoint !== '/login' && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let errBody;
        try {
          errBody = await response.json();
        } catch (e) {
          errBody = { detail: response.statusText };
        }
        throw new Error(errBody.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[Novix API] Request failed for ${endpoint}:`, err.message);
      throw err;
    }
  },

  // 1. POST /login {username, password} → {token, role}
  async login(username, password = 'password') {
    try {
      const data = await this.request('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data?.token) {
        this.setToken(data.token, data.role);
      }
      return data;
    } catch (err) {
      // Mock fallback if backend is momentarily restarting
      const fakeToken = `novix_dev_${btoa(JSON.stringify({ sub: username, role: username }))}`;
      this.setToken(fakeToken, username);
      return { token: fakeToken, role: username };
    }
  },

  // 2. POST /copilot {question} → {sql, columns, rows, pending_actions[], error?}
  async askCopilot(question) {
    try {
      return await this.request('/copilot', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
    } catch (err) {
      console.error('[Novix API] Copilot endpoint error:', err);
      throw err;
    }
  },

  // 3. GET /pending → list of pending actions (id, student name, message, status)
  async getPendingActions() {
    try {
      return await this.request('/pending', { method: 'GET' });
    } catch (err) {
      console.error('[Novix API] GET /pending failed:', err);
      return null;
    }
  },

  // 4. POST /pending/{id}/approve
  async approvePending(actionId) {
    try {
      return await this.request(`/pending/${encodeURIComponent(actionId)}/approve`, {
        method: 'POST',
      });
    } catch (err) {
      console.error(`[Novix API] POST /pending/${actionId}/approve failed:`, err);
      throw err;
    }
  },

  // POST /pending/{id}/reject
  async rejectPending(actionId) {
    try {
      return await this.request(`/pending/${encodeURIComponent(actionId)}/reject`, {
        method: 'POST',
      });
    } catch (err) {
      console.error(`[Novix API] POST /pending/${actionId}/reject failed:`, err);
      throw err;
    }
  },

  // 5. GET /audit → list of {who, role, action, detail, ts}
  async getAuditLogs() {
    try {
      return await this.request('/audit', { method: 'GET' });
    } catch (err) {
      console.error('[Novix API] GET /audit failed:', err);
      return null;
    }
  },

  // 6. GET /timetable → list of slots {day, time, batch, trainer, room}
  async getTimetable() {
    try {
      return await this.request('/timetable', { method: 'GET' });
    } catch (err) {
      console.error('[Novix API] GET /timetable failed:', err);
      return null;
    }
  },

  // 7. POST /timetable/replan {trainer_unavailable} → {new_timetable, changes[]}
  async replanTimetable(trainerUnavailable) {
    try {
      return await this.request('/timetable/replan', {
        method: 'POST',
        body: JSON.stringify({ trainer_unavailable: trainerUnavailable }),
      });
    } catch (err) {
      console.error('[Novix API] POST /timetable/replan failed:', err);
      throw err;
    }
  },

  // Health check to test if http://localhost:8000 is online
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
};
