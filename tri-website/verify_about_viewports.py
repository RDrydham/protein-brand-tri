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

def verify_about():
    server_process = None
    if is_port_open(3000):
        print("TRI website server is already running on port 3000. Reusing it.")
    else:
        print("Starting TRI website server via node server.js...")
        server_process = subprocess.Popen(
            ["node", "server.js"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.getcwd()
        )
        time.sleep(2)
        if server_process.poll() is not None:
            stdout, stderr = server_process.communicate()
            print(f"Error: Server failed to start.\nStdout: {stdout}\nStderr: {stderr}")
            sys.exit(1)
        print("Server started successfully.")
    
    screenshots_dir = os.path.join(os.getcwd(), "mobile_screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)
    
    url = "http://localhost:3000/about"
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            
            # --- 1. Desktop Viewport ---
            print("Capturing Desktop screenshot...")
            desktop_context = browser.new_context(viewport={"width": 1920, "height": 1080})
            desktop_page = desktop_context.new_page()
            desktop_page.goto(url)
            desktop_page.wait_for_load_state("networkidle")
            # Wait for loader to disappear and GSAP animations to finish
            desktop_page.wait_for_timeout(4000)
            desktop_screenshot = os.path.join(screenshots_dir, "about_desktop.png")
            desktop_page.screenshot(path=desktop_screenshot, full_page=False)
            print(f"  [Desktop Saved] -> {desktop_screenshot}")
            desktop_context.close()
            
            # --- 2. Tablet Viewport ---
            print("Capturing Tablet screenshot...")
            tablet_context = browser.new_context(viewport={"width": 768, "height": 1024})
            tablet_page = tablet_context.new_page()
            tablet_page.goto(url)
            tablet_page.wait_for_load_state("networkidle")
            tablet_page.wait_for_timeout(4000)
            tablet_screenshot = os.path.join(screenshots_dir, "about_tablet.png")
            tablet_page.screenshot(path=tablet_screenshot, full_page=False)
            print(f"  [Tablet Saved] -> {tablet_screenshot}")
            tablet_context.close()
            
            # --- 3. Mobile Viewport (iPhone 13 Pro) ---
            print("Capturing Mobile screenshot...")
            iphone = p.devices['iPhone 13 Pro']
            mobile_context = browser.new_context(**iphone)
            mobile_page = mobile_context.new_page()
            mobile_page.goto(url)
            mobile_page.wait_for_load_state("networkidle")
            mobile_page.wait_for_timeout(4000)
            mobile_screenshot = os.path.join(screenshots_dir, "about_mobile.png")
            # For mobile, let's take a longer view of the page, or full page
            mobile_page.screenshot(path=mobile_screenshot, full_page=True)
            print(f"  [Mobile Saved] -> {mobile_screenshot}")
            mobile_context.close()
            
            browser.close()
            
    finally:
        if server_process is not None:
            print("Shutting down server...")
            server_process.terminate()
            server_process.wait()
            print("Server shutdown completed.")

if __name__ == "__main__":
    verify_about()
