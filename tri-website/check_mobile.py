import os
import subprocess
import time
import sys
from playwright.sync_api import sync_playwright

import socket

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.connect(("127.0.0.1", port))
            return True
        except socket.error:
            return False

def check_mobile_view():
    server_process = None
    if is_port_open(3000):
        print("TRI website server is already running on port 3000. Reusing it.")
    else:
        print("Starting TRI website server via node server.js...")
        # Start the express server
        server_process = subprocess.Popen(
            ["node", "server.js"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.getcwd()
        )
        
        # Wait for the server to spin up
        time.sleep(2)
        
        # Verify if server is running by checking process poll
        if server_process.poll() is not None:
            stdout, stderr = server_process.communicate()
            print(f"Error: Server failed to start.\nStdout: {stdout}\nStderr: {stderr}")
            sys.exit(1)
            
        print("Server started successfully.")
    
    # Create screenshots directory
    screenshots_dir = os.path.join(os.getcwd(), "mobile_screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)
    
    urls = {
        "home": "http://localhost:3000/",
        "about": "http://localhost:3000/about",
        "inside": "http://localhost:3000/inside",
        "lab-reports": "http://localhost:3000/lab-reports",
        "shop": "http://localhost:3000/shop",
        "contact": "http://localhost:3000/contact",
        "sachet-burst": "http://localhost:3000/sachet-burst.html",
        "tri-molecule-animation": "http://localhost:3000/tri-molecule-animation.html"
    }
    
    report = []
    
    try:
        with sync_playwright() as p:
            # Emulate iPhone 13/14 Pro mobile view
            iphone = p.devices['iPhone 13 Pro']
            browser = p.chromium.launch(headless=True)
            
            # Create a context with emulation
            context = browser.new_context(**iphone)
            page = context.new_page()
            
            # Listen to console messages
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            
            for name, url in urls.items():
                print(f"\nAnalyzing mobile view for: {name} ({url})")
                try:
                    page.goto(url)
                    page.wait_for_load_state("networkidle")
                    
                    # Wait slightly for animations/js to settle
                    page.wait_for_timeout(1000)
                    
                    # Screenshot filename
                    screenshot_path = os.path.join(screenshots_dir, f"{name}_mobile.png")
                    page.screenshot(path=screenshot_path, full_page=True)
                    print(f"  [Screenshot saved] -> {screenshot_path}")
                    
                    # Run javascript checks for horizontal overflow
                    overflow_check = page.evaluate("""
                        () => {
                            const docWidth = document.documentElement.scrollWidth;
                            const winWidth = window.innerWidth;
                            const hasOverflow = docWidth > winWidth;
                            
                            let overflowingElements = [];
                            if (hasOverflow) {
                                const allElements = document.querySelectorAll('*');
                                for (const el of allElements) {
                                    const rect = el.getBoundingClientRect();
                                    if (rect.right > winWidth + 1 || rect.left < -1) {
                                        // Filter out script, style tags, wrappers that are just container but have no visible overflow
                                        const style = window.getComputedStyle(el);
                                        if (style.display !== 'none' && style.visibility !== 'hidden') {
                                            overflowingElements.push({
                                                tagName: el.tagName.toLowerCase(),
                                                id: el.id || '',
                                                className: el.className || '',
                                                left: rect.left,
                                                right: rect.right,
                                                width: rect.width
                                            });
                                        }
                                    }
                                }
                            }
                            
                            return {
                                windowWidth: winWidth,
                                scrollWidth: docWidth,
                                hasOverflow: hasOverflow,
                                overflowingCount: overflowingElements.length,
                                overflowingElements: overflowingElements.slice(0, 10) // top 10 elements
                            };
                        }
                    """)
                    
                    page_errors = list(console_errors)
                    console_errors.clear() # Reset for next page
                    
                    report_entry = {
                        "name": name,
                        "url": url,
                        "status": "Success",
                        "screenshot": screenshot_path,
                        "windowWidth": overflow_check["windowWidth"],
                        "scrollWidth": overflow_check["scrollWidth"],
                        "hasOverflow": overflow_check["hasOverflow"],
                        "overflowingElements": overflow_check["overflowingElements"],
                        "consoleErrors": page_errors
                    }
                    
                    report.append(report_entry)
                    
                    # Output immediate feedback
                    if overflow_check["hasOverflow"]:
                        print(f"  [WARNING] Horizontal overflow detected! ScrollWidth: {overflow_check['scrollWidth']}px vs ViewportWidth: {overflow_check['windowWidth']}px")
                        print(f"  [Overflowing Elements count: {overflow_check['overflowingCount']}]")
                        for el in overflow_check["overflowingElements"][:3]:
                            print(f"    - <{el['tagName']} id='{el['id']}' class='{el['className']}'> width={el['width']:.1f}px, left={el['left']:.1f}px, right={el['right']:.1f}px")
                    else:
                        print("  [OK] No horizontal overflow detected.")
                        
                    if page_errors:
                        print(f"  [Console Errors] {len(page_errors)} detected:")
                        for err in page_errors[:3]:
                            print(f"    - {err}")
                            
                except Exception as e:
                    print(f"  [ERROR] Failed to check page: {e}")
                    report.append({
                        "name": name,
                        "url": url,
                        "status": f"Failed: {e}"
                    })
                    
            browser.close()
            
    finally:
        if server_process is not None:
            print("\nShutting down server...")
            server_process.terminate()
            server_process.wait()
            print("Server shutdown completed.")
        
    # Write report file
    write_markdown_report(report, screenshots_dir)

def write_markdown_report(report, screenshots_dir):
    report_path = os.path.join(os.getcwd(), "mobile_view_report.md")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# TRI Website Mobile View Diagnostics Report\n\n")
        f.write("This report displays diagnostic results for the TRI website on mobile viewport (iPhone 13 Pro emulation, width=390px).\n\n")
        
        # Summary table
        f.write("## Summary Status\n\n")
        f.write("| Page | URL | Status | Horiz. Scroll? | Scroll Width / Viewport | Errors |\n")
        f.write("| --- | --- | --- | --- | --- | --- |\n")
        for entry in report:
            if entry["status"] != "Success":
                f.write(f"| **{entry['name']}** | {entry['url']} | ❌ {entry['status']} | - | - | - |\n")
                continue
                
            overflow_status = "⚠️ YES" if entry["hasOverflow"] else "✅ No"
            err_status = f"❌ {len(entry['consoleErrors'])} errors" if entry["consoleErrors"] else "✅ 0 errors"
            f.write(f"| **{entry['name']}** | [{entry['name']}]({entry['url']}) | ✅ Success | {overflow_status} | {entry['scrollWidth']}px / {entry['windowWidth']}px | {err_status} |\n")
            
        f.write("\n---\n\n")
        
        # Page Details
        f.write("## Page-by-Page Details\n\n")
        for entry in report:
            f.write(f"### {entry['name'].capitalize()} Page\n")
            f.write(f"- **URL**: {entry['url']}\n")
            
            if entry["status"] != "Success":
                f.write(f"- **Status**: ❌ {entry['status']}\n\n")
                continue
                
            f.write(f"- **Viewport Width**: {entry['windowWidth']}px\n")
            f.write(f"- **Scroll Width**: {entry['scrollWidth']}px\n")
            f.write(f"- **Horizontal Overflow**: {'⚠️ YES' if entry['hasOverflow'] else '✅ No'}\n")
            
            if entry["hasOverflow"]:
                f.write("\n#### Overflowing Elements (Top Candidates):\n")
                f.write("```\n")
                for el in entry["overflowingElements"]:
                    id_str = f" id='{el['id']}'" if el['id'] else ""
                    class_str = f" class='{el['className']}'" if el['className'] else ""
                    f.write(f"<{el['tagName']}{id_str}{class_str}> width={el['width']:.1f}px, left={el['left']:.1f}px, right={el['right']:.1f}px\n")
                f.write("```\n")
                
            if entry["consoleErrors"]:
                f.write("\n#### Console Errors:\n")
                f.write("```\n")
                for err in entry["consoleErrors"]:
                    f.write(f"{err}\n")
                f.write("```\n")
            else:
                f.write("- **Console Errors**: None\n")
                
            screenshot_rel = os.path.relpath(entry["screenshot"], os.getcwd())
            # Convert Windows backslash to forward slash for Markdown link
            screenshot_rel_url = screenshot_rel.replace("\\", "/")
            f.write(f"\n**Screenshot**:\n![{entry['name']} Mobile View]({screenshot_rel_url})\n\n")
            f.write("---\n\n")
            
    print(f"\nDetailed report written to: {report_path}")

if __name__ == "__main__":
    check_mobile_view()
