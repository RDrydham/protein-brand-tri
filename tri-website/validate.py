import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('hero-m section exists', 'id="hero-m"' in content),
    ('hm-headline class', 'hm-headline' in content),
    ('hm-trust class', 'hm-trust' in content),
    ('hm-btn-primary', 'hm-btn-primary' in content),
    ('product_brand.webp in hero-m', 'product_brand.webp' in content),
    ('data-add-cart in hero-m btn', 'hm-btn-primary' in content and 'data-add-cart' in content),
    ('desktop hero hidden on mobile', 'display:none!important' in content),
    ('hero-trust-bar hidden on mobile', 'hero-trust-bar' in content),
    ('nav-cta hidden mobile', 'nav-cta' in content and 'display:none' in content),
    ('MOBILE RECOVERY CSS header', 'MOBILE RECOVERY' in content),
    ('overflow-x hidden on body', 'overflow-x:hidden' in content),
    ('hero-m desktop hide rule', 'hero-m{display:none}' in content),
]

all_ok = True
for name, result in checks:
    status = 'OK' if result else 'FAIL'
    if not result:
        all_ok = False
    print(f'  [{status}] {name}')

print()
if all_ok:
    print('All checks passed!')
else:
    print('SOME CHECKS FAILED!')
