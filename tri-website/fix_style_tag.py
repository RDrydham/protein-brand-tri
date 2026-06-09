import sys
sys.stdout.reconfigure(encoding='utf-8')

SRC = 'index.html'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')
print(f'L3023: {repr(lines[3022].strip())}')
print(f'L3024: {repr(lines[3023].strip())}')
print(f'L3025: {repr(lines[3024].strip())}')

# Insert </style> at index 3023 (between the closing } and </head>)
# Line 3023 is index 3022 = last closing brace of CSS
# Line 3024 is index 3023 = empty line  
# Line 3025 is index 3024 = </head>
# We insert </style>\n at index 3024 (before </head>)

insert_idx = 3024  # 0-based, this is the </head> line
new_lines = lines[:insert_idx] + ['</style>\r\n'] + lines[insert_idx:]

with open(SRC, 'w', encoding='utf-8', newline='') as f:
    f.writelines(new_lines)

# Verify
with open(SRC, 'r', encoding='utf-8') as f:
    verify = f.readlines()

print(f'New total lines: {len(verify)}')
for i in range(3022, 3030):
    print(f'L{i+1}: {repr(verify[i].strip()[:60])}')

print('Fix applied successfully.')
