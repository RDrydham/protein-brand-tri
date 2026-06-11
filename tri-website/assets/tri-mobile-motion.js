/* =============================================================
   TRI — MOBILE MOTION ENGINE v2.0
   Touch-first. Always visible. 60fps GPU only.
   ============================================================= */

(function () {
  'use strict';

  const isMobile = () => window.innerWidth <= 767 || ('ontouchstart' in window);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isMobile() || prefersReducedMotion) return; // This entire script is mobile-only

  /* ════════════════════════════════════════════════════
     HELPER: inject styles if not already added
  ═════════════════════════════════════════════════════= */
  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════
     1. SCROLL PROGRESS BAR in the nav
  ═════════════════════════════════════════════════════= */
  function initScrollProgress() {
    const nav = document.getElementById('tri-nav') || document.getElementById('nav');
    if (!nav) return;

    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      nav.style.setProperty('--scroll-progress', `${pct}%`);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ════════════════════════════════════════════════════
     2. RIPPLE ON TOUCH — all primary buttons
  ═════════════════════════════════════════════════════= */
  function initTouchRipple() {
    injectStyle('tri-mob-ripple', `
      @keyframes mobRipple {
        0%   { transform: scale(0); opacity: 0.6; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      .tri-mob-ripple-el {
        position: absolute;
        border-radius: 50%;
        transform: scale(0);
        pointer-events: none;
        z-index: 99;
        animation: mobRipple 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
      }
    `);

    const sels = [
      '.btn-primary', '.nav-cta', '.product-card-cta',
      '.cart-checkout-btn', '.cp-checkout', '[data-add-cart]',
      '.mm-cta', '.mm-shop-cta', '.find-btn', '.nl-btn',
    ];

    document.querySelectorAll(sels.join(',')).forEach(btn => {
      btn.addEventListener('touchstart', function(e) {
        const t = e.touches[0];
        const r = this.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 2;
        const x = t.clientX - r.left - size / 2;
        const y = t.clientY - r.top  - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'tri-mob-ripple-el';
        ripple.style.cssText = `
          left: ${x}px;
          top: ${y}px;
          width: ${size}px;
          height: ${size}px;
          background: rgba(255,255,255,0.35);
        `;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 580);
      }, { passive: true });
    });
  }

  /* ════════════════════════════════════════════════════
     3. SCROLL-REVEAL — dramatic entrance for all key elements
  ═════════════════════════════════════════════════════= */
  function initMobileScrollReveal() {
    const revealSels = [
      'h1', 'h2', 'h3',
      '.section-eyebrow', '.hero-eyebrow',
      '.section-h2', '.hero-heading',
      '.product-card', '.shop-product-card',
      '.power-card', '.breakdown-card',
      '.trust-item', '.test-card',
      '.hero-body', '.hero-cta',
      '.section-sub', '.find-card',
      '.table-card', '.breakdown-grid > *',
    ];

    // Apply base hidden state
    document.querySelectorAll(revealSels.join(',')).forEach(el => {
      if (el.dataset.mobRevealDone) return;
      el.dataset.mobRevealDone = '1';
      el.classList.add('mob-reveal-init');
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.remove('mob-reveal-init');

        // Add appropriate reveal class
        if (el.matches('.product-card, .shop-product-card')) {
          el.classList.add('mob-revealed');
        } else if (el.matches('.power-card')) {
          el.classList.add('mob-revealed');
        } else if (el.matches('.section-eyebrow, .hero-eyebrow')) {
          el.classList.add('mob-revealed');
        } else if (el.matches('h1,h2,h3,.section-h2,.hero-heading')) {
          el.classList.add('mob-revealed');
        } else {
          // Generic reveal for everything else
          el.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) scale(1)';
        }

        obs.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll(revealSels.join(',')).forEach(el => obs.observe(el));
  }

  /* ════════════════════════════════════════════════════
     4. STAGGER CARD GRIDS — sequential entrance
  ═════════════════════════════════════════════════════= */
  function initMobileCardStagger() {
    const grids = [
      '.products-grid',
      '.shop-products-grid',
      '.powers-grid',
      '.tests-grid',
      '.trust-strip',
      '.breakdown-grid',
    ];

    grids.forEach(sel => {
      const grid = document.querySelector(sel);
      if (!grid) return;

      let fired = false;
      const obs = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting || fired) return;
        fired = true;

        const cards = grid.children;
        Array.from(cards).forEach((card, i) => {
          card.style.opacity = '0';
          card.style.transform = 'translateY(24px) scale(0.96)';
          setTimeout(() => {
            card.style.transition = `opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)`;
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
          }, i * 90);
        });

        obs.unobserve(grid);
      }, { threshold: 0.06 });

      obs.observe(grid);
    });
  }

  /* ════════════════════════════════════════════════════
     5. TAP FEEDBACK — scale + opacity on all touchables
  ═════════════════════════════════════════════════════= */
  function initTapFeedback() {
    injectStyle('tri-mob-tap', `
      .tri-tapping {
        opacity: 0.82 !important;
        transform: scale(0.94) !important;
        transition: opacity 0.09s ease, transform 0.09s ease !important;
      }
      .tri-tap-release {
        opacity: 1 !important;
        transform: scale(1) !important;
        transition: opacity 0.32s cubic-bezier(0.34,1.56,0.64,1), transform 0.32s cubic-bezier(0.34,1.56,0.64,1) !important;
      }
    `);

    const tapEls = document.querySelectorAll(
      '.nav-logo, .nav-cart, .nav-cart-btn, .nav-ham, .nav-hamburger, ' +
      '.footer-social, .trust-item, .nav-icon-btn, ' +
      '.mm-close, #cp-close, #mm-close, ' +
      '.mm-nav-link, .product-card, .shop-product-card'
    );

    tapEls.forEach(el => {
      el.addEventListener('touchstart', function() {
        this.classList.add('tri-tapping');
        this.classList.remove('tri-tap-release');
      }, { passive: true });

      const release = function() {
        this.classList.remove('tri-tapping');
        this.classList.add('tri-tap-release');
        setTimeout(() => this.classList.remove('tri-tap-release'), 380);
      };
      el.addEventListener('touchend', release, { passive: true });
      el.addEventListener('touchcancel', release, { passive: true });
    });
  }

  /* ════════════════════════════════════════════════════
     6. ICON PARTICLE BURST on cart-add
  ═════════════════════════════════════════════════════= */
  function initAddToCartBurst() {
    injectStyle('tri-mob-burst', `
      @keyframes particleBurst {
        0%   { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
      }
      .tri-particle {
        position: fixed;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        animation: particleBurst 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
      }
    `);

    const colors = ['#bc8133','#e6a2a4','#C8742A','#FBF9F6','#d4973f'];

    document.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('touchend', function(e) {
        const t = e.changedTouches[0];
        const cx = t.clientX;
        const cy = t.clientY;

        for (let i = 0; i < 8; i++) {
          const p = document.createElement('div');
          p.className = 'tri-particle';

          const angle = (i / 8) * Math.PI * 2;
          const dist  = 40 + Math.random() * 30;
          const dx    = Math.cos(angle) * dist;
          const dy    = Math.sin(angle) * dist;

          p.style.cssText = `
            left: ${cx}px;
            top:  ${cy}px;
            background: ${colors[i % colors.length]};
            --dx: ${dx}px;
            --dy: ${dy}px;
          `;
          document.body.appendChild(p);
          setTimeout(() => p.remove(), 700);
        }
      }, { passive: true });
    });
  }

  /* ════════════════════════════════════════════════════
     7. NAV CART BOUNCE on item add
  ═════════════════════════════════════════════════════= */
  function initCartBounce() {
    injectStyle('tri-mob-cart', `
      @keyframes mobCartBounce {
        0%   { transform: scale(1) rotate(0deg); }
        20%  { transform: scale(1.35) rotate(-12deg); }
        45%  { transform: scale(0.88) rotate(8deg); }
        65%  { transform: scale(1.14) rotate(-4deg); }
        80%  { transform: scale(0.96) rotate(2deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
    `);

    document.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('touchend', () => {
        const cartIcons = document.querySelectorAll('.nav-cart, .nav-cart-btn, .nav-icon-btn svg[class*="cart"]');
        cartIcons.forEach(icon => {
          icon.style.animation = 'none';
          icon.offsetHeight; // reflow
          icon.style.animation = 'mobCartBounce 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards';
          setTimeout(() => icon.style.animation = '', 600);
        });
      }, { passive: true });
    });
  }

  /* ════════════════════════════════════════════════════
     8. INTERSECTION: Add class to sections for CSS targeting
  ═════════════════════════════════════════════════════= */
  function initSectionClasses() {
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        e.target.classList.toggle('mob-in-view', e.isIntersecting);
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('section, [id]').forEach(s => sectionObs.observe(s));
  }

  /* ════════════════════════════════════════════════════
     9. SMART NAV: Hide/show on scroll direction
  ═════════════════════════════════════════════════════= */
  function initSmartNav() {
    const nav = document.getElementById('tri-nav') || document.getElementById('nav');
    if (!nav) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ════════════════════════════════════════════════════
     10. HERO ENTRANCE: Dramatic sequence on page load
  ═════════════════════════════════════════════════════= */
  function initHeroEntrance() {
    injectStyle('tri-mob-hero', `
      @keyframes heroFadeUp {
        0%   { opacity: 0; transform: translateY(30px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes heroScaleIn {
        0%   { opacity: 0; transform: scale(0.88); }
        60%  { opacity: 1; transform: scale(1.03); }
        100% { opacity: 1; transform: scale(1); }
      }
      .tri-hero-seq-1 { animation: heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
      .tri-hero-seq-2 { animation: heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
      .tri-hero-seq-3 { animation: heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
      .tri-hero-seq-4 { animation: heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.46s both; }
      .tri-hero-seq-img { animation: heroScaleIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; }
    `);

    const hero = document.getElementById('hero');
    if (!hero) return;

    const heroTargets = [
      ['.hero-eyebrow, .hero-pill',            'tri-hero-seq-1'],
      ['.hero-heading, .hero-title, #hero h1', 'tri-hero-seq-2'],
      ['.hero-body, .hero-sub',                'tri-hero-seq-3'],
      ['.hero-cta, .hero-actions, .mm-cta',    'tri-hero-seq-4'],
      ['.hero-product-wrap, .hero-product, .hero-img-wrap', 'tri-hero-seq-img'],
    ];

    heroTargets.forEach(([sel, cls]) => {
      hero.querySelectorAll(sel).forEach(el => el.classList.add(cls));
    });
  }

  /* ════════════════════════════════════════════════════
     11. CHATBOT: Extra pulse ring on mobile
  ═════════════════════════════════════════════════════= */
  function initChatbotMobilePulse() {
    const btn = document.getElementById('chatbot-btn');
    if (!btn) return;

    // Ensure z-index allows pseudo-elements to show
    btn.style.zIndex = btn.style.zIndex || '99';

    // Ensure button has position set for pseudo-element targeting
    const style = window.getComputedStyle(btn);
    if (style.position === 'static') {
      btn.style.position = 'relative';
    }

    // Tap: extra dramatic bounce
    btn.addEventListener('touchstart', () => {
      btn.style.animation = 'none';
      btn.offsetHeight;
      btn.style.animation = '';
    }, { passive: true });
  }

  /* ════════════════════════════════════════════════════
     INIT
  ═════════════════════════════════════════════════════= */
  function init() {
    initScrollProgress();
    initTouchRipple();
    initMobileScrollReveal();
    initMobileCardStagger();
    initTapFeedback();
    initAddToCartBurst();
    initCartBounce();
    initSectionClasses();
    initSmartNav();
    initHeroEntrance();
    initChatbotMobilePulse();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 30));
  } else {
    setTimeout(init, 30);
  }

})();
