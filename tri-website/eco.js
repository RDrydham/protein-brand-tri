(function () {
  'use strict';
  if (!document.getElementById('eco-canvas')) return;

  /* ── Canvas ── */
  const CV = document.getElementById('eco-canvas');
  const CTX = CV.getContext('2d');
  const ecoLeft = document.querySelector('.eco-left');
  let VW = 0, VH = 0;

  function resizeCanvas() {
    const r = ecoLeft.getBoundingClientRect();
    VW = CV.width  = r.width  || ecoLeft.offsetWidth  || 400;
    VH = CV.height = r.height || ecoLeft.offsetHeight || 600;
  }

  /* ── Palette: warm pink/rose theme ── */
  const PAL = [
    { r: 200, g: 110, b: 112 }, // deep rose   – Protein
    { r: 130, g: 180, b: 120 }, // sage        – BCAA
    { r: 195, g: 160, b: 100 }, // warm gold   – Pre-Workout
  ];

  /* ── Mouse repulsion ── */
  let mouse = { x: -999, y: -999, on: false };
  ecoLeft.addEventListener('mousemove', e => {
    const r = ecoLeft.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.on = true;
  });
  ecoLeft.addEventListener('mouseleave', () => { mouse.on = false; });

  /* ═══════════════════ PARTICLE ═══════════════════ */
  const N = 240, PG = 80;

  class Pt {
    constructor(g) {
      this.g = g;
      this.r   = 0.9 + Math.random() * 1.6;
      this.bA  = 0.30 + Math.random() * 0.40;
      this.alp = this.bA;
      this.da  = Math.random() * Math.PI * 2;
      this.ds  = 0.006 + Math.random() * 0.007;
      this.dax = 16 + Math.random() * 24;
      this.day = 10 + Math.random() * 16;
      this.dp  = Math.random() * Math.PI * 2;
      this.x = this.y = this.hx = this.hy = 0;
      this.t1x = this.t1y = this.t2x = this.t2y = 0;
    }

    build() {
      const cx = VW * (this.g === 0 ? 0.24 : this.g === 1 ? 0.50 : 0.76);
      const cy = VH * 0.50;
      const s  = Math.min(VW, VH) * 0.14;
      this.hx = cx + (Math.random() - 0.5) * s * 2.2;
      this.hy = cy + (Math.random() - 0.5) * s * 1.6;
      if (!this.x) {
        this.x = this.hx + (Math.random() - 0.5) * 50;
        this.y = this.hy + (Math.random() - 0.5) * 50;
      }
      const ta = Math.random() * Math.PI * 2;
      const tr = Math.random() * Math.min(VW, VH) * 0.18;
      this.t1x = VW / 2 + Math.cos(ta) * tr;
      this.t1y = VH / 2 + Math.sin(ta) * tr * 0.82;
      const sw = Math.min(VW * 0.10, 120);
      const gp = sw * 1.9;
      const sx = VW / 2, sy = VH / 2;
      const zx = this.g === 0 ? sx - gp : this.g === 1 ? sx : sx + gp;
      this.t2x = zx - sw / 2 + 8 + Math.random() * (sw - 16);
      this.t2y = sy - sw * 0.72 + 8 + Math.random() * (sw * 1.44 - 16);
    }

    tick(prog, fr) {
      if (mouse.on) {
        const dx = this.x - mouse.x, dy = this.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 6000) {
          const f = (1 - Math.sqrt(d2) / 78) * 1.4;
          this.x += dx * f * 0.038;
          this.y += dy * f * 0.038;
        }
      }
      let tx, ty;
      if (prog < 0.48) {
        const t = eio(prog / 0.48);
        tx = lerp(this.hx, this.t1x, t);
        ty = lerp(this.hy, this.t1y, t);
      } else {
        const t = eio((prog - 0.48) / 0.52);
        tx = lerp(this.t1x, this.t2x, t);
        ty = lerp(this.t1y, this.t2y, t);
      }
      if (prog < 0.15) {
        this.da += this.ds;
        tx += Math.cos(this.da + this.dp) * this.dax * (1 - prog / 0.15);
        ty += Math.sin(this.da * 0.65 + this.dp) * this.day * (1 - prog / 0.15);
      }
      this.x += (tx - this.x) * 0.12;
      this.y += (ty - this.y) * 0.12;
      if (prog < 0.32) this.alp = this.bA + Math.sin(fr * 0.017 + this.dp) * 0.09;
    }

    draw(as) {
      const a = Math.max(0, Math.min(1, this.alp * as));
      if (a < 0.01) return;
      const c = PAL[this.g];
      CTX.beginPath();
      CTX.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      CTX.fillStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
      CTX.fill();
    }
  }

  function eio(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ramp(p, a, b, c, d) {
    if (p <= a) return 0;
    if (p <= b) return (p - a) / (b - a);
    if (p <= c) return 1;
    if (p <= d) return 1 - (p - c) / (d - c);
    return 0;
  }
  function rampIn(p, a, b) {
    if (p <= a) return 0;
    if (p <= b) return (p - a) / (b - a);
    return 1;
  }

  let pts = [];
  function buildPts() {
    pts = [];
    for (let i = 0; i < N; i++) {
      const p = new Pt(Math.min(Math.floor(i / PG), 2));
      p.build();
      pts.push(p);
    }
  }

  function drawBonds(prog) {
    const bA = prog < 0.44 ? 1 : prog < 0.60 ? 1 - (prog - 0.44) / 0.16 : 0;
    if (bA < 0.01) return;
    const maxD = 54, base = 0.10 * bA;
    CTX.lineWidth = 0.4;
    for (let i = 0; i < pts.length; i += 2) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j += 2) {
        const b = pts[j];
        if (a.g !== b.g) continue;
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) {
          const fa = base * (1 - Math.sqrt(d2) / maxD);
          const c = PAL[a.g];
          CTX.strokeStyle = `rgba(${c.r},${c.g},${c.b},${fa})`;
          CTX.beginPath(); CTX.moveTo(a.x, a.y); CTX.lineTo(b.x, b.y); CTX.stroke();
        }
      }
    }
  }

  /* ── DOM refs ── */
  const stageEls  = [0, 1, 2].map(i => document.getElementById('ecoStage' + i));
  const dotEls    = [0, 1, 2].map(i => document.getElementById('ecoDot' + i));
  const cards     = [0, 1, 2].map(i => document.getElementById('ecoCard' + i));
  const sachetsEl = document.getElementById('eco-sachets');
  const triSVG    = document.getElementById('eco-triangle');
  const glowEl    = document.getElementById('eco-glow');
  const progFill  = document.getElementById('ecoProgressFill');

  /* ── Progress state ── */
  let targetProg = 0, smoothProg = 0, frame = 0, cardsShown = false, autoRAF = null;

  function applyProgress(p) {
    if (progFill) progFill.style.height = (p * 100) + '%';

    const ops = [
      ramp(p, 0, 0.06, 0.28, 0.40),
      ramp(p, 0.30, 0.42, 0.60, 0.72),
      rampIn(p, 0.62, 0.74),
    ];
    stageEls.forEach((el, i) => {
      if (!el) return;
      const o = ops[i];
      el.style.opacity   = o;
      el.style.transform = `translateY(calc(-50% + ${(1 - o) * 12}px))`;
      el.style.pointerEvents = o > 0.4 ? 'auto' : 'none';
    });

    const di = p < 0.44 ? 0 : p < 0.70 ? 1 : 2;
    dotEls.forEach((d, i) => { if (d) d.classList.toggle('on', i === di); });

    if (triSVG) triSVG.style.opacity = ramp(p, 0.36, 0.48, 0.60, 0.72);
    if (glowEl) glowEl.style.opacity = clamp(p * 2.5, 0, 0.85);

    const sacO = rampIn(p, 0.70, 0.82);
    if (sachetsEl) {
      sachetsEl.style.opacity = sacO;
      sachetsEl.style.pointerEvents = sacO > 0.4 ? 'auto' : 'none';
    }
    if (sacO > 0.45 && !cardsShown) {
      cardsShown = true;
      cards.forEach((c, i) => setTimeout(() => c && c.classList.add('in'), i * 90));
    }
    if (sacO < 0.1 && cardsShown) {
      cardsShown = false;
      cards.forEach(c => c && c.classList.remove('in'));
    }
  }

  /* ════════════════════════════════
     AUTO-PLAY: section enters view → play
     No sticky. No scroll lock. Ever.
  ════════════════════════════════ */
  function startPlay() {
    if (targetProg >= 1) return;
    if (autoRAF) cancelAnimationFrame(autoRAF);
    const sv = targetProg, st = performance.now();
    const dur = (1 - sv) * 2500; // 2.5s for full run (faster reveal)
    function adv(now) {
      targetProg = clamp(sv + (now - st) / dur, 0, 1);
      if (targetProg < 1) autoRAF = requestAnimationFrame(adv);
      else autoRAF = null;
    }
    autoRAF = requestAnimationFrame(adv);
  }

  function stopPlay() {
    // Once the animation has completed (sachet cards shown),
    // never reset — keep content visible for returning visitors.
    if (targetProg >= 0.82) return;
    if (autoRAF) cancelAnimationFrame(autoRAF);
    autoRAF = null;
    // Only reset if we haven't revealed much yet
    if (targetProg < 0.25) {
      const sv = targetProg, st = performance.now();
      function ret(now) {
        targetProg = clamp(sv - (now - st) / 500, 0, 1);
        if (targetProg > 0) autoRAF = requestAnimationFrame(ret);
        else autoRAF = null;
      }
      autoRAF = requestAnimationFrame(ret);
    }
  }

  let isLooping = false;
  function startLoop() {
    if (!isLooping) {
      isLooping = true;
      loop();
    }
  }

  function stopLoop() {
    // Keep loop running if content has been revealed
    if (targetProg >= 0.82) return;
    isLooping = false;
  }

  function setupIO() {
    const sec = document.getElementById('tri-ecosystem');
    if (!sec) return;
    new IntersectionObserver(entries => {
      const e = entries[0];
      if (e.isIntersecting) {
        startLoop();
        // Start as soon as ANY part of section is visible (not just 20%)
        startPlay();
      } else {
        stopPlay();
        stopLoop();
      }
    }, { threshold: [0, 0.1, 0.2, 0.5, 0.8, 1] }).observe(sec);
  }

  /* ── Render loop ── */
  function loop() {
    if (!isLooping) return;
    requestAnimationFrame(loop);
    frame++;
    smoothProg += (targetProg - smoothProg) * 0.055; // gentle lag = buttery

    CTX.fillStyle = '#FFF8F8';
    CTX.fillRect(0, 0, VW, VH);

    applyProgress(smoothProg);
    drawBonds(smoothProg);

    const ptA = smoothProg < 0.68 ? 1 : smoothProg < 0.88 ? 1 - (smoothProg - 0.68) / 0.20 : 0;
    pts.forEach(p => { p.tick(smoothProg, frame); p.draw(ptA); });
  }

  /* ── Card float ── */
  cards.forEach((c, i) => {
    if (c) c.style.animation = `ecoCardFloat ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite alternate`;
  });

  /* ── Boot ── */
  function boot() {
    resizeCanvas();
    buildPts();
    setupIO();
  }

  window.addEventListener('resize', () => { resizeCanvas(); pts.forEach(p => p.build()); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
