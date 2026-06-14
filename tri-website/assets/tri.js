/* =============================================================
   TRI — The Real Inside | Shared JavaScript v5.0
   Clean, warm-theme compatible. No dark universe engine.
   ============================================================= */

(function () {
  'use strict';

  /* ════════════════════════════════════════
     LOADER (Bypassed)
  ════════════════════════════════════════ */
  const loader = document.getElementById('tri-loader') || document.getElementById('loader');
  if (loader) {
    loader.style.display = 'none';
  }


  /* ════════════════════════════════════════
     NAVIGATION
  ════════════════════════════════════════ */
  const nav = document.getElementById('tri-nav');
  if (nav) {
    const handleScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const path = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.nav-links a').forEach(a => {
      const href = (a.getAttribute('href') || '').replace('./', '');
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  /* ════════════════════════════════════════
     MOBILE MENU
  ════════════════════════════════════════ */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    function openMobNav() {
      hamburger.classList.add('open');
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMobNav() {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    }
    hamburger.addEventListener('click', () => {
      if (mobileNav.classList.contains('open')) { closeMobNav(); } else { openMobNav(); }
    });
    /* Close button inside menu */
    const closeBtn = mobileNav.querySelector('.mn-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeMobNav);
    /* Close on link click */
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobNav);
    });
    /* Close on backdrop click */
    mobileNav.addEventListener('click', e => { if (e.target === mobileNav) closeMobNav(); });
  }

  /* ════════════════════════════════════════
     SCROLL REVEAL
  ════════════════════════════════════════ */
  const revealed = new WeakSet();
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !revealed.has(entry.target)) {
        entry.target.classList.add('visible');
        revealed.add(entry.target);

        // Stagger children with data-stagger
        const children = entry.target.querySelectorAll('[data-stagger]');
        children.forEach((child, i) => {
          setTimeout(() => child.classList.add('visible'), i * 80);
        });
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function revealAll() {
    document.querySelectorAll('.reveal, .stagger').forEach(el => revealObs.observe(el));
  }

  /* ════════════════════════════════════════
     HERO ENTRANCE ANIMATIONS
  ════════════════════════════════════════ */
  function runEntranceAnimations() {
    revealAll();
    const heroEls = document.querySelectorAll('.hero-animate');
    heroEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.75s var(--ease-out, cubic-bezier(0.16,1,0.3,1)), transform 0.75s var(--ease-out, cubic-bezier(0.16,1,0.3,1))';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 180 + i * 110);
    });
  }

  /* ════════════════════════════════════════
     COUNTERS (data-count attribute)
  ════════════════════════════════════════ */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const dur = 1400;
      const start = Date.now();
      const run = () => {
        const elapsed = Date.now() - start;
        const p = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.floor(ease * target) + suffix;
        if (p < 1) requestAnimationFrame(run);
      };
      run();
      countObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => countObs.observe(el));

  /* ════════════════════════════════════════
     CART SYSTEM
  ════════════════════════════════════════ */
  let cartItems = [];
  let isLoggedIn = false;
  let currentUser = null;

  // Product name → backend product_id mapping
  // (matches backend/db/schema.sql seed data)
  const PRODUCT_ID_MAP = {
    'TRI Fusion Pack': 1,
    'TRI True Whey Protein': 2,
    'TRI Power BCAA': 3,
    'TRI Pump Drake Pre-Workout': 4,
    // Partial name matches (fallback)
    'Fusion Pack': 1,
    'True Whey': 2,
    'BCAA': 3,
    'Pre-Workout': 4,
    'Drake': 4
  };

  function getProductId(name) {
    if (!name) return null;
    // Exact match first
    if (PRODUCT_ID_MAP[name]) return PRODUCT_ID_MAP[name];
    // Partial match
    const lower = name.toLowerCase();
    for (const [key, id] of Object.entries(PRODUCT_ID_MAP)) {
      if (lower.includes(key.toLowerCase())) return id;
    }
    return 1; // Default to Fusion Pack
  }

  try {
    currentUser = JSON.parse(localStorage.getItem('tri_user') || 'null');
    isLoggedIn = !!(currentUser && localStorage.getItem('tri_token'));
  } catch(e) {}

  const loadCart = async () => {
    if (isLoggedIn) {
      try {
        const token = localStorage.getItem('tri_token');
        const res = await fetch('/api/cart', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.status === 200) {
          const data = await res.json();
          // Backend returns { items, total } — NOT data.cart
          const rawItems = data.items || [];
          cartItems = rawItems.map(item => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name,
            price: parseFloat(item.price) || 0,
            image: item.image || 'assets/hero_product.png',
            variant: item.variant || '',
            qty: item.quantity || 1
          }));
          syncCartUI();
          return;
        } else if (res.status === 401) {
          isLoggedIn = false;
          currentUser = null;
          localStorage.removeItem('tri_user');
          localStorage.removeItem('tri_token');
        }
      } catch (err) {
        console.warn('Failed to load database cart, using offline copy.', err);
      }
    }

    try {
      cartItems = JSON.parse(localStorage.getItem('tri_cart') || '[]');
    } catch(e) {
      cartItems = [];
    }
    syncCartUI();
  };

  const syncCartUI = () => {
    const count = cartItems.reduce((s, i) => s + i.qty, 0);
    const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

    document.querySelectorAll('.cart-count, #cart-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('show', count > 0);
      el.classList.toggle('visible', count > 0);
    });

    const totalEl = document.getElementById('cart-total-amount');
    if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');

    const bodyEl = document.getElementById('cart-body');
    if (bodyEl) {
      if (!cartItems.length) {
        bodyEl.innerHTML = `
          <div style="padding:48px 24px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">🛒</div>
            <p style="font-family:var(--font-serif);font-size:18px;font-weight:600;color:var(--dark);margin-bottom:6px;">Your cart is empty</p>
            <p style="font-size:13px;color:var(--muted-text);">Add something to get started.</p>
          </div>`;
      } else {
        bodyEl.innerHTML = cartItems.map((item, i) => `
          <div class="cart-item" style="display:flex;gap:14px;padding:18px 0;border-bottom:1px solid rgba(230,162,164,0.2);">
            <img src="${item.image}" style="width:64px;height:64px;object-fit:contain;border-radius:10px;background:var(--cream-warm);">
            <div style="flex:1;">
              <div style="font-family:var(--font-serif);font-size:15px;font-weight:600;color:var(--dark);margin-bottom:2px;">${item.name}</div>
              <div style="font-size:11px;color:var(--muted-text);margin-bottom:6px;">${item.variant || ''}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-family:var(--font-label);font-size:15px;font-weight:700;color:var(--dark);">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
                <button onclick="triRemoveFromCart(${i}, ${item.id || 'null'})" style="background:none;border:none;font-size:11px;color:var(--muted-text);cursor:pointer;font-family:var(--font-label);letter-spacing:0.05em;">REMOVE</button>
              </div>
            </div>
          </div>`).join('');
      }
    }
    try { localStorage.setItem('tri_cart', JSON.stringify(cartItems)); } catch(e) {}
  };

  window.triAddToCart = async (name, price, image, variant) => {
    if (isLoggedIn) {
      try {
        const token = localStorage.getItem('tri_token');
        const product_id = getProductId(name);
        if (!product_id) {
          console.warn('Unknown product name, falling back to local cart:', name);
        } else {
          const res = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            // Backend expects { product_id, quantity } — NOT productName/price/imageUrl
            body: JSON.stringify({ product_id, quantity: 1 })
          });
          if (res.ok) {
            await loadCart();
            showToast('Added to cart ✓');
            openCart();
            return;
          } else if (res.status === 401) {
            isLoggedIn = false;
            localStorage.removeItem('tri_token');
            localStorage.removeItem('tri_user');
          }
        }
      } catch (err) {
        console.error('Failed to add to database cart:', err);
      }
    }

    const ex = cartItems.find(i => i.name === name && i.variant === variant);
    if (ex) ex.qty++;
    else cartItems.push({ name, price: parseInt(price) || 0, image: image || 'assets/hero_product.png', variant, qty: 1 });
    syncCartUI();
    showToast('Added to cart ✓');
    openCart();
  };

  window.triRemoveFromCart = async (idx, dbId) => {
    if (isLoggedIn && dbId) {
      try {
        const token = localStorage.getItem('tri_token');
        // FIXED: was /api/cart/remove/:id, correct is /api/cart/:id
        const res = await fetch(`/api/cart/${dbId}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          await loadCart();
          return;
        }
      } catch (err) {
        console.error('Failed to remove from database cart:', err);
      }
    }

    cartItems.splice(idx, 1);
    syncCartUI();
  };

  window.triSyncCartAfterLogin = async () => {
    try {
      const localCart = JSON.parse(localStorage.getItem('tri_cart') || '[]');
      if (localCart.length > 0) {
        const res = await fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart: localCart })
        });
        if (res.status === 200) {
          localStorage.removeItem('tri_cart');
        }
      }
      currentUser = JSON.parse(localStorage.getItem('tri_user') || 'null');
      isLoggedIn = !!currentUser;
      await loadCart();
    } catch (err) {
      console.error('Error syncing cart after login:', err);
    }
  };

  // Dynamic Checkout Modal Injection
  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const openCheckoutModal = async () => {
    if (cartItems.length === 0) {
      showToast('Your cart is empty! 🛒');
      return;
    }

    // Redirect to dedicated checkout page instead of inline modal
    closeCart();
    window.location.href = 'checkout.html';
    return;

    closeCart(); // Close sidebar cart (unreachable — kept for reference)

    // Check if modal container already exists
    let modalWrap = document.getElementById('tri-checkout-modal-wrap');
    if (!modalWrap) {
      modalWrap = document.createElement('div');
      modalWrap.id = 'tri-checkout-modal-wrap';
      modalWrap.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(11, 11, 12, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(modalWrap);
    }

    const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    const prefillName = currentUser ? currentUser.name : '';
    const prefillEmail = currentUser ? currentUser.email : '';

    modalWrap.innerHTML = `
      <div id="tri-checkout-panel" style="
        background: #121214;
        border: 1px solid #2c2c2e;
        border-radius: 16px;
        padding: 32px;
        width: 90%;
        max-width: 480px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.8);
        color: #f5f5f7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: scale(0.95);
        transition: transform 0.3s ease;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">△ Checkout</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #a1a1a6;">Complete your delivery & payment</p>
          </div>
          <button id="tri-checkout-close" style="
            background: none; border: none; color: #a1a1a6; cursor: pointer; padding: 4px;
          ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width: 20px; height: 20px;">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="tri-checkout-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1a6; margin-bottom: 6px; font-weight: 700;">Full Name</label>
            <input type="text" id="chk-name" required value="${prefillName}" placeholder="Aarav Sharma" style="
              width: 100%; padding: 12px; background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;
            " ${isLoggedIn ? 'readonly' : ''}>
          </div>

          <div>
            <label style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1a6; margin-bottom: 6px; font-weight: 700;">Email Address</label>
            <input type="email" id="chk-email" required value="${prefillEmail}" placeholder="aarav@gmail.com" style="
              width: 100%; padding: 12px; background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; color: #ffffff; font-size: 14px; box-sizing: border-box;
            " ${isLoggedIn ? 'readonly' : ''}>
          </div>

          <div>
            <label style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1a6; margin-bottom: 6px; font-weight: 700;">Shipping Address</label>
            <textarea id="chk-address" required rows="3" placeholder="Flat No, Street, Landmark, City, State, PIN" style="
              width: 100%; padding: 12px; background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; color: #ffffff; font-size: 14px; font-family: inherit; line-height: 1.5; resize: none; box-sizing: border-box;
            "></textarea>
          </div>

          <!-- Order summary -->
          <div style="background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; padding: 16px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #a1a1a6;">
              <span>Subtotal</span>
              <span>₹${total.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; color: #a1a1a6;">
              <span>Shipping</span>
              <span style="color: #22c55e; font-weight: 600;">FREE</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #2c2c2e; padding-top: 12px;">
              <span style="font-weight: 700; color: #ffffff; font-size: 15px;">Total Amount</span>
              <span style="font-weight: 800; color: #e6a2a4; font-size: 18px;">₹${total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button type="submit" id="chk-submit-btn" style="
            background: #e6a2a4; color: #0b0b0c; border: none; border-radius: 8px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; margin-top: 8px;
          ">
            Proceed to Payment — ₹${total.toLocaleString('en-IN')}
          </button>
        </form>
      </div>
    `;

    // Animate open
    setTimeout(() => {
      modalWrap.style.opacity = '1';
      document.getElementById('tri-checkout-panel').style.transform = 'scale(1)';
    }, 10);

    const closeCheckout = () => {
      modalWrap.style.opacity = '0';
      document.getElementById('tri-checkout-panel').style.transform = 'scale(0.95)';
      setTimeout(() => {
        modalWrap.remove();
      }, 300);
    };

    document.getElementById('tri-checkout-close').addEventListener('click', closeCheckout);
    modalWrap.addEventListener('click', (e) => {
      if (e.target === modalWrap) closeCheckout();
    });

    // Handle Form Submit
    document.getElementById('tri-checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('chk-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      const name = document.getElementById('chk-name').value;
      const email = document.getElementById('chk-email').value;
      const address = document.getElementById('chk-address').value;

      try {
        // 1. Create order on backend
        const orderPayload = {
          customerName: name,
          customerEmail: email,
          shippingAddress: address,
          items: cartItems
        };

        const orderRes = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });

        const orderData = await orderRes.json();
        if (!orderData.success) {
          showToast(orderData.message || 'Failed to place order.');
          submitBtn.disabled = false;
          submitBtn.textContent = `Proceed to Payment — ₹${total.toLocaleString('en-IN')}`;
          return;
        }

        const orderId = orderData.order.id;

        // 2. Load Razorpay SDK
        const sdkLoaded = await loadRazorpaySDK();
        if (!sdkLoaded) {
          showToast('Failed to load payment gateway. Please check connection.');
          submitBtn.disabled = false;
          submitBtn.textContent = `Proceed to Payment — ₹${total.toLocaleString('en-IN')}`;
          return;
        }

        // 3. Create Razorpay Payment Order on backend
        const payOrderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        });

        const payOrderData = await payOrderRes.json();
        if (!payOrderData.success) {
          showToast(payOrderData.message || 'Failed to initialize payment.');
          submitBtn.disabled = false;
          submitBtn.textContent = `Proceed to Payment — ₹${total.toLocaleString('en-IN')}`;
          return;
        }

        // 4. Trigger Razorpay Checkout
        if (payOrderData.mock) {
          showToast('Mock Payment: Approving transaction...');
          setTimeout(async () => {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: payOrderData.order.id,
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                mock: true
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              closeCheckout();
              localStorage.removeItem('tri_cart');
              cartItems = [];
              syncCartUI();
              showSuccessScreen(orderId);
            } else {
              showToast('Mock payment verification failed.');
              submitBtn.disabled = false;
              submitBtn.textContent = `Proceed to Payment — ₹${total.toLocaleString('en-IN')}`;
            }
          }, 1500);
        } else {
          // Real Razorpay Checkout Modal
          const options = {
            key: payOrderData.keyId,
            amount: payOrderData.order.amount,
            currency: payOrderData.order.currency,
            name: 'TRI Performance',
            description: 'True Whey + BCAA + Pre-Workout Try Pack',
            order_id: payOrderData.order.id,
            handler: async (response) => {
              submitBtn.textContent = 'Verifying Payment...';
              
              try {
                const verifyRes = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });

                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                  closeCheckout();
                  localStorage.removeItem('tri_cart');
                  cartItems = [];
                  syncCartUI();
                  showSuccessScreen(orderId);
                } else {
                  showToast('Payment verification failed.');
                  submitBtn.disabled = false;
                  submitBtn.textContent = `Proceed to Payment`;
                }
              } catch (err) {
                console.error(err);
                showToast('Failed to verify payment with server.');
                submitBtn.disabled = false;
              }
            },
            prefill: {
              name: name,
              email: email
            },
            theme: {
              color: '#0b0b0c'
            }
          };

          const rzp1 = new window.Razorpay(options);
          rzp1.open();
          submitBtn.disabled = false;
          submitBtn.textContent = `Proceed to Payment — ₹${total.toLocaleString('en-IN')}`;
        }

      } catch (err) {
        console.error(err);
        showToast('Server connection failed. Try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = `Proceed to Payment — ₹${total.toLocaleString('en-IN')}`;
      }
    });
  };

  const showSuccessScreen = (orderId) => {
    const successWrap = document.createElement('div');
    successWrap.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(11, 11, 12, 0.95);
      backdrop-filter: blur(12px);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    document.body.appendChild(successWrap);

    successWrap.innerHTML = `
      <div style="
        background: #121214;
        border: 1px solid #e6a2a4;
        border-radius: 16px;
        padding: 40px 32px;
        width: 90%;
        max-width: 440px;
        text-align: center;
        box-shadow: 0 12px 40px rgba(230,162,164,0.15);
        color: #f5f5f7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="font-size: 56px; margin-bottom: 20px;">🎉</div>
        <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 800; color: #ffffff;">Order Placed!</h2>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1a6; line-height: 1.5;">
          Thank you for fueling with TRI. Your payment was verified, and your order reference is <strong style="color: #ffffff;">#TRI-ORD-${orderId}</strong>. We have emailed your invoice receipt.
        </p>
        <button id="success-done-btn" style="
          background: #e6a2a4; color: #0b0b0c; border: none; border-radius: 8px; padding: 12px 32px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
        ">
          Back to Shop
        </button>
      </div>
    `;

    document.getElementById('success-done-btn').addEventListener('click', () => {
      successWrap.remove();
      window.location.href = 'shop.html';
    });
  };

  // Add click listener globally for checkouts
  document.addEventListener('click', e => {
    if (e.target.closest('.cp-checkout') || e.target.closest('.cart-checkout-btn') || e.target.closest('.po-checkout-btn') || e.target.id === 'po-checkout') {
      e.preventDefault();
      e.stopPropagation();
      openCheckoutModal();
    }
  });

  const openCart = () => {
    document.getElementById('cart-overlay')?.classList.add('open');
    document.getElementById('cart-panel')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeCart = () => {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-panel')?.classList.remove('open');
    document.body.style.overflow = '';
  };
  window.openCart  = openCart;
  window.closeCart = closeCart;

  document.querySelector('#cart-icon-btn, .nav-cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-add-cart]');
    if (!btn) return;
    triAddToCart(
      btn.dataset.name || 'TRI Product',
      btn.dataset.price,
      btn.dataset.image,
      btn.dataset.variant
    );
  });

  loadCart();

  /* ════════════════════════════════════════
     TOAST
  ════════════════════════════════════════ */
  const toastEl = document.getElementById('tri-toast');
  let toastTimer;
  const showToast = msg => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  };
  window.showToast = showToast;

  /* ════════════════════════════════════════
     CHATBOT
  ════════════════════════════════════════ */
  const cbBtn   = document.getElementById('chatbot-btn');
  const cbPanel = document.getElementById('chatbot-panel');
  const cbClose = document.getElementById('chatbot-close');
  const cbMsgs  = document.getElementById('cb-messages');
  const cbInput = document.getElementById('cb-input');
  const cbSend  = document.getElementById('cb-send');

  const cbTree = [
    { triggers: ['fusion', 'pack', '599', '1099', 'starter', 'which', 'start', 'trial'],
      reply: `The Fusion Pack has all three: Protein, BCAA, and Pre-Workout. It's designed to be used together across a 9-day window — the fastest way to understand how your body actually responds to clean nutrition. It is currently available for ₹599.`,
      cta: { text: 'Get Fusion Pack', href: 'shop.html' } },
    { triggers: ['protein', 'whey', 'muscle', 'synthesis'],
      reply: `True Whey is grass-fed concentrate — 24.5g protein per serving. We add digestive enzymes for maximum absorption without bloat. Note: True Whey is currently available exclusively as part of the TRI Fusion Pack.`,
      cta: { text: 'Shop Fusion Pack', href: 'shop.html' } },
    { triggers: ['bcaa', 'amino', 'recovery', 'soreness'],
      reply: `TRI BCAA uses a 2:1:1 leucine ratio — exactly what muscle repair pathways respond to. 3g electrolytes per serve. Note: TRI BCAA is currently available exclusively as part of the TRI Fusion Pack.`,
      cta: { text: 'Shop Fusion Pack', href: 'shop.html' } },
    { triggers: ['pre-workout', 'pre workout', 'drake', 'pump', 'energy', 'caffeine'],
      reply: `TRI Pump Drake uses 6g Citrulline Malate, 3.2g Beta-Alanine, and 200mg natural caffeine for explosive, crash-free energy. Note: TRI Pump Drake is currently available exclusively as part of the TRI Fusion Pack.`,
      cta: { text: 'Shop Fusion Pack', href: 'shop.html' } },
    { triggers: ['lab', 'report', 'batch', 'verify', 'test', 'certificate', 'proof'],
      reply: `Every batch goes through 4 stages — raw material, in-process, finished product, and heavy metal/microbial. Every result is published. Go to Lab Reports to verify yours.`,
      cta: { text: 'View Lab Reports', href: 'lab-reports.html' } },
    { triggers: ['gut', 'bloat', 'digest', 'stomach', 'sensitive'],
      reply: `We formulate with digestive enzyme blends, zero artificial sweeteners, and test every batch for microbial contamination. If your gut is compromised, your absorption is compromised.`,
      cta: { text: 'Read the Inside', href: 'inside.html' } },
    { triggers: ['ingredient', 'formula', 'what is in', 'blend', 'proprietary'],
      reply: `No proprietary blends. Every ingredient is listed with its exact dose on the label. The Inside page breaks down every ingredient, dose, and mechanism of action.`,
      cta: { text: 'See Every Ingredient', href: 'inside.html' } },
    { triggers: ['ship', 'deliver', 'order', 'track', 'return', 'refund'],
      reply: `For orders and delivery, reach us at hello@atriwellness.com. We reply within 24 hours on business days.`,
      cta: { text: 'Contact Us', href: 'contact.html' } },
  ];

  function cbReply(msg) {
    const low = msg.toLowerCase();
    const match = cbTree.find(t => t.triggers.some(w => low.includes(w)));
    const res = match || { reply: `I can help with product selection, ingredient questions, or lab verification. What would you like to know?`, cta: null };
    setTimeout(() => {
      addCbMsg(res.reply, 'bot');
      if (res.cta) {
        setTimeout(() => addCbCta(res.cta.text, res.cta.href), 180);
      }
    }, 650);
  }

  function addCbMsg(text, role) {
    if (!cbMsgs) return;
    const d = document.createElement('div');
    d.className = 'cb-msg ' + role;
    d.textContent = text;
    cbMsgs.appendChild(d);
    cbMsgs.scrollTop = cbMsgs.scrollHeight;
  }

  function addCbCta(text, href) {
    if (!cbMsgs) return;
    const d = document.createElement('div');
    d.style.cssText = 'margin:4px 0 8px;';
    d.innerHTML = `<a href="${href}" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:20px;background:var(--gold);color:#fff;font-family:var(--font-label);font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;transition:background .2s;">${text} →</a>`;
    cbMsgs.appendChild(d);
    cbMsgs.scrollTop = cbMsgs.scrollHeight;
  }

  let cbOpened = false;
  cbBtn?.addEventListener('click', () => {
    const open = cbPanel?.classList.toggle('open');
    if (open && !cbOpened) {
      cbOpened = true;
      setTimeout(() => {
        if (cbMsgs && cbMsgs.children.length === 0) {
          addCbMsg(`What's your performance goal today?`, 'bot');
        }
        const qr = cbPanel?.querySelector('.cb-quick-replies');
        if (qr) {
          qr.querySelectorAll('.cb-quick').forEach(btn => {
            btn.addEventListener('click', () => {
              const msg = btn.textContent;
              qr.style.display = 'none';
              addCbMsg(msg, 'user');
              cbReply(msg);
            });
          });
        }
      }, 300);
    }
  });
  cbClose?.addEventListener('click', () => cbPanel?.classList.remove('open'));

  const doSend = () => {
    const msg = cbInput?.value?.trim();
    if (!msg) return;
    cbPanel?.querySelector('.cb-quick-replies')?.remove?.();
    addCbMsg(msg, 'user');
    cbInput.value = '';
    cbReply(msg);
  };
  cbSend?.addEventListener('click', doSend);
  cbInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });

  /* ════════════════════════════════════════
     NEWSLETTER FORMS
  ════════════════════════════════════════ */
  document.querySelectorAll('.newsletter-form, .subscribe-form').forEach(form => {
    if (form._triWired) return;
    form._triWired = true;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Enter a valid email address');
        return;
      }
      const btn = form.querySelector('button[type="submit"]') || form.querySelector('button');
      const orig = btn?.textContent;
      if (btn) { btn.textContent = '...'; btn.disabled = true; }
      try {
        // FIXED: was /api/subscribe, correct is /api/newsletter/subscribe
        await fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      } catch (_) {}
      if (input) input.value = '';
      if (btn) {
        btn.textContent = '✓ You\'re in!';
        btn.style.background = '#22c55e';
      }
      showToast('Welcome to TRI 🌿');
      setTimeout(() => {
        if (btn) { btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }
      }, 3500);
    });
  });

  /* ════════════════════════════════════════
     CONTACT FORM
  ════════════════════════════════════════ */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm));
      const btn = contactForm.querySelector('[type="submit"]');
      const orig = btn?.textContent;
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
      try {
        await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      } catch (_) {}
      contactForm.reset();
      if (btn) { btn.textContent = '✓ Received'; btn.style.background = '#22c55e'; }
      showToast('Message received. We reply within 24h 💌');
      setTimeout(() => {
        if (btn) { btn.textContent = orig; btn.style.background = ''; btn.disabled = false; }
      }, 4000);
    });
  }

  /* ════════════════════════════════════════
     PRODUCT CARD HOVER TILT
  ════════════════════════════════════════ */
  document.querySelectorAll('.shop-product-card, .product-card, .breakdown-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s var(--ease)';
      card.style.transform = '';
      setTimeout(() => card.style.transition = '', 520);
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.15s ease';
    });
  });

  runEntranceAnimations();

})();
