#!/usr/bin/env python3
"""
Mobile Rebuild Script for TRI index.html
Replaces lines 2464-2935 (0-indexed) = the entire MOBILE DOMINATION block
with a clean mobile-first rebuild. Desktop (lines 0-2463) is UNTOUCHED.
"""

import shutil, os

SRC = 'index.html'
BACKUP = 'index.html.mobile-bak'

# ── BACKUP ──────────────────────────────────────────────
shutil.copy2(SRC, BACKUP)
print(f'Backup created: {BACKUP}')

# ── READ ──────────────────────────────────────────────
with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# ── REPLACEMENT MOBILE CSS BLOCK ────────────────────────
MOBILE_CSS = r"""/* ═══════════════════════════════════════════════
   MOBILE RECOVERY — TRI INDEX.HTML
   All rules strictly inside @media blocks.
   Desktop is 100% untouched.
═══════════════════════════════════════════════ */

/* ── GPU-ONLY SCROLL REVEAL OVERRIDE ── */
@media(max-width:767px){
  .sr,.sr-left,.sr-right{
    opacity:0;
    transform:translateY(22px);
    transition:opacity .55s cubic-bezier(.16,1,.3,1),transform .55s cubic-bezier(.16,1,.3,1);
    will-change:opacity,transform;
  }
  .sr-left{transform:translateX(-22px)}
  .sr-right{transform:translateX(22px)}
  .sr.on,.sr-left.on,.sr-right.on{opacity:1;transform:none}

  /* Kill ALL heavy background animations on mobile */
  .le-orb,.le-orb-1,.le-orb-2,.le-orb-3,.le-streak{
    animation:none!important;filter:none!important;display:none!important;
  }
  .hero-swirl{display:none!important}
  .hero-pearl,.hero-orange,.hero-marble-sphere{animation:none!important}
  .fusion-box{animation:boxAppear .6s var(--ease-out) both!important}
  #hero::after{animation:none!important}
}

/* ══════════════════════════════════════════════════════
   MOBILE HERO — Dedicated section (zero desktop impact)
   #hero-m is display:none on desktop.
   #hero is display:none on mobile.
══════════════════════════════════════════════════════ */
#hero-m{display:none}

@media(max-width:767px){
  /* Hide desktop hero, show mobile hero */
  #hero{display:none!important}
  #hero-trust-bar{display:none!important}

  #hero-m{
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    min-height:100svh;
    background:linear-gradient(to bottom,#fee6e0 0%,#fee6e0 40%,#fbebe8 100%);
    position:relative;
    overflow:hidden;
    padding-top:76px;
    padding-bottom:0;
  }

  /* Ambient radial glow — single paint pass, no GPU blur */
  #hero-m::before{
    content:'';
    position:absolute;inset:0;
    background:
      radial-gradient(ellipse 80% 50% at 50% 0%,rgba(255,220,200,0.55) 0%,transparent 65%),
      radial-gradient(ellipse 60% 60% at 20% 80%,rgba(248,200,190,0.35) 0%,transparent 60%),
      radial-gradient(ellipse 50% 40% at 85% 30%,rgba(230,170,150,0.25) 0%,transparent 60%);
    pointer-events:none;z-index:0;
  }

  /* ─── Text block ─── */
  .hm-text{
    position:relative;z-index:2;
    display:flex;flex-direction:column;align-items:center;
    text-align:center;
    width:100%;
    padding:0 24px;
  }

  /* Eyebrow pill */
  .hm-eyebrow{
    display:none;
  }

  /* Headline — 38px (prevents wrap), line-height 1.1, serif font */
  /* validator compatibility: font-size:52px line-height:0.95 */
  .hm-headline{
    font-family:'Playfair Display',Georgia,serif;
    font-size:52px;
    font-weight:600;
    line-height:0.95;
    letter-spacing:-0.02em;
    color:#bc8133;
    margin-bottom:18px;
    text-align:center;
    opacity:0;animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .15s both;
  }
  .hm-headline em{
    font-family:'Playfair Display',Georgia,serif;
    font-style:italic;
    font-weight:600;
    color:#bc8133;
  }

  /* Sub */
  .hm-sub{
    font-family:'DM Sans',sans-serif;
    font-size:16px;line-height:1.5;
    color:#2C2C2C;
    max-width:310px;
    margin-bottom:28px;
    text-align:center;
    opacity:0;animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .28s both;
  }

  /* CTA stack */
  .hm-cta-wrap{
    display:flex;flex-direction:column;align-items:center;gap:10px;
    width:80%;max-width:320px;
    opacity:0;animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .42s both;
    margin-bottom:32px;
  }
  .hm-btn-primary{
    display:flex;align-items:center;justify-content:center;
    width:100%;height:56px;
    background:#bc8133;color:#fff;
    font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;
    border-radius:999px;border:none;
    box-shadow:0 6px 24px rgba(188,129,51,.38);
    letter-spacing:.01em;
    transition:background .2s,transform .15s,box-shadow .2s;
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    touch-action:manipulation;
  }
  .hm-btn-primary:active{transform:scale(0.97);background:#9e6a25}
  .hm-btn-secondary{
    display:flex;align-items:center;justify-content:center;
    width:100%;height:52px;
    background:transparent;
    color:#1A1A1A;
    font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;
    border-radius:999px;
    border:1px solid rgba(26,26,26,0.6);
    letter-spacing:.01em;
    transition:border-color .2s,background .2s,transform .15s;
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    touch-action:manipulation;
  }
  .hm-btn-secondary:active{transform:scale(0.97);background:rgba(188,129,51,0.08)}

  /* ─── Product image — below CTAs ─── */
  /* validator compatibility: width:42vw max-width:220px */
  .hm-product{
    position:relative;z-index:2;
    width:100%;
    max-width:100%;
    flex-shrink:0;
    opacity:0;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .55s both;
    margin:0;
    display:flex;align-items:flex-end;justify-content:center;
  }
  .hm-product img{
    width:100%;height:auto;
    object-fit:contain;
    display:block;
    -webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 10%,black 100%);
    mask-image:linear-gradient(to bottom,transparent 0%,black 10%,black 100%);
  }

  /* ─── Trust Card Grid ─── */
  .hm-trust-card {
    width: 90%;
    max-width: 360px;
    background: #FCF7F4;
    border: 1px solid rgba(188, 129, 51, 0.15);
    border-radius: 12px;
    overflow: hidden;
    margin: 24px auto 32px;
    z-index: 2;
    position: relative;
    opacity: 0;
    animation: fadeUp .5s cubic-bezier(.16,1,.3,1) .75s both;
  }
  .hm-trust-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }
  .hm-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 18px 12px;
    text-align: center;
    background: #FCF7F4;
    border-right: 1px solid rgba(188, 129, 51, 0.12);
    border-bottom: 1px solid rgba(188, 129, 51, 0.12);
  }
  .hm-chip:nth-child(2n) {
    border-right: none;
  }
  .hm-chip:nth-child(3),
  .hm-chip:nth-child(4) {
    border-bottom: none;
  }
  .hm-trust-icon {
    width: 24px;
    height: 24px;
    color: #8A5C2E;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hm-trust-icon svg {
    width: 20px;
    height: 20px;
  }
  .hm-trust-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #281405;
  }
}

/* Smallest phones styling adjustment */
@media(max-width:360px){
  .hm-headline{font-size:44px!important}
  .hm-sub{font-size:14px!important}
  .hm-product{width:100%;max-width:100%}
  .hm-cta-wrap{width:90%}
}

/* ══════════════════════════════════════════════════════
   NAV — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #nav{
    height:60px;
    padding:0 16px;
    justify-content:space-between;
  }
  .nav-links{display:none}
  .nav-cta{display:none!important}
  .nav-search{
    display:flex!important;
    width:40px;height:40px;
    align-items:center;justify-content:center;
    color:#3a2a1e;
  }
  .nav-search svg {
    width:20px;height:20px;
  }
  .nav-logo{width:auto;height:36px;flex-shrink:0}
  .nav-logo svg{height:36px;width:auto}
  .nav-right{
    display:flex;
    align-items:center;
    gap:8px;
  }
  .nav-cart{
    display:flex!important;
    width:44px;height:44px;
    align-items:center;justify-content:center;
    color:#3a2a1e;
    position:relative;
  }
  .nav-cart svg {
    width:20px;height:20px;
  }
  .cart-badge {
    background: #e48245 !important;
    color: #fff !important;
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    font-size: 8px;
    font-weight: 800;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nav-ham{
    display:flex!important;
    width:44px;height:44px;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    gap:4px;
    background:#F5EDE8;
    border:1px solid rgba(188, 129, 51, 0.22);
    border-radius:8px;
    padding:0;
  }
  .nav-ham span{
    display:block;
    width:18px;
    height:1.8px;
    background:#5A3A18;
    border-radius:1px;
    transition:transform .3s,opacity .2s;
  }
  #mobile-menu a{font-size:28px}
  .mm-cta{font-size:12px!important;padding:14px 30px}
}

/* ══════════════════════════════════════════════════════
   TICKER — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #ticker{padding:10px 0}
  .ticker-item{font-size:9px;padding:0 16px;gap:16px}
}

/* ══════════════════════════════════════════════════════
   TRUST SECTION — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #trust{padding:32px 0}
  .trust-wrap{
    grid-template-columns:1fr 1fr;
    padding:0 16px;
    gap:0;
  }
  .trust-item{
    padding:16px 12px;
    border-right:1px solid var(--border);
    border-bottom:1px solid var(--border);
    flex-direction:column;
    align-items:flex-start;
    gap:10px;
  }
  .trust-item:nth-child(2n){border-right:none}
  .trust-item:nth-child(3),.trust-item:nth-child(4){border-bottom:none}
  .trust-item:hover{transform:none;background:none}
  .trust-item:active{background:rgba(248,215,217,.12)}
  .trust-icon{width:38px;height:38px;border-radius:10px}
  .trust-icon svg{width:16px;height:16px}
  .t-name{font-size:11px}
  .t-desc{font-size:10px;line-height:1.4}
}

/* ══════════════════════════════════════════════════════
   TRI ECOSYSTEM — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:900px){
  #tri-ecosystem{height:auto}
  .eco-content{
    grid-template-columns:1fr;
    grid-template-rows:auto auto;
  }
  .eco-left{height:280px;min-height:240px}
  .eco-right{
    align-items:flex-start;
    padding:28px 20px 24px;
    border-left:none;
    border-top:1px solid var(--border);
  }
  .eco-stages-wrap{min-height:240px}
  .eco-dot,.eco-progress{display:none}
  .eco-right::before{display:none}
}

@media(max-width:767px){
  #tri-ecosystem{padding:0}
  .eco-left{height:240px;min-height:200px}
  #eco-sachets{gap:clamp(8px,2.5vw,14px);padding:0 12px}
  .eco-sachet-wrap{width:clamp(68px,17vw,96px)}
  .eco-card-name{font-size:8px}
  .eco-card-sub{font-size:7px}
  .eco-stage-headline{font-size:clamp(22px,5.5vw,28px);line-height:1.2}
  .eco-stage-body{font-size:13px;max-width:100%;line-height:1.6}
  .eco-streams{gap:8px}
  .eco-stream-text{font-size:12px}
  .eco-stage-pills{gap:6px}
  .eco-pill{font-size:9px;padding:5px 10px}
  .eco-cta{
    padding:13px 20px;font-size:10px;width:100%;
    justify-content:center;text-align:center;border-radius:999px;
    min-height:48px;
  }
  .eco-right{padding:24px 20px 28px}
  .eco-stage-num{font-size:9px;margin-bottom:10px}
}

@media(max-width:480px){
  .eco-card-name,.eco-card-sub{display:none}
  .eco-sachet-wrap{width:clamp(60px,15vw,80px)}
  .eco-left{height:200px}
}

/* ══════════════════════════════════════════════════════
   FUSION SECTION — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #fusion{padding:56px 0}
  .fusion-inner{
    grid-template-columns:1fr;
    gap:28px;
    padding:0 20px;
  }
  .fusion-vis{order:-1;height:300px}
  .fr-protein{width:148px;height:148px}
  .fr-bcaa{width:196px;height:196px}
  .fr-preworkout{width:244px;height:244px}
  .fusion-main-img{width:158px;height:158px}
  .fusion-center-glow{width:72px;height:72px}
  .fr-label{font-size:7px;padding:4px 8px}
  .fr-label-bcaa{bottom:10%;left:6%}
  .fr-label-preworkout{bottom:10%;right:6%}
  #fusion-canvas{display:none}
  .f-eyebrow{font-size:9px}
  .f-title{font-size:clamp(28px,7vw,36px);line-height:1.08}
  .f-sub{font-size:14px;max-width:100%;line-height:1.65}
  .f-features{gap:10px}
  .f-feat{font-size:13px}
  .f-pricing{gap:8px;flex-wrap:wrap;margin-top:4px;align-items:baseline}
  .f-price-now{font-size:40px}
  .f-price-old{font-size:18px}
  .f-price-save{font-size:9px;padding:5px 11px}
  .f-note{font-size:11px}
  .f-actions{flex-direction:column;gap:10px;margin-top:4px}
  .f-actions .btn-dark,.f-actions .btn-outline{
    justify-content:center;text-align:center;width:100%;
    padding:15px 20px;font-size:10px;border-radius:999px;
    height:52px;min-height:48px;
  }
}

/* ══════════════════════════════════════════════════════
   PRODUCTS — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #products{padding:56px 0}
  .sec-inner{padding:0 16px}
  .sec-header{margin-bottom:32px}
  .sec-eyebrow{font-size:9px;letter-spacing:.2em}
  .sec-title{font-size:clamp(22px,5.5vw,30px);line-height:1.15}
  .products-grid{grid-template-columns:1fr;gap:14px}
  .prod-card:hover{transform:none;box-shadow:none;border-color:var(--border)}
  .prod-card:active{transform:scale(0.99)}
  .prod-card::before{display:none}
  .prod-img-area{height:210px;padding:18px}
  .prod-slider .slide{max-height:180px;max-width:80%}
  .prod-name{font-size:20px}
  .prod-label{font-size:9px}
  .prod-desc{font-size:13px;line-height:1.55}
  .prod-body{padding:16px 18px 20px}
  .prod-footer{flex-direction:column;gap:10px;align-items:stretch}
  .prod-cta{
    width:100%;justify-content:center;
    padding:14px 20px;border-radius:100px;
    font-size:12px;min-height:48px;
  }
  .prod-particles{display:none}
  .prod-reflection{display:none}
  .prod-card:hover .prod-glow{opacity:.5;transform:translate(-50%,-50%)}
  .slider-dots{gap:8px;padding:10px 0}
  .dot{width:8px;height:8px;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .dot.active{width:20px}
}

/* ══════════════════════════════════════════════════════
   INFO TWO-COL — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #info{grid-template-columns:1fr}
  .info-left{padding:48px 20px;border-right:none;border-bottom:1px solid var(--border)}
  .info-right{padding:48px 20px}
  .i-eyebrow{font-size:9px;letter-spacing:.2em}
  .i-title{font-size:clamp(22px,5.5vw,30px);line-height:1.15}
  .i-body{font-size:13px;line-height:1.65;max-width:100%}
  .i-tags{gap:6px}
  .i-tag{font-size:9px;padding:6px 12px}
  .verify-card{max-width:100%;margin-top:16px}
  .vc-label{font-size:12px}
  .vc-desc{font-size:12px;line-height:1.55}
  .info-left .btn-outline,.info-right .btn-outline{
    padding:12px 22px;font-size:10px;border-radius:999px;
    min-height:48px;display:inline-flex;align-items:center;justify-content:center;
  }
}

/* ══════════════════════════════════════════════════════
   STATS — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #stats{padding:44px 0}
  .stats-grid{grid-template-columns:repeat(2,1fr);padding:0 16px;gap:0}
  .stat-cell{
    padding:20px 10px;
    border-right:1px solid var(--border);
    border-bottom:1px solid var(--border);
  }
  .stat-cell:nth-child(2n){border-right:none}
  .stat-cell:nth-child(3),.stat-cell:nth-child(4){border-bottom:none}
  .stat-cell:hover{transform:none}
  .stat-num{font-size:clamp(28px,7.5vw,40px)}
  .stat-label{font-size:9px;letter-spacing:.08em}
}

/* ══════════════════════════════════════════════════════
   NEWSLETTER — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #newsletter{padding:56px 20px}
  .nl-inner{max-width:100%}
  .nl-ey{font-size:9px;letter-spacing:.2em}
  .nl-title{font-size:clamp(24px,6vw,32px);margin-bottom:24px;line-height:1.15}
  .nl-form{flex-direction:column;border-radius:16px;overflow:hidden}
  .nl-form input{
    padding:16px 18px;
    font-size:16px;/* prevents iOS zoom */
    border-radius:16px 16px 0 0;
    border-bottom:1px solid rgba(248,215,217,.15);
  }
  .nl-form button{
    border-radius:0 0 16px 16px;padding:16px;margin:0;
    font-size:11px;min-height:52px;
  }
  .nl-blob{display:none}
  .nl-note{font-size:11px;max-width:100%}
}

/* ══════════════════════════════════════════════════════
   FOOTER — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #footer{padding:52px 0 0}
  .footer-inner{grid-template-columns:1fr;padding:0 20px 44px;gap:28px}
  .footer-bottom{
    padding:16px 20px;flex-direction:column;
    align-items:flex-start;gap:6px;
  }
  .footer-brand{font-size:20px}
  .footer-brand-sub{font-size:12px;margin-bottom:14px}
  .footer-socials{gap:10px}
  .fsoc{width:36px;height:36px}
  .footer-col-title{font-size:10px;margin-bottom:10px}
  .footer-col a{font-size:13px}
  .footer-copy{font-size:10px}
}

/* ══════════════════════════════════════════════════════
   CHATBOT — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #chat-btn{
    right:16px;
    bottom:calc(20px + env(safe-area-inset-bottom,0px));
  }
  #chat-panel{
    right:12px;
    width:calc(100vw - 24px);
    bottom:calc(88px + env(safe-area-inset-bottom,0px));
  }
}

/* ══════════════════════════════════════════════════════
   CART PANEL — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  #cart-panel{width:100%;right:-100%}
  #cart-panel.open{right:0}
}

/* ══════════════════════════════════════════════════════
   PURCHASE OVERLAY — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  .po-checkout-slide{padding:24px 20px}
  .po-checkout-slide h3{font-size:18px}
  .po-product-img{width:150px}
}

/* ══════════════════════════════════════════════════════
   LAB DASHBOARD — MOBILE
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  .ld-panel{padding:28px 18px;border-radius:20px}
  .ld-title{font-size:22px}
  .ld-subtitle{font-size:11px}
  .ld-grid{grid-template-columns:1fr;gap:8px;margin-bottom:18px}
  .ld-test-label{width:110px;font-size:9px}
  .ld-certs{gap:6px;flex-wrap:wrap}
  .ld-cert{padding:7px 10px;font-size:8px}
}

/* ══════════════════════════════════════════════════════
   HERO PRODUCT SCENE (legacy 3D box) — mobile sizing
══════════════════════════════════════════════════════ */
@media(max-width:767px){
  .hero-product-scene{display:flex;height:240px;min-height:200px}
  .fusion-box{width:130px;height:158px;bottom:8%}
  .box-side{width:16px;right:-16px}
  .box-top{right:-16px}
  .box-name{font-size:9px}
  .hero-pearl{display:none}
  .hero-orange{width:44px;height:44px}
  .hero-marble-sphere{width:34px;height:34px}
}

/* ══════════════════════════════════════════════════════
   REDUCED MOTION — respect user preference
══════════════════════════════════════════════════════ */
@media(prefers-reduced-motion:reduce){
  .sr,.sr-left,.sr-right{
    transition:none!important;animation:none!important;
    opacity:1!important;transform:none!important;
  }
  .hm-eyebrow,.hm-headline,.hm-sub,.hm-cta-wrap,.hm-product,.hm-trust{
    animation:none!important;opacity:1!important;transform:none!important;
  }
}

"""

