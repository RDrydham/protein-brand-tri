import os
import glob
import re

privacy_content = """
  <section class="ct-section" style="padding: 100px 0; background: var(--cream);">
    <div style="max-width: 800px; margin: 0 auto; padding: 0 40px; font-family: var(--font-sans); color: var(--dark); line-height: 1.7;">
      <h2 style="font-family: var(--font-serif); font-size: 32px; font-weight: 700; margin-bottom: 24px;">Privacy Policy</h2>
      <p style="margin-bottom: 16px;"><strong>Effective Date:</strong> June 10, 2026</p>
      <p style="margin-bottom: 24px;">Welcome to <strong>The Real Inside</strong>. We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.</p>
      
      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">1. Information We Collect</h3>
      <ul style="list-style: disc; padding-left: 20px; margin-bottom: 24px;">
        <li style="margin-bottom: 8px;"><strong>Identity & Contact Data:</strong> Your full name, email address, phone number, billing address, and shipping address.</li>
        <li style="margin-bottom: 8px;"><strong>Transaction Data:</strong> Details about payments to and from you and other details of products you have purchased from us.</li>
        <li style="margin-bottom: 8px;"><strong>Technical Data:</strong> Internet protocol (IP) address, browser type and version, time zone setting, and operating system used to access our site.</li>
      </ul>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">2. How We Use Your Information</h3>
      <p style="margin-bottom: 16px;">We use your personal data primarily to fulfill our contract with you and improve our services. Specifically, we use your data to:</p>
      <ul style="list-style: disc; padding-left: 20px; margin-bottom: 24px;">
        <li style="margin-bottom: 8px;">Process and deliver your orders (including managing payments and shipping).</li>
        <li style="margin-bottom: 8px;">Communicate with you regarding your order, customer support inquiries, or policy updates.</li>
        <li style="margin-bottom: 8px;">Send you marketing communications (only if you have opted in to receive them).</li>
        <li style="margin-bottom: 8px;">Improve our website, products, and overall customer experience.</li>
      </ul>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">3. Third-Party Tools & Sharing</h3>
      <p style="margin-bottom: 16px;">To operate our business effectively, we use various third-party service providers. We may share your data with these trusted third parties, which include payment processors, shipping partners, and analytics tools. These third parties are only permitted to use your personal data to perform specific tasks on our behalf.</p>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">4. Data Security</h3>
      <p style="margin-bottom: 24px;">We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. However, please be aware that no method of transmission over the internet is 100% secure.</p>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">5. Contact Us</h3>
      <p style="margin-bottom: 24px;">If you have any questions about this Privacy Policy, please contact us at <strong>hello@atriwellness.com</strong>.</p>
    </div>
  </section>
"""

terms_content = """
  <section class="ct-section" style="padding: 100px 0; background: var(--cream);">
    <div style="max-width: 800px; margin: 0 auto; padding: 0 40px; font-family: var(--font-sans); color: var(--dark); line-height: 1.7;">
      <h2 style="font-family: var(--font-serif); font-size: 32px; font-weight: 700; margin-bottom: 24px;">Terms & Conditions</h2>
      <p style="margin-bottom: 24px;">These terms govern the use of our website and the purchase of our products. By placing an order with The Real Inside, you acknowledge and agree to the following terms:</p>
      
      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">1. Product & Health Disclaimer</h3>
      <p style="margin-bottom: 24px;">Our products are formulated as dietary supplements and must be used strictly as directed on the packaging. They are not intended to diagnose, treat, cure, or prevent any disease. Please note that individual results may vary from person to person.</p>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">2. Order Cancellations</h3>
      <p style="margin-bottom: 24px;">We strive to process and ship orders as quickly as possible. Therefore, once an order has been dispatched from our facility, it cannot be cancelled or modified.</p>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">3. Returns & Refunds</h3>
      <p style="margin-bottom: 24px;">For health, safety, and hygiene reasons, <strong>opened or used products are strictly non-returnable and non-refundable</strong>. We appreciate your understanding in helping us maintain the highest quality standards.</p>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">4. Damaged or Incorrect Items</h3>
      <p style="margin-bottom: 24px;">If you receive a damaged, defective, or incorrect product, please contact our customer support team at hello@atriwellness.com within <strong>48 hours of delivery</strong>. We will require photographic evidence of the issue to process a replacement or resolution promptly.</p>

      <h3 style="font-family: var(--font-serif); font-size: 24px; font-weight: 600; margin-top: 32px; margin-bottom: 16px;">5. Modifications to Service and Prices</h3>
      <p style="margin-bottom: 24px;">The Real Inside reserves the right to update, modify, or discontinue product prices, promotional offers, and website content at any time, without prior notice.</p>
    </div>
  </section>
"""

