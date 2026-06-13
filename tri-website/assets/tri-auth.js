// TRI Auth Client — shared across all pages
// API Base (same server)
const TRI_API = '';

const TriAuth = {
  // Get stored token
  getToken() {
    return localStorage.getItem('tri_token');
  },

  // Get stored user
  getUser() {
    try {
      const u = localStorage.getItem('tri_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },

  // Check if logged in
  isLoggedIn() {
    return !!this.getToken();
  },

  // Save session
  _saveSession(token, user) {
    localStorage.setItem('tri_token', token);
    localStorage.setItem('tri_user', JSON.stringify(user));
  },

  // Clear session
  _clearSession() {
    localStorage.removeItem('tri_token');
    localStorage.removeItem('tri_user');
  },

  // Auth headers
  _headers() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  // Register
  async register(name, email, password) {
    const res = await fetch(`${TRI_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success && data.token) {
      this._saveSession(data.token, data.user);
      await this._syncCartAfterLogin();
    }
    return data;
  },

  // Login
  async login(email, password) {
    const res = await fetch(`${TRI_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success && data.token) {
      this._saveSession(data.token, data.user);
      await this._syncCartAfterLogin();
    }
    return data;
  },

  // Logout
  async logout() {
    try {
      await fetch(`${TRI_API}/api/auth/logout`, {
        method: 'POST',
        headers: this._headers(),
        credentials: 'include'
      });
    } catch (e) {}
    this._clearSession();
  },

  // Get profile
  async getProfile() {
    const res = await fetch(`${TRI_API}/api/auth/profile`, {
      headers: this._headers(),
      credentials: 'include'
    });
    return res.json();
  },

  // Sync localStorage cart to server after login
  async _syncCartAfterLogin() {
    try {
      const localCart = JSON.parse(localStorage.getItem('tri_cart') || '[]');
      if (localCart.length === 0) return;
      await fetch(`${TRI_API}/api/cart/sync`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({ items: localCart }),
        credentials: 'include'
      });
    } catch (e) {}
  },

  // Get orders
  async getMyOrders() {
    const res = await fetch(`${TRI_API}/api/orders/my-orders`, {
      headers: this._headers(),
      credentials: 'include'
    });
    return res.json();
  },

  // Create order
  async createOrder(orderData) {
    const res = await fetch(`${TRI_API}/api/orders/create`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(orderData),
      credentials: 'include'
    });
    return res.json();
  },

  // Create Razorpay payment order
  async createPaymentOrder(amount, orderId) {
    const res = await fetch(`${TRI_API}/api/payments/create`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ amount, orderId }),
      credentials: 'include'
    });
    return res.json();
  },

  // Verify payment
  async verifyPayment(paymentData) {
    const res = await fetch(`${TRI_API}/api/payments/verify`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(paymentData),
      credentials: 'include'
    });
    return res.json();
  }
};

window.TriAuth = TriAuth;
