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
  async register(name, email, password, phone) {
    const res = await fetch(`${TRI_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
      credentials: 'include'
    });
    const data = await res.json();
    // Backend returns { message, token, user } on 201 — no explicit `success` field
    // Treat token presence as success
    if (data.token && data.user) {
      data.success = true;
      this._saveSession(data.token, data.user);
      await this._syncCartAfterLogin();
    } else {
      data.success = false;
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
    // Backend returns { message, token, user } on 200 — no explicit `success` field
    if (data.token && data.user) {
      data.success = true;
      this._saveSession(data.token, data.user);
      await this._syncCartAfterLogin();
    } else {
      data.success = false;
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

  // Get order history — FIXED: was /api/orders/my-orders, correct is /api/orders/history
  async getMyOrders() {
    const res = await fetch(`${TRI_API}/api/orders/history`, {
      headers: this._headers(),
      credentials: 'include'
    });
    return res.json();
  },

  // Place order — FIXED: was /api/orders/create, correct is /api/orders/place
  // Backend expects: { address: { name, phone, line1, city, state, pincode }, notes }
  // and reads cart from DB server-side (must be logged in and have cart items in DB)
  async placeOrder(orderData) {
    const res = await fetch(`${TRI_API}/api/orders/place`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(orderData),
      credentials: 'include'
    });
    return res.json();
  },

  // Create Razorpay payment order — FIXED: was /api/payments/create, correct is /api/payment/create-order
  // Backend expects: { order_id: INT }
  // Backend returns: { razorpay_order_id, amount, currency, key_id }
  async createPaymentOrder(order_id) {
    const res = await fetch(`${TRI_API}/api/payment/create-order`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ order_id }),
      credentials: 'include'
    });
    return res.json();
  },

  // Verify payment — FIXED: was /api/payments/verify, correct is /api/payment/verify
  async verifyPayment(paymentData) {
    const res = await fetch(`${TRI_API}/api/payment/verify`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(paymentData),
      credentials: 'include'
    });
    return res.json();
  }
};

window.TriAuth = TriAuth;