# Read contact.html as a template
with open("contact.html", "r", encoding="utf-8") as f:
    html = f.read()

# Extract from start to the end of the <nav id="tri-nav"> section
header_match = re.search(r'^(.*?</nav>)', html, re.DOTALL | re.IGNORECASE)
header = header_match.group(1) if header_match else ""

# Extract from <div class="ticker-wrap" to the end of file
footer_match = re.search(r'(<div class="ticker-wrap".*?)$', html, re.DOTALL | re.IGNORECASE)
footer = footer_match.group(1) if footer_match else ""

if not header or not footer:
    print("Could not extract header or footer properly.")
    exit(1)

# Function to fix links in the template
def fix_links(text):
    text = text.replace('href="contact.html#privacy"', 'href="privacy.html"')
    text = text.replace('href="contact.html#terms"', 'href="terms.html"')
    text = text.replace('href="#"', 'href="javascript:void(0)"') # Just generic
    return text

header = fix_links(header)
footer = fix_links(footer)

# Fix title and meta tags
privacy_header = header.replace('<title>ATRI | Contact Us</title>', '<title>ATRI | Privacy Policy</title>')
terms_header = header.replace('<title>ATRI | Contact Us</title>', '<title>ATRI | Terms & Conditions</title>')

# Assemble pages
privacy_html = privacy_header + "\n" + privacy_content + "\n" + footer
terms_html = terms_header + "\n" + terms_content + "\n" + footer

# Write files
with open("privacy.html", "w", encoding="utf-8") as f:
    f.write(privacy_html)
with open("terms.html", "w", encoding="utf-8") as f:
    f.write(terms_html)

print("Created privacy.html and terms.html")

# Now update all HTML files to point to these
html_files = glob.glob("*.html")
for file in html_files:
    if file in ["privacy.html", "terms.html"]:
        continue
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    modified = False
    
    # Simple regex to find the links in the footer that say Privacy Policy or Terms
    # In index.html: <a href="contact.html#privacy">Privacy Policy</a>
    # In contact.html: <li><a href="#">Privacy Policy</a></li>
    
    # We will just replace exactly what we know:
    if 'href="contact.html#privacy"' in content:
        content = content.replace('href="contact.html#privacy"', 'href="privacy.html"')
        modified = True
    if 'href="contact.html#terms"' in content:
        content = content.replace('href="contact.html#terms"', 'href="terms.html"')
        modified = True
    
    # Some pages might have <a href="#">Privacy Policy</a>
    new_content = re.sub(r'<a[^>]*?>Privacy Policy</a>', '<a href="privacy.html">Privacy Policy</a>', content)
    if new_content != content:
        content = new_content
        modified = True
        
    new_content = re.sub(r'<a[^>]*?>Terms & Conditions</a>', '<a href="terms.html">Terms & Conditions</a>', content)
    if new_content != content:
        content = new_content
        modified = True
        
    new_content = re.sub(r'<a[^>]*?>Terms of Service</a>', '<a href="terms.html">Terms of Service</a>', content)
    if new_content != content:
        content = new_content
        modified = True

    if modified:
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated links in {file}")

print("Done.")
