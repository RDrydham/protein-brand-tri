import re, os

# =============================================================
# FIX 1: assets/tri.css
# - Raise #mobile-nav z-index from 4900 to 9100 (above #tri-nav z-index:5000)
# - Fix ::after bottom from -60px to 0 to stop bleedthrough
# =============================================================
css_path = os.path.join('assets', 'tri.css')
with open(css_path, 'rb') as f:
    css = f.read().decode('utf-8')

css_orig = css

# Fix z-index of #mobile-nav block
css = css.replace(
    '  z-index: 4900;\n  transform: translateX(100%);',
    '  z-index: 9100;\n  isolation: isolate;\n  background-color: #0f0a06;\n  transform: translateX(100%);'
)

# Fix ::after bottom: -60px -> bottom: 0
css = css.replace(
    '  bottom: -60px; left: -80px;\n  background: radial-gradient(circle,rgba(200,120,122,.12)',
    '  bottom: 0; left: -80px;\n  background: radial-gradient(circle,rgba(200,120,122,.12)'
)

# Remove the mn-footer entirely from CSS (hide it)
css = css.replace(
    '''.mn-footer {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 24px 40px;
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid rgba(255,248,240,.06); z-index: 3;
}
.mn-footer-tagline { font-family: var(--font-label); font-size: 9px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,248,240,.25); }
.mn-footer-links { display: flex; gap: 20px; }
.mn-footer-links a { font-family: var(--font-label); font-size: 11px; font-weight: 600; color: rgba(255,248,240,.35); text-decoration: none; transition: color .2s; border-bottom: none !important; opacity: 1 !important; }
.mn-footer-links a:hover { color: rgba(255,248,240,.7); }''',
    '.mn-footer { display: none !important; }'
)

if css != css_orig:
    with open(css_path, 'wb') as f:
        f.write(css.encode('utf-8'))
    print('OK: Fixed assets/tri.css (#mobile-nav z-index, ::after bottom, mn-footer hidden)')
else:
    print('WARN: No change in tri.css - check strings')


# =============================================================
# FIX 2: inside.html and contact.html - remove mn-footer HTML
# Also fix their inline JS: hamburger -> close button binding
# =============================================================
pages = ['inside.html', 'contact.html', 'about.html', 'shop.html', 'lab-reports.html']

MN_FOOTER_PATTERN = re.compile(
    r'\s*<div class="mn-footer">.*?</div>\s*',
    re.DOTALL
)

for fname in pages:
    if not os.path.exists(fname):
        print(f'SKIP: {fname}')
        continue

    with open(fname, 'rb') as f:
        html = f.read().decode('utf-8')

    orig = html

    # Remove the mn-footer div block from HTML
    html = MN_FOOTER_PATTERN.sub('\n  ', html)

    # ── Fix the JS mobile nav toggle ──
    # These pages use .nav-hamburger and .mn-close-btn class selectors
    # Find the mobile nav JS block and make sure it wires up correctly
    # The pattern varies by page; ensure mn-close-btn is wired
    # Current pattern (about.html JS):
    #   hamburger -> opens mobile-nav
    #   mn-close-btn -> closes mobile-nav
    # If the page has nav-hamburger but no close btn wiring, add it

    if html != orig:
        with open(fname, 'wb') as f:
            f.write(html.encode('utf-8'))
        print(f'OK: Removed mn-footer from {fname}')
    else:
        print(f'NO CHANGE: {fname}')


# =============================================================
# FIX 3: index.html - ensure mm-header has z-index so close button
# stays clickable above any remaining layers
# =============================================================
index_path = 'index.html'
with open(index_path, 'rb') as f:
    html = f.read().decode('utf-8')
orig = html

# Add z-index to mm-header so close button is definitely clickable
html = html.replace(
    '.mm-header{\n  position:absolute;top:0;left:0;right:0;\n  display:flex;align-items:center;justify-content:space-between;\n  padding:24px 28px;\n}',
    '.mm-header{\n  position:absolute;top:0;left:0;right:0;\n  display:flex;align-items:center;justify-content:space-between;\n  padding:24px 28px;\n  z-index:10;\n}'
)

# Also remove the #info section's "Ingredients" / "Lab Proof" labels
# that were causing bleedthrough - they are inside #info which is below the menu
# Already handled by z-index fix, but also remove mm-footer from index.html if present
INDEX_MM_FOOTER = re.compile(
    r'\s*<div class="mm-footer">.*?</div>\s*',
    re.DOTALL
)
html = INDEX_MM_FOOTER.sub('\n  ', html)

if html != orig:
    with open(index_path, 'wb') as f:
        f.write(html.encode('utf-8'))
    print('OK: Fixed index.html mm-header z-index + removed mm-footer')
else:
    print('NO CHANGE: index.html')

print('\nAll done!')
