/* =============================================================
   TRI — ULTRA PREMIUM MOTION ENGINE v3.0
   Minimal. GPU-only. Zero DOM thrashing. 60fps mobile.
   ============================================================= */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const isMobile = () => window.innerWidth <= 767;

  /* ════════════════════════════════════════
     1. RIPPLE — on tap/click, GPU composited
  ════════════════════════════════════════ */
  function initRipple() {
    // Inject keyframe once
    const s = document.createElement('style');
    s.textContent = `@keyframes _triRipple{to{transform:scale(2.5);opacity:0}}`;
    document.head.appendChild(s);

    const sel = [
      '.btn-primary', '.nav-cta', '.product-card-cta',
      '.cart-checkout-btn', '.cp-checkout', '[data-add-cart]',
      '.mm-cta', '.mm-shop-cta', '.find-btn',
    ].join(',');

    document.addEventListener('pointerdown', function(e) {
      const btn = e.target.closest(sel);
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top  - size / 2;

      const rip = document.createElement('span');
      rip.style.cssText = [
        'position:absolute',
        `left:${x}px`,
        `top:${y}px`,
        `width:${size}px`,
        `height:${size}px`,
        'border-radius:50%',
        'background:rgba(255,255,255,0.28)',
        'transform:scale(0)',
        'opacity:1',
        'pointer-events:none',
        'z-index:9',
        `animation:_triRipple 0.5s cubic-bezier(0.16,1,0.3,1) forwards`,
      ].join(';');

      btn.appendChild(rip);
      setTimeout(() => rip.remove(), 520);
    }, { passive: true });
  }

  /* ════════════════════════════════════════
     2. SMART NAV — hide/show on scroll
     Uses transform only, batched in rAF.
  ════════════════════════════════════════ */
  function initSmartNav() {
    const nav = document.getElementById('tri-nav') || document.getElementById('nav');
    if (!nav) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;

        // Scrolled class for glass effect
        nav.classList.toggle('scrolled', y > 40);

        ticking = false;
      });
    }, { passive: true });
  }

  /* ════════════════════════════════════════
     3. SCROLL REVEAL — batch with single observer
     Only opacity + translateY. No scale.
  ════════════════════════════════════════ */
  function initScrollReveal() {
    const sel = [
      '.reveal',
      '.product-card', '.shop-product-card',
      '.power-card', '.test-card',
      '.trust-item', '.breakdown-card',
    ].join(',');

    const els = document.querySelectorAll(sel);

    // Set initial state only for elements below the fold
    const vh = window.innerHeight;
    els.forEach(el => {
      const top = el.getBoundingClientRect().top;
      if (top > vh) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s var(--smooth, cubic-bezier(0.16,1,0.3,1)), transform 0.5s var(--smooth, cubic-bezier(0.16,1,0.3,1))';
      }
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('visible', 'in');
        el.style.opacity = '1';
        el.style.transform = 'none';
        obs.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

    els.forEach(el => obs.observe(el));
  }

  /* ════════════════════════════════════════
     4. CARD STAGGER — grid children fade in
     Lightweight: only on first intersection.
  ════════════════════════════════════════ */
  function initCardStagger() {
    const grids = document.querySelectorAll(
      '.products-grid, .shop-products-grid, .powers-grid, .tests-grid'
    );

    const gridObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const cards = Array.from(entry.target.children);
        cards.forEach((card, i) => {
          // Only animate cards that are below fold
          if (card.getBoundingClientRect().top > window.innerHeight * 0.9) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(18px)';
            card.style.transition = `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`;
            // Trigger in next frame
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'none';
              });
            });
          }
        });
        gridObs.unobserve(entry.target);
      });
    }, { threshold: 0.05 });

    grids.forEach(g => gridObs.observe(g));
  }

  /* ════════════════════════════════════════
     5. CART BADGE POP — patch triAddToCart
  ════════════════════════════════════════ */
  function initCartBadgePop() {
    const orig = window.triAddToCart;
    if (!orig) return;
    window.triAddToCart = function(...a) {
      orig(...a);
      document.querySelectorAll('.cart-badge, .cart-count, #cart-count').forEach(b => {
        b.style.animation = 'none';
        // Force reflow
        void b.offsetWidth;
        b.style.animation = '';
        b.classList.add('show', 'visible');
      });
    };
  }

  /* ════════════════════════════════════════
     6. MAGNETIC BUTTONS — desktop only
     Subtle cursor attraction, max 6px pull.
  ════════════════════════════════════════ */
  function initMagnet() {
    if (isMobile()) return;

    const magSel = '.nav-cta, .btn-primary';
    document.querySelectorAll(magSel).forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 10;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 10;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s var(--spring, cubic-bezier(0.34,1.56,0.64,1))';
        setTimeout(() => btn.style.transition = '', 420);
      });
    });
  }

  /* ════════════════════════════════════════
     7. CARD TILT — desktop 3D tilt, rAF-batched
  ════════════════════════════════════════ */
  function initCardTilt() {
    if (isMobile()) return;

    document.querySelectorAll('.product-card, .shop-product-card').forEach(card => {
      let raf;
      card.addEventListener('mousemove', e => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width  - 0.5;
          const y = (e.clientY - r.top)  / r.height - 0.5;
          card.style.transform = `perspective(800px) translateY(-6px) rotateX(${y * -5}deg) rotateY(${x * 5}deg)`;
        });
      });
      card.addEventListener('mouseleave', () => {
        cancelAnimationFrame(raf);
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
        setTimeout(() => card.style.transition = '', 520);
      });
    });
  }

  /* ════════════════════════════════════════
     INIT — all in one DOMContentLoaded
  ════════════════════════════════════════ */
  function init() {
    initRipple();
    initSmartNav();
    initScrollReveal();
    initCardStagger();
    initCartBadgePop();
    initMagnet();
    initCardTilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
