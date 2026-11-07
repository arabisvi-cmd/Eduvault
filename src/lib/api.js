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

export const api = {
  // Authentication
  auth: {
    async login(email, password) {
      const res = await safeFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('eduvault_user', JSON.stringify(data.user));
      return data;
    },

    async signup({ email, password, full_name, institution }) {
      const res = await safeFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, institution }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      localStorage.setItem('eduvault_user', JSON.stringify(data.user));
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
    async list() {
      const res = await safeFetch(`${API_BASE}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const json = await res.json();
      return json.data || [];
    },

    async create(doc) {
      const res = await safeFetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save document');
      return json.data;
    }
  }
};
