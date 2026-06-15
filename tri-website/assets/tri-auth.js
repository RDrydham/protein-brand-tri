// TRI Auth Client — shared across all pages — v2.1
// API Base — empty string = same domain (Nginx proxies /api/ → backend:3000)
const TRI_API = '';

// Safe LocalStorage wrapper to prevent exceptions on restricted devices
if (!window.safeStorage) {
  window.safeStorage = {
    getItem(key) {
      try { return localStorage.getItem(key); } catch (e) { return this._store[key] || null; }
    },
    setItem(key, val) {
      try { localStorage.setItem(key, val); } catch (e) { this._store[key] = String(val); }
    },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch (e) { delete this._store[key]; }
    },
    clear() {
      try { localStorage.clear(); } catch (e) { this._store = {}; }
    },
    _store: {}
  };
}

const TriAuth = {
  // Get stored token
  getToken() {
    return window.safeStorage.getItem('tri_token');
  },

  // Get stored user
  getUser() {
    try {
      const u = window.safeStorage.getItem('tri_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },

  // Check if logged in
  isLoggedIn() {
    return !!this.getToken();
  },

  // Save session
  _saveSession(token, user) {
    window.safeStorage.setItem('tri_token', token);
    window.safeStorage.setItem('tri_user', JSON.stringify(user));
  },

  // Clear session
  _clearSession() {
    window.safeStorage.removeItem('tri_token');
    window.safeStorage.removeItem('tri_user');
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
    // DEBUG — remove after testing
    console.log('[TRI Auth] Register response status:', res.status);
    console.log('[TRI Auth] Register response data:', JSON.stringify(data));
    // Backend returns { message, token, user } on 201
    if (data.token && data.user) {
      data.success = true;
      this._saveSession(data.token, data.user);
      try { await this._syncCartAfterLogin(); } catch(e) {}
    } else {
      data.success = false;
      console.warn('[TRI Auth] Register failed — token:', !!data.token, '| user:', !!data.user, '| message:', data.message);
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
    console.log('[TRI Auth] Login HTTP status:', res.status);
    // If backend is down (503/502/500), return friendly error immediately
    if (res.status === 503 || res.status === 502) {
      return { success: false, message: 'Server unavailable (503). Backend is not running — please contact support.' };
    }
    if (res.status === 429) {
      return { success: false, message: 'Too many attempts. Please wait 1 minute and try again.' };
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.warn('[TRI Auth] Response is not JSON (status:', res.status, ')');
      return { success: false, message: 'Server error. Please try again.' };
    }
    console.log('[TRI Auth] Login response:', JSON.stringify(data));
    if (data.token && data.user) {
      data.success = true;
      this._saveSession(data.token, data.user);
      try { await this._syncCartAfterLogin(); } catch(e) {}
    } else {
      data.success = false;
      console.warn('[TRI Auth] Missing token/user — token:', !!data.token, 'user:', !!data.user);
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
      const localCart = JSON.parse(window.safeStorage.getItem('tri_cart') || '[]');
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

  // Legacy / Index Page support
  async createOrder(orderData) {
    // If it's the old payload format, transform it to the format required by /api/orders/place
    let payload = orderData;
    if (orderData && orderData.shippingAddress && !orderData.address) {
      payload = {
        address: {
          name: orderData.customerName || 'Customer',
          phone: orderData.phoneNumber || '',
          line1: orderData.shippingAddress,
          line2: '',
          city: '',
          state: '',
          pincode: ''
        },
        notes: ''
      };
    }
    return this.placeOrder(payload);
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
