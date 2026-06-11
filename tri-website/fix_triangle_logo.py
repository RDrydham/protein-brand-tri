import re
import os

files = [
    'index.html',
    'about.html',
    'contact.html',
    'inside.html',
    'lab-reports.html',
    'shop.html',
]

# The correct path:
# From apex (25,9) → down-left to bottom-left (6,41) → across bottom to bottom-right (44,41)
# → up the right leg but STOPS SHORT near the top at (~29,15), leaving a gap at the upper-right joint
# This matches the actual logo where the right leg doesn't reach the apex

NEW_PATH_WITH_CLASS = '<path class="logo-triangle" d="M 25,9 L 6,41 L 44,41 L 29,15" stroke="#f27a22" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />'
NEW_PATH_NO_CLASS   = '<path d="M 25,9 L 6,41 L 44,41 L 29,15" stroke="#f27a22" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />'

# Match the paths we inserted previously (with 19.5,41 pattern)
PREV_PATH_RE = re.compile(
    r'<path(?:\s+class="logo-triangle")?\s+d="M 25,9 L 6,41 L 19\.5,41 M 30\.5,41 L 44,41 L 25,9"[^/]*/?>',
    re.IGNORECASE | re.DOTALL
)

total_replaced = 0

for fname in files:
    if not os.path.exists(fname):
        print(f"  SKIP: {fname} not found")
        continue

    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    count = 0

    def replacer(m):
        global count
        matched = m.group(0)
        count += 1
        if 'logo-triangle' in matched:
            return NEW_PATH_WITH_CLASS
        else:
            return NEW_PATH_NO_CLASS

    content = PREV_PATH_RE.sub(replacer, content)

    if content != original:
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  FIXED: {fname} — {count} replacement(s)")
        total_replaced += count
    else:
        print(f"  NO CHANGE: {fname}")

print(f"\nDone. Total replacements: {total_replaced}")
