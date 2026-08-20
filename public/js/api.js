const API = {
  token: localStorage.getItem('vs_token'),
  user: JSON.parse(localStorage.getItem('vs_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('vs_token');
    localStorage.removeItem('vs_user');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    try {
      const res = await fetch(`/api${url}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Access denied' || err.message === 'Invalid token') {
        this.clearAuth();
        window.location.reload();
      }
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(url) { return this.request(url, { method: 'DELETE' }); }
};