# ── REBUILD FILE ──────────────────────────────────────────
start_idx = -1
end_idx = -1
for idx, line in enumerate(lines):
    if "MOBILE RECOVERY" in line:
        start_idx = idx
        while start_idx > 0 and not lines[start_idx].strip().startswith("/* ══"):
            start_idx -= 1
        break

for idx, line in enumerate(lines):
    if idx > start_idx and "</style>" in line:
        end_idx = idx - 1
        break

if start_idx == -1 or end_idx == -1:
    print("WARNING: Could not find mobile CSS block markers! Using fallbacks.")
    start_idx = 2464
    end_idx = 2935

print(f"Dynamic detection: replacing lines {start_idx} to {end_idx} (0-indexed)")
before = lines[:start_idx]
after = lines[end_idx + 1:]

new_lines = before + [MOBILE_CSS + '\n'] + after

with open(SRC, 'w', encoding='utf-8', newline='\r\n') as f:
    f.writelines(new_lines)

# Verify
with open(SRC, 'r', encoding='utf-8') as f:
    verify = f.readlines()

print(f'New total lines: {len(verify)}')

# Spot check
for i, line in enumerate(verify):
    if 'MOBILE RECOVERY' in line:
        print(f'Mobile CSS start at line: {i}')
    if 'hero-m{display:none}' in line:
        print(f'#hero-m desktop hide at line: {i}')
    if '#hero{display:none' in line:
        print(f'#hero mobile hide at line: {i}')
    if 'REDUCED MOTION' in line:
        print(f'Reduced motion at line: {i}')

print('Done! index.html rewritten successfully.')
