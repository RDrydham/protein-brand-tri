/* =============================================================
   TRI — The Real Inside | Shared JavaScript v5.0
   Clean, warm-theme compatible. No dark universe engine.
   ============================================================= */

(function () {
  'use strict';

  /* ════════════════════════════════════════
     LOADER
  ════════════════════════════════════════ */
  const loader = document.getElementById('tri-loader') || document.getElementById('loader');
  if (loader) {
    document.body.style.overflow = 'hidden';
    let pct = 0;
    const fill = loader.querySelector('.l-fill');
    const pctEl = loader.querySelector('.l-pct');
    const logoEl = loader.querySelector('.l-logo');
    if (logoEl) {
      logoEl.style.transition = 'opacity 0.4s ease';
      setTimeout(() => logoEl.style.opacity = '1', 100);
    }
    const tick = setInterval(() => {
      pct = Math.min(pct + Math.random() * 18 + 8, 100);
      if (fill) fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = Math.floor(pct) + '%';
      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          loader.style.transition = 'opacity 0.5s ease';
          loader.style.opacity = '0';
          setTimeout(() => {
            loader.style.display = 'none';
            document.body.style.overflow = '';
            runEntranceAnimations();
          }, 520);
        }, 200);
      }
    }, 55);
  } else {
    runEntranceAnimations();
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
  try {
    cartItems = JSON.parse(localStorage.getItem('tri_cart') || '[]');
  } catch(e) {
    cartItems = [];
  }
  // Keep the cart empty if it was empty, instead of auto-adding default items.

  const syncCart = () => {
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
                <button onclick="triRemoveFromCart(${i})" style="background:none;border:none;font-size:11px;color:var(--muted-text);cursor:pointer;font-family:var(--font-label);letter-spacing:0.05em;">REMOVE</button>
              </div>
            </div>
          </div>`).join('');
      }
    }
    try { localStorage.setItem('tri_cart', JSON.stringify(cartItems)); } catch(e) {}
  };

  window.triAddToCart = (name, price, image, variant) => {
    const ex = cartItems.find(i => i.name === name && i.variant === variant);
    if (ex) ex.qty++;
    else cartItems.push({ name, price: parseInt(price) || 0, image: image || 'assets/hero_product.png', variant, qty: 1 });
    syncCart();
    showToast('Added to cart ✓');
    openCart();
  };

  window.triRemoveFromCart = (idx) => {
    cartItems.splice(idx, 1);
    syncCart();
  };

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

  syncCart();

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
        await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
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

})();
