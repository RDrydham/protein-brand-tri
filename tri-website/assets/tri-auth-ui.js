// TRI Auth UI Controller — injected into all pages
// Requires: tri-auth.js to be loaded first
// Injects the auth modal, adds the account button to nav, and wires all events.

(function () {
  'use strict';

  // ── 1. INJECT AUTH MODAL HTML ──────────────────────────────────────
  if (!document.getElementById('auth-overlay')) {
    const modalHTML = `
<!-- ═══ AUTH MODAL ═══ -->
<div id="auth-overlay" role="dialog" aria-modal="true" aria-label="Sign in or create account">
  <div id="auth-panel">
    <button id="auth-close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="auth-logo">
      <span>△ TRI</span>
      <sub>The Real Inside</sub>
    </div>
    <p id="auth-hint"></p>
    <div class="auth-tabs">
      <button class="auth-tab active" id="tab-login">Sign In</button>
      <button class="auth-tab" id="tab-register">Create Account</button>
    </div>
    <!-- LOGIN FORM -->
    <form id="login-form" class="auth-form">
      <div class="auth-field">
        <label>Email</label>
        <input type="email" id="login-email" placeholder="your@email.com" required autocomplete="email" />
      </div>
      <div class="auth-field">
        <label>Password</label>
        <input type="password" id="login-password" placeholder="Min. 6 characters" required autocomplete="current-password" />
      </div>
      <div class="auth-error-msg" id="login-error"></div>
      <button type="submit" class="auth-submit" id="login-submit">Sign In →</button>
    </form>
    <!-- REGISTER FORM -->
    <form id="register-form" class="auth-form" style="display:none;">
      <div class="auth-field">
        <label>Full Name</label>
        <input type="text" id="reg-name" placeholder="Your name" required autocomplete="name" />
      </div>
      <div class="auth-field">
        <label>Email</label>
        <input type="email" id="reg-email" placeholder="your@email.com" required autocomplete="email" />
      </div>
      <div class="auth-field">
        <label>Password</label>
        <input type="password" id="reg-password" placeholder="Min. 6 characters" required autocomplete="new-password" />
      </div>
      <div class="auth-error-msg" id="reg-error"></div>
      <button type="submit" class="auth-submit" id="reg-submit">Create Account →</button>
    </form>
    <div class="auth-switch-text" id="auth-switch-text">
      Don't have an account? <button id="switch-to-register">Create one</button>
    </div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // ── 2. INJECT ACCOUNT BUTTON INTO NAV ─────────────────────────────
  // Only inject if not already present
  if (!document.getElementById('account-btn')) {
    // The account button HTML
    const acctBtnHTML = `<button class="nav-account" id="account-btn" aria-label="My Account">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </button>`;

    // Find the nav-right (various class names across pages)
    const navRight = document.querySelector('.nav-right, .nav-right-group');
    if (navRight) {
      // Insert before first child (cart btn is first child)
      navRight.insertAdjacentHTML('afterbegin', acctBtnHTML);
    }
  }

  // ── 3. INJECT MOBILE MENU AUTH LINKS ──────────────────────────────
  // Various mobile menu list selectors across pages
  if (!document.getElementById('mm-login-link')) {
    const mmLinksSelectors = [
      '.mm-links',       // index.html
      '.mn-links',       // about.html, inside.html, contact.html
      '.mm-link-list',   // lab-reports.html
    ];
    let mmLinks = null;
    for (const sel of mmLinksSelectors) {
      mmLinks = document.querySelector(sel);
      if (mmLinks) break;
    }
    if (mmLinks) {
      const authLinksHTML = `
      <a href="account.html" id="mm-orders-link" style="display:none; font-family:'DM Sans',sans-serif;">📦 My Account</a>
      <a href="#" id="mm-login-link" style="font-family:'DM Sans',sans-serif;">Sign In / Register</a>
      <a href="#" id="mm-logout-link" style="display:none; color:#C8787A; font-family:'DM Sans',sans-serif;">Sign Out</a>`;
      mmLinks.insertAdjacentHTML('beforeend', authLinksHTML);
    }
  }

  // ── 4. AUTH MODAL CONTROLLER ───────────────────────────────────────
  function initAuthUI() {
    const authOverlay  = document.getElementById('auth-overlay');
    const authClose    = document.getElementById('auth-close');
    const tabLogin     = document.getElementById('tab-login');
    const tabRegister  = document.getElementById('tab-register');
    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError   = document.getElementById('login-error');
    const regError     = document.getElementById('reg-error');
    const authHint     = document.getElementById('auth-hint');
    const switchText   = document.getElementById('auth-switch-text');
    const mmOrdersLink = document.getElementById('mm-orders-link');
    const mmLoginLink  = document.getElementById('mm-login-link');
    const mmLogoutLink = document.getElementById('mm-logout-link');

    function openAuth(hint) {
      if (!authOverlay) return;
      authOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (authHint) authHint.textContent = hint || '';
    }

    function closeAuth() {
      if (!authOverlay) return;
      authOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (loginError) loginError.textContent = '';
      if (regError)   regError.textContent   = '';
      if (authHint)   authHint.textContent   = '';
    }

    function showLogin() {
      if (tabLogin)  tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (loginForm)    loginForm.style.display    = 'flex';
      if (registerForm) registerForm.style.display = 'none';
      if (switchText) {
        switchText.innerHTML = 'Don\'t have an account? <button id="switch-to-register">Create one</button>';
        const sw = document.getElementById('switch-to-register');
        if (sw) sw.onclick = showRegister;
      }
    }

    function showRegister() {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin)    tabLogin.classList.remove('active');
      if (registerForm) registerForm.style.display = 'flex';
      if (loginForm)    loginForm.style.display    = 'none';
      if (switchText) {
        switchText.innerHTML = 'Already have an account? <button id="switch-to-login">Sign in</button>';
        const sw = document.getElementById('switch-to-login');
        if (sw) sw.onclick = showLogin;
      }
    }

    // Update nav to reflect logged-in state
    function updateNavAuth() {
      if (!window.TriAuth) return;
      const user = TriAuth.getUser();
      const accountBtn = document.getElementById('account-btn');
      if (!accountBtn) return;

      if (user && TriAuth.isLoggedIn()) {
        const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'ME';
        const displayName = user.name || 'My Account';
        accountBtn.innerHTML = `
          <div class="acct-initials">${initials}</div>
          <div class="acct-dropdown" id="acct-dropdown">
            <div class="dd-name">${displayName}</div>
            <div class="dd-divider"></div>
            <a href="account.html">📦 My Account</a>
            <div class="dd-divider"></div>
            <button class="dd-logout" id="nav-logout-btn">Sign Out</button>
          </div>`;
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) logoutBtn.onclick = handleLogout;
        if (mmOrdersLink) mmOrdersLink.style.display = '';
        if (mmLoginLink)  mmLoginLink.style.display  = 'none';
        if (mmLogoutLink) mmLogoutLink.style.display  = '';
      } else {
        accountBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        if (mmOrdersLink) mmOrdersLink.style.display = 'none';
        if (mmLoginLink)  mmLoginLink.style.display  = '';
        if (mmLogoutLink) mmLogoutLink.style.display  = 'none';
      }
    }

    async function handleLogout() {
      if (window.TriAuth) await TriAuth.logout();
      updateNavAuth();
      const dd = document.getElementById('acct-dropdown');
      if (dd) dd.classList.remove('open');
    }

    // Account button click
    const accountBtn = document.getElementById('account-btn');
    if (accountBtn) {
      accountBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (window.TriAuth && TriAuth.isLoggedIn()) {
          const dd = document.getElementById('acct-dropdown');
          if (dd) dd.classList.toggle('open');
        } else {
          openAuth('');
        }
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', function () {
      const dd = document.getElementById('acct-dropdown');
      if (dd) dd.classList.remove('open');
    });

    // Tab switchers
    if (tabLogin)    tabLogin.onclick    = showLogin;
    if (tabRegister) tabRegister.onclick = showRegister;
    const switchReg = document.getElementById('switch-to-register');
    if (switchReg)   switchReg.onclick   = showRegister;

    // Close modal
    if (authClose)   authClose.onclick = closeAuth;
    if (authOverlay) authOverlay.addEventListener('click', function (e) {
      if (e.target === authOverlay) closeAuth();
    });

    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && authOverlay && authOverlay.classList.contains('open')) closeAuth();
    });

    // Login form submit
    if (loginForm) loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = document.getElementById('login-submit');
      if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
      if (loginError) loginError.textContent = '';
      const emailEl = document.getElementById('login-email');
      const passEl  = document.getElementById('login-password');
      const email   = emailEl ? emailEl.value.trim() : '';
      const password = passEl ? passEl.value : '';
      try {
        const result = await TriAuth.login(email, password);
        if (result.success) {
          closeAuth();
          updateNavAuth();
          showToast('Welcome back, ' + (result.user.name || 'there') + '! 👋');
        } else {
          if (loginError) loginError.textContent = result.message || 'Login failed. Please try again.';
        }
      } catch (err) {
        if (loginError) loginError.textContent = 'Connection error. Please try again.';
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In →'; }
    });

    // Register form submit
    if (registerForm) registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = document.getElementById('reg-submit');
      if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
      if (regError) regError.textContent = '';
      const nameEl = document.getElementById('reg-name');
      const emailEl = document.getElementById('reg-email');
      const passEl  = document.getElementById('reg-password');
      const name     = nameEl  ? nameEl.value.trim()  : '';
      const email    = emailEl ? emailEl.value.trim()  : '';
      const password = passEl  ? passEl.value         : '';
      if (password.length < 6) {
        if (regError) regError.textContent = 'Password must be at least 6 characters.';
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
        return;
      }
      try {
        const result = await TriAuth.register(name, email, password);
        if (result.success) {
          closeAuth();
          updateNavAuth();
          showToast('Account created! Welcome to TRI, ' + (result.user.name || '') + ' 🎉');
        } else {
          if (regError) regError.textContent = result.message || 'Registration failed.';
        }
      } catch (err) {
        if (regError) regError.textContent = 'Connection error. Please try again.';
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
    });

    // Mobile login link
    if (mmLoginLink) mmLoginLink.addEventListener('click', function (e) {
      e.preventDefault();
      // Close any open mobile menu
      const menus = ['mobile-menu', 'mobile-nav'];
      menus.forEach(id => {
        const m = document.getElementById(id);
        if (m) m.classList.remove('open');
      });
      document.body.style.overflow = '';
      setTimeout(() => openAuth(''), 200);
    });

    if (mmLogoutLink) mmLogoutLink.addEventListener('click', function (e) {
      e.preventDefault();
      handleLogout();
    });

    // Wire checkout button to require auth (index.html only)
    const checkoutBtn = document.querySelector('.cp-checkout');
    if (checkoutBtn && !checkoutBtn.dataset.authWired) {
      checkoutBtn.dataset.authWired = '1';
      checkoutBtn.addEventListener('click', function (ev) {
        if (!window.TriAuth || !TriAuth.isLoggedIn()) {
          ev.stopImmediatePropagation();
          openAuth('Please sign in to complete your purchase');
        }
      }, true); // capture phase so it runs first
    }

    // Expose globally
    window.triOpenAuth   = openAuth;
    window.triUpdateNavAuth = updateNavAuth;

    // Init nav state on load
    updateNavAuth();
  }

  // ── 5. TOAST HELPER ───────────────────────────────────────────────
  window.triShowToast = function showToast(msg) {
    const existing = document.querySelector('.tri-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'tri-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1A1A1A', 'color:#fff', 'padding:14px 24px', 'border-radius:12px',
      "font-family:'DM Sans',sans-serif", 'font-size:14px', 'font-weight:500',
      'box-shadow:0 8px 32px rgba(0,0,0,0.3)', 'z-index:99999',
      'white-space:nowrap'
    ].join(';');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
  };

  // local alias
  function showToast(msg) { window.triShowToast(msg); }

  // ── 6. INITIALISE ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
  } else {
    initAuthUI();
  }
})();
