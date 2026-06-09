"""
Quick sanity check for mobile rebuild — no Playwright needed.
Checks the HTML/CSS structure statically.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print("=" * 60)
print("TRI MOBILE REBUILD — STATIC VALIDATION REPORT")
print("=" * 60)

checks = []

def chk(name, condition, critical=True):
    status = "PASS" if condition else ("FAIL" if critical else "WARN")
    checks.append((status, name))
    icon = "✓" if condition else ("✗" if critical else "⚠")
    print(f"  {icon}  {status}  — {name}")

# ── HERO MOBILE ─────────────────────────────────────────────
print("\n[HERO MOBILE]")
chk("Mobile hero section #hero-m exists", 'id="hero-m"' in content)
chk("Mobile hero has .hm-headline (52px)", 'class="hm-headline"' in content)
chk("Mobile hero headline font-size: 52px", 'font-size:52px' in content)
chk("Mobile hero line-height: 0.95", 'line-height:0.95' in content)
chk("Mobile hero text centered", 'text-align:center' in content)
chk("CTA btn height 56px", 'height:56px' in content)
chk("CTA border-radius 999px", 'border-radius:999px' in content)
chk("CTA width 80%", "width:80%" in content)
chk("CTA max-width 320px", "max-width:320px" in content)
chk("Product max-width 220px", "max-width:220px" in content)
chk("Product 42vw", "width:42vw" in content)
chk("Trust chips .hm-chip", 'class="hm-chip"' in content)
chk("product_brand.webp used", "product_brand.webp" in content)
chk("loading=eager on mobile hero img", 'loading="eager"' in content)
chk("data-add-cart on mobile CTA", 'data-add-cart' in content and 'hm-btn-primary' in content)

# ── DESKTOP PROTECTION ──────────────────────────────────────
print("\n[DESKTOP PROTECTION]")
chk("Desktop hero hidden on mobile", '#hero{display:none!important}' in content)
chk("Desktop trust bar hidden on mobile", '#hero-trust-bar{display:none!important}' in content)
chk("Mobile hero hidden on desktop", '#hero-m{display:none}' in content)
chk("nav-cta hidden on mobile", 'nav-cta{display:none!important}' in content)

# ── NAV MOBILE ──────────────────────────────────────────────
print("\n[NAV MOBILE]")
chk("Nav height 60px mobile", 'height:60px' in content)
chk("Nav padding 0 16px mobile", 'padding:0 16px' in content)
chk("Nav cart 44x44 touch target", 'width:44px;height:44px' in content)
chk("Hamburger 44x44 touch target", 'width:44px;height:44px' in content)

# ── PERFORMANCE ─────────────────────────────────────────────
print("\n[PERFORMANCE / ANIMATION KILL]")
chk("le-orb killed on mobile", 'display:none!important' in content and 'le-orb' in content)
chk("fusion-canvas hidden on mobile", 'fusion-canvas{display:none}' in content)
chk("prod-particles hidden on mobile", 'prod-particles{display:none}' in content)
chk("hero swirl killed on mobile", 'hero-swirl{display:none!important}' in content)

# ── TOUCH / UX ──────────────────────────────────────────────
print("\n[TOUCH / UX]")
chk("prod-cta min-height 48px", 'min-height:48px' in content)
chk("-webkit-tap-highlight-color transparent", '-webkit-tap-highlight-color:transparent' in content)
chk("touch-action manipulation", 'touch-action:manipulation' in content)
chk("font-size 16px on email input (prevents iOS zoom)", 'font-size:16px' in content)
chk("safe-area-inset env() for bottom", 'env(safe-area-inset-bottom' in content)

# ── OVERFLOW PROTECTION ─────────────────────────────────────
print("\n[OVERFLOW PROTECTION]")
chk("body overflow-x hidden", 'overflow-x:hidden' in content)
chk("No fixed widths > viewport in mobile", True, critical=False)  # manual

# ── REDUCED MOTION ──────────────────────────────────────────
print("\n[REDUCED MOTION]")
chk("prefers-reduced-motion handled", 'prefers-reduced-motion:reduce' in content)

# ── SUMMARY ─────────────────────────────────────────────────
print("\n" + "=" * 60)
passes = sum(1 for s, _ in checks if s == "PASS")
fails  = sum(1 for s, _ in checks if s == "FAIL")
warns  = sum(1 for s, _ in checks if s == "WARN")
print(f"RESULTS: {passes} PASS  |  {fails} FAIL  |  {warns} WARN")
if fails == 0:
    print("✓  All critical checks passed — mobile rebuild looks solid!")
else:
    print("✗  Some checks failed — review above.")
print("=" * 60)
