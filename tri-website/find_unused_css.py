import os
import re

html_dir = r"c:\Users\rydha\OneDrive\Desktop\ATRI\tri-website"
css_path = os.path.join(html_dir, "assets", "tri.css")

def get_html_files():
    html_files = []
    for f in os.listdir(html_dir):
        if f.endswith(".html"):
            html_files.append(os.path.join(html_dir, f))
    return html_files

def extract_classes_and_ids():
    used_classes = set()
    used_ids = set()
    
    # Simple regex for class="..." and id="..."
    class_pattern = re.compile(r'class=["\']([^"\']+)["\']')
    id_pattern = re.compile(r'id=["\']([^"\']+)["\']')
    
    # Also look for javascript dynamic class setting if any
    js_class_pattern = re.compile(r'classList\.add\([\'"]([^\'"]+)[\'"]\)')
    js_class_toggle = re.compile(r'classList\.toggle\([\'"]([^\'"]+)[\'"]\)')
    
    # Read HTML files
    for filepath in get_html_files():
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            # Extract classes
            for match in class_pattern.finditer(content):
                for cls in match.group(1).split():
                    used_classes.add(cls.strip())
            # Extract ids
            for match in id_pattern.finditer(content):
                used_ids.add(match.group(1).strip())
                
    # Also read tri.js (if any JS files)
    js_path = os.path.join(html_dir, "assets", "tri.js")
    if os.path.exists(js_path):
        with open(js_path, "r", encoding="utf-8") as f:
            content = f.read()
            for match in js_class_pattern.finditer(content):
                used_classes.add(match.group(1).strip())
            for match in js_class_toggle.finditer(content):
                used_classes.add(match.group(1).strip())
                
    # Read other js in root (eco.js)
    eco_js_path = os.path.join(html_dir, "eco.js")
    if os.path.exists(eco_js_path):
        with open(eco_js_path, "r", encoding="utf-8") as f:
            content = f.read()
            for match in js_class_pattern.finditer(content):
                used_classes.add(match.group(1).strip())
            for match in js_class_toggle.finditer(content):
                used_classes.add(match.group(1).strip())
                
    return used_classes, used_ids

def parse_css_rules():
    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()
        
    # Remove CSS comments
    css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    
    parts = css_content.split('{')
    selectors = []
    for i in range(len(parts) - 1):
        part = parts[i]
        if i == 0:
            raw_selector = part.strip()
        else:
            last_brace = part.rfind('}')
            if last_brace != -1:
                raw_selector = part[last_brace + 1:].strip()
            else:
                raw_selector = part.strip()
                
        if not raw_selector:
            continue
        # Clean keyframes/media query wrappers or values that look like keyframes
        if raw_selector.startswith('@') or raw_selector in ('to', 'from') or raw_selector.replace('%','').strip().isdigit():
            continue
            
        # Split by comma
        for sel in raw_selector.split(','):
            sel = sel.strip()
            if sel:
                selectors.append(sel)
                
    return selectors

def check_unused(used_classes, used_ids, selectors):
    unused = []
    
    # Helper to check if a selector matches anything we have
    for selector in selectors:
        # Ignore complex selectors, pseudo-classes, attribute selectors, and root/body/html
        clean_sel = selector
        # Remove pseudo elements
        clean_sel = re.sub(r':[a-zA-Z-()]+', '', clean_sel)
        # Remove parent combinators/whitespace
        parts = re.split(r'[\s>+~]', clean_sel)
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            # If it's a class selector like .foo
            if part.startswith('.'):
                cls_name = part[1:].split('.')[0].split('#')[0] # get first class name
                # Clean up characters like keyframe percentages or special characters
                if cls_name and cls_name not in used_classes:
                    # Double check if it's not a standard tag or state
                    if cls_name not in ('open', 'scrolled', 'active', 'hidden', 'visible', 'lit', 'grabbing', 'expanded', 'pass'):
                        unused.append((selector, f"class '{cls_name}' not found"))
                        break
            # If it's an ID selector like #bar
            elif part.startswith('#'):
                id_name = part[1:].split('.')[0].split('#')[0]
                if id_name and id_name not in used_ids:
                    if id_name not in ('tri-loader', 'tri-nav', 'mobile-nav', 'cart-overlay', 'cart-panel', 'chatbot-btn', 'chatbot-panel', 'tri-toast', 'tri-cursor', 'tri-cursor-ring'):
                        unused.append((selector, f"ID '{id_name}' not found"))
                        break
                        
    return unused

def main():
    used_classes, used_ids = extract_classes_and_ids()
    selectors = parse_css_rules()
    
    unused = check_unused(used_classes, used_ids, selectors)
    
    with open("potential_unused_css.txt", "w", encoding="utf-8") as out:
        out.write(f"Total HTML files found: {len(get_html_files())}\n")
        out.write(f"Total unique classes in HTML/JS: {len(used_classes)}\n")
        out.write(f"Total unique IDs in HTML/JS: {len(used_ids)}\n")
        out.write(f"Total CSS selectors: {len(selectors)}\n")
        out.write(f"\nPotential unused selectors count: {len(unused)}\n\n")
        for sel, reason in unused:
            out.write(f" - {sel}  ({reason})\n")
            
    print(f"Results written to potential_unused_css.txt. Total: {len(unused)}")

if __name__ == "__main__":
    main()
