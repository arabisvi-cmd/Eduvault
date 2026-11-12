// src/lib/api.js
// Client API layer for EduVault supporting Cloudflare D1 Backend

const API_BASE = '/api';

async function safeFetch(url, options = {}) {
  // In Node/jsdom test environments without an origin, guard against relative URL failures
  if (typeof window !== 'undefined' && !window.location.origin) {
    throw new TypeError('Failed to fetch: No origin');
  }
  return fetch(url, options);
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
      localStorage.setItem('eduvault_user', JSON.stringify(data.user));
      return data;
    },

    async signup({ email, password, full_name, institution }) {
      const res = await safeFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, institution }),
      });
      const data = await parseApiJson(res);
      localStorage.setItem('eduvault_user', JSON.stringify(data.user));
      return data;
    },

    async updateProfile(email, full_name) {
      const res = await safeFetch(`${API_BASE}/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name }),
      });
      const data = await parseApiJson(res);
      if (data.user) {
        localStorage.setItem('eduvault_user', JSON.stringify(data.user));
      }
      return data;
    },

    async uploadProfileImage(email, imageData) {
      const res = await safeFetch(`${API_BASE}/auth/profile-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, image_data: imageData }),
      });
      const data = await parseApiJson(res);
      if (data.user) {
        localStorage.setItem('eduvault_user', JSON.stringify(data.user));
      }
      return data;
    },

    async changePassword(email, currentPassword, newPassword) {
      const res = await safeFetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      return parseApiJson(res);
    },

    async deleteAccount(email, password) {
      const res = await safeFetch(`${API_BASE}/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseApiJson(res);
      localStorage.removeItem('eduvault_user');
      return data;
    },

    logout() {
      localStorage.removeItem('eduvault_user');
    },

    getCurrentUser() {
      try {
        const stored = localStorage.getItem('eduvault_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
  },

  // Documents
  documents: {
    async list(institutionId) {
      const qs = institutionId ? `?institution_id=${encodeURIComponent(institutionId)}` : '';
      const res = await safeFetch(`${API_BASE}/documents${qs}`);
      const data = await parseApiJson(res);
      return data.data || [];
    },

    async create(doc) {
      const res = await safeFetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      const data = await parseApiJson(res);
      return data.data;
    },

    async patch(id, payload) {
      const res = await safeFetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

    async create({ email, institution_id, name }) {
      const res = await safeFetch(`${API_BASE}/vault-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, institution_id, name }),
      });
      const data = await parseApiJson(res);
      return data.data;
    },

    async delete({ email, password, id, institution_id }) {
      const res = await safeFetch(`${API_BASE}/vault-sections/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, id, institution_id }),
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseApiJson(res);
      return data.data;
    },

    async patch(id, payload) {
      const res = await safeFetch(`${API_BASE}/folders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseApiJson(res);
      return data.data;
    },
  },
};
