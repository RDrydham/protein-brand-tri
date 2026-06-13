#!/usr/bin/env python3
"""
Insert #hero-m mobile section into index.html
Inserts after the closing </div> of #hero-trust-bar (line index 3294)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

SRC = 'index.html'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')
# Verify insertion point
print(f'Line 3293: {lines[3293].strip()[:60]}')
print(f'Line 3294: {lines[3294].strip()[:60]}')
print(f'Line 3295: {lines[3295].strip()[:60]}')

HERO_M_HTML = """\r\n<!-- ═══════════════════════════════════════════════\r\n     MOBILE HERO — Dedicated mobile-only section\r\n     Hidden on desktop via CSS: #hero-m{display:none}\r\n     Desktop #hero is hidden on mobile: #hero{display:none!important}\r\n═══════════════════════════════════════════════ -->\r\n<section id="hero-m" aria-label="TRI — The Real Inside">\r\n\r\n  <!-- Text block -->\r\n  <div class="hm-text">\r\n    <!-- Eyebrow -->\r\n    <span class="hm-eyebrow">Clean Performance Nutrition</span>\r\n\r\n    <!-- Headline: 52px, line-height 0.95, centered -->\r\n    <h1 class="hm-headline">What&rsquo;s<br><em>Inside</em><br>Matters.</h1>\r\n\r\n    <!-- Sub -->\r\n    <p class="hm-sub">4-level tested. Zero hidden blends.<br>Lab verified. Built for your gut.</p>\r\n\r\n    <!-- CTAs -->\r\n    <div class="hm-cta-wrap">\r\n      <button\r\n        class="hm-btn-primary"\r\n        data-add-cart\r\n        data-name="TRI Fusion Pack (Try Pack)"\r\n        data-price="599"\r\n        data-image="assets/hero_product.png"\r\n        aria-label="Shop TRI Fusion Pack for 599 rupees"\r\n      >\r\n        Shop Now &mdash; &#8377;599\r\n      </button>\r\n      <a href="inside.html" class="hm-btn-secondary">Explore What&rsquo;s Inside</a>\r\n    </div>\r\n  </div>\r\n\r\n  <!-- Product image — centered below CTAs -->\r\n  <div class="hm-product">\r\n    <img\r\n      src="assets/product_brand.webp"\r\n      alt="TRI Fusion Pack — 9 sachets of clean sports nutrition"\r\n      loading="eager"\r\n      decoding="async"\r\n      width="220"\r\n      height="280"\r\n    />\r\n  </div>\r\n\r\n  <!-- Trust chips -->\r\n  <div class="hm-trust" aria-label="Trust signals">\r\n    <div class="hm-chip"><span class="hm-chip-dot"></span>Lab Verified</div>\r\n    <div class="hm-chip"><span class="hm-chip-dot"></span>No Blends</div>\r\n    <div class="hm-chip"><span class="hm-chip-dot"></span>4-Level Tested</div>\r\n    <div class="hm-chip"><span class="hm-chip-dot"></span>Gut Friendly</div>\r\n  </div>\r\n\r\n</section>\r\n"""

# Insert after line index 3294
insert_at = 3295
new_lines = lines[:insert_at] + [HERO_M_HTML] + lines[insert_at:]

with open(SRC, 'w', encoding='utf-8', newline='') as f:
    f.writelines(new_lines)

# Verify
with open(SRC, 'r', encoding='utf-8') as f:
    verify = f.readlines()

print(f'New total lines: {len(verify)}')
for i, line in enumerate(verify):
    if 'hero-m' in line and ('section' in line or 'MOBILE HERO' in line):
        print(f'  Found hero-m at line: {i}: {line.strip()[:60]}')

print('hero-m HTML insertion complete.')
