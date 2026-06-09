import re

def main():
    css_path = 'assets/tri.css'
    with open(css_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find /* ── UNIVERSE SCROLL ── */
    start_marker = '/* ── UNIVERSE SCROLL ── */'
    end_marker = '/* ── UPGRADED CHATBOT ── */'
    
    if start_marker in content and end_marker in content:
        start_idx = content.find(start_marker)
        end_idx = content.find(end_marker)
        
        cleaned_content = content[:start_idx] + content[end_idx:]
        
        with open(css_path, 'w', encoding='utf-8') as f_out:
            f_out.write(cleaned_content)
        print("CSS cleaned successfully!")
    else:
        print("Markers not found!")

if __name__ == '__main__':
    main()
