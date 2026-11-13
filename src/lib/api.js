// src/lib/api.js
// Client API layer for EduVault supporting Cloudflare D1 Backend

const API_BASE = '/api';
const TOKEN_KEY = 'eduvault_token';
const USER_KEY = 'eduvault_user';

async function safeFetch(url, options = {}) {
  // In Node/jsdom test environments without an origin, guard against relative URL failures
  if (typeof window !== 'undefined' && !window.location.origin) {
    throw new TypeError('Failed to fetch: No origin');
  }
  return fetch(url, options);
}

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function persistSession(data) {
  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  if (data?.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
}

async function parseApiJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new TypeError('API unavailable');
  }
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Authentication
  auth: {
    async login(email, password) {
      const res = await safeFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseApiJson(res);
      persistSession(data);
      return data;
    },

    async signup({ email, password, full_name, institution }) {
      const res = await safeFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, institution }),
      });
      const data = await parseApiJson(res);
      persistSession(data);
      return data;
    },

    async updateProfile(full_name) {
      const res = await safeFetch(`${API_BASE}/auth/update-profile`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ full_name }),
      });
      const data = await parseApiJson(res);
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data;
    },

    async uploadProfileImage(imageData) {
      const res = await safeFetch(`${API_BASE}/auth/profile-image`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ image_data: imageData }),
      });
      const data = await parseApiJson(res);
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data;
    },

    async changePassword(currentPassword, newPassword) {
      const res = await safeFetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      return parseApiJson(res);
    },

    async deleteAccount(password) {
      const res = await safeFetch(`${API_BASE}/auth/delete-account`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password }),
      });
      const data = await parseApiJson(res);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return data;
    },

    async logout() {
      try {
        await safeFetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: authHeaders(),
        });
      } catch {
        // offline logout still clears local session
      }
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    },

    getCurrentUser() {
      try {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
  },

  // Documents
  documents: {
    async list(institutionId, { trash = false } = {}) {
      const params = new URLSearchParams();
      if (institutionId) params.set('institution_id', institutionId);
      if (trash) params.set('trash', '1');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await safeFetch(`${API_BASE}/documents${qs}`);
      const data = await parseApiJson(res);
      return data.data || [];
    },

    async create(doc) {
      const res = await safeFetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(doc),
      });
      const data = await parseApiJson(res);
      return data.data;
    },

    async patch(id, payload) {
      const res = await safeFetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await parseApiJson(res);
      return data.data;
    },
  },

  vaultSections: {
    async list(institutionId) {
      const res = await safeFetch(
        `${API_BASE}/vault-sections?institution_id=${encodeURIComponent(institutionId)}`
      );
      const data = await parseApiJson(res);
      return data.data || [];
    },

    async create({ institution_id, name }) {
      const res = await safeFetch(`${API_BASE}/vault-sections`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ institution_id, name }),
      });
      const data = await parseApiJson(res);
      return data.data;
    },

    async delete({ password, id, institution_id }) {
      const res = await safeFetch(`${API_BASE}/vault-sections/delete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password, id, institution_id }),
      });
      return parseApiJson(res);
    },
  },

  folders: {
    async list(institutionId) {
      const res = await safeFetch(
        `${API_BASE}/folders?institution_id=${encodeURIComponent(institutionId)}`
      );
      const data = await parseApiJson(res);
      return data.data || [];
    },

    async create(payload) {
      const res = await safeFetch(`${API_BASE}/folders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await parseApiJson(res);
      return data.data;
    },

    async patch(id, payload) {
      const res = await safeFetch(`${API_BASE}/folders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await parseApiJson(res);
      return data.data;
    },
  },
};
