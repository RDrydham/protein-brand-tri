import urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8')
try:
    with urllib.request.urlopen('http://localhost:3000/', timeout=5) as r:
        html = r.read().decode('utf-8', errors='replace')

    print(f'Response length: {len(html)} chars')

    checks = [
        ('hero-m in HTML', 'hero-m' in html),
        ('MOBILE RECOVERY CSS', 'MOBILE RECOVERY' in html),
        ('style tag closed', '</style>' in html),
        ('hm-headline class', 'hm-headline' in html),
        ('hm-btn-primary', 'hm-btn-primary' in html),
        ('product_brand.webp', 'product_brand.webp' in html),
    ]
    all_ok = True
    for name, ok in checks:
        s = 'PASS' if ok else 'FAIL'
        if not ok: all_ok = False
        print(f'  [{s}] {name}')

    print()
    if all_ok:
        print('Server is serving UPDATED file! Do a hard refresh in browser (Ctrl+Shift+R)')
    else:
        print('Server serving OLD or BROKEN file!')
except Exception as e:
    print(f'Server error: {e}')
