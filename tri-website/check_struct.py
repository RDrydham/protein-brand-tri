import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

style_open = content.index('<style>')
style_close = content.index('</style>')
head_close = content.index('</head>')
body_open = content.index('<body>')
mobile_rec = content.index('MOBILE RECOVERY')
hero_m_html = content.index('section id="hero-m"')

checks = [
    ('style tag opened', style_open > 0),
    ('style tag closed', style_close > 0),
    ('head tag closed', head_close > 0),
    ('body tag opened', body_open > 0),
    ('MOBILE RECOVERY CSS inside style block', style_open < mobile_rec < style_close),
    ('hero-m section in body', hero_m_html > body_open),
    ('hero-m CSS hidden desktop: #hero-m{display:none}', '#hero-m{display:none}' in content),
    ('hero hidden on mobile: display:none!important', '#hero{display:none!important}' in content),
    ('hm-headline 52px font size', 'font-size:52px' in content),
    ('correct order: style -> /style -> /head -> body', style_open < style_close < head_close < body_open),
]

all_ok = True
for name, result in checks:
    status = 'PASS' if result else 'FAIL'
    if not result: all_ok = False
    print(f'  [{status}] {name}')

print()
if all_ok:
    print('All structure checks PASSED!')
else:
    print('STRUCTURE ERRORS FOUND - review above')
