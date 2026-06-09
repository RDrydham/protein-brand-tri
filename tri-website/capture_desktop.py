import os
import time
from playwright.sync_api import sync_playwright

def capture_desktop():
    screenshots_dir = os.path.join(os.getcwd(), "mobile_screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)
    screenshot_path = os.path.join(screenshots_dir, "home_desktop.png")
    
    print("Capturing desktop screenshot...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 1920x1080 desktop viewport
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        try:
            page.goto("http://localhost:3000/")
            page.wait_for_load_state("networkidle")
            time.sleep(2) # Allow animations/js to settle
            
            # Take screenshot of the hero section or full page
            page.screenshot(path=screenshot_path)
            print(f"[Screenshot saved] -> {screenshot_path}")
        except Exception as e:
            print(f"Error capturing screenshot: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture_desktop()
