with open('index.html', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')

# Fix 1: Raise mobile menu z-index from 8999 to 9100 and add isolation + solid bg
old1 = '#mobile-menu{\r\n  position:fixed;inset:0;z-index:8999;\r\n  background:linear-gradient(135deg,#0f0a06 0%,#1a1008 40%,#12080a 70%,#0d0c12 100%);\r\n  display:flex;flex-direction:column;\r\n  overflow:hidden;\r\n  opacity:0;pointer-events:none;transform:translateX(100%);\r\n  transition:opacity .4s cubic-bezier(.25,.46,.45,.94),transform .45s cubic-bezier(.25,.46,.45,.94);\r\n  visibility:hidden;\r\n}'
new1 = '#mobile-menu{\r\n  position:fixed;inset:0;z-index:9100;\r\n  background-color:#0f0a06;\r\n  background:linear-gradient(135deg,#0f0a06 0%,#1a1008 40%,#12080a 70%,#0d0c12 100%);\r\n  display:flex;flex-direction:column;\r\n  overflow:hidden;\r\n  opacity:0;pointer-events:none;transform:translateX(100%);\r\n  transition:opacity .4s cubic-bezier(.25,.46,.45,.94),transform .45s cubic-bezier(.25,.46,.45,.94);\r\n  visibility:hidden;\r\n  isolation:isolate;\r\n}'

if old1 in content:
    content = content.replace(old1, new1)
    print('OK: z-index raised to 9100, isolation added')
else:
    print('WARN: Could not find mobile-menu block to update z-index')
    # Try a simpler targeted replacement
    content = content.replace('position:fixed;inset:0;z-index:8999;', 'position:fixed;inset:0;z-index:9100;')
    if 'z-index:9100' in content:
        print('OK (fallback): z-index updated via simple replace')

# Fix 2: Keep ::after orb within bounds (remove bottom:-60px -> bottom:0)
old2 = '  bottom:-60px;left:-80px;\r\n  background:radial-gradient(circle,rgba(200,120,122,.12) 0%,rgba(188,129,51,.06) 50%,transparent 70%);\r\n  animation:mmOrbFloat2 11s ease-in-out infinite;'
new2 = '  bottom:0;left:-80px;\r\n  background:radial-gradient(circle,rgba(200,120,122,.12) 0%,rgba(188,129,51,.06) 50%,transparent 70%);\r\n  animation:mmOrbFloat2 11s ease-in-out infinite;'

if old2 in content:
    content = content.replace(old2, new2)
    print('OK: ::after orb contained within menu bounds')
else:
    content = content.replace('bottom:-60px;left:-80px;', 'bottom:0;left:-80px;')
    if 'bottom:0;left:-80px;' in content:
        print('OK (fallback): ::after bottom set to 0')
    else:
        print('WARN: Could not find ::after bottom to update')

# Fix 3: Change ATRI to TRI in mobile menu logo
old3 = '      ATRI\r\n      <span class="mm-logo-sub">The Real Inside</span>'
new3 = '      TRI\r\n      <span class="mm-logo-sub">The Real Inside</span>'

if old3 in content:
    content = content.replace(old3, new3)
    print('OK: ATRI changed to TRI in mobile menu logo')
else:
    print('WARN: Could not find ATRI text to replace')

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print('\nFinal verification:')
with open('index.html', 'r', encoding='utf-8') as f:
    final = f.read()

print('z-index:9100 present:', 'z-index:9100' in final)
print('isolation:isolate present:', 'isolation:isolate' in final)
print('bottom:0;left:-80px present:', 'bottom:0;left:-80px' in final)
# Check TRI in menu (look around mm-logo area)
idx = final.find('class="mm-logo"')
if idx > 0:
    snippet = final[idx:idx+200]
    print('mm-logo content snippet:', repr(snippet[:120]))
