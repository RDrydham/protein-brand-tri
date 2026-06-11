import os

files_to_fix = [
    'shop.html',
    'about.html',
    'contact.html',
    'lab-reports.html',
    'inside.html'
]

# The mobile menu logo text - different pages use different class names
# In shop/about/contact/inside: class="mn-logo"
# In lab-reports: class="mm-logo-lbl"

for fname in files_to_fix:
    if not os.path.exists(fname):
        print(f'SKIP: {fname} not found')
        continue

    with open(fname, 'rb') as f:
        content = f.read().decode('utf-8')

    original = content

    # Fix mn-logo ATRI -> TRI (shop, about, contact, inside)
    content = content.replace(
        '>ATRI<span class="mn-logo-sub">',
        '>TRI<span class="mn-logo-sub">'
    )

    # Fix mm-logo-lbl ATRI -> TRI (lab-reports)
    content = content.replace(
        '>ATRI<span class="mm-logo-sub-lbl">',
        '>TRI<span class="mm-logo-sub-lbl">'
    )

    if content != original:
        with open(fname, 'wb') as f:
            f.write(content.encode('utf-8'))
        print(f'OK: Fixed ATRI -> TRI in {fname}')
    else:
        print(f'NO CHANGE: {fname} (no match found)')

print('\nDone!')
