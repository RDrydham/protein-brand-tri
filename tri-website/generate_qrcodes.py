import subprocess
import sys
import os

# Auto-install dependencies if not present
try:
    import qrcode
    from PIL import Image
except ImportError:
    print("Installing required packages (qrcode, pillow)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode[pil]"])
    import qrcode
    from PIL import Image

import qrcode.image.svg

def generate_qrs(url, file_prefix, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Generate Standard Black & White SVG (Vector - Best for printing press)
    svg_factory = qrcode.image.svg.SvgPathImage
    # Using high error correction for vector SVGs too
    qr_svg = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
        image_factory=svg_factory
    )
    qr_svg.add_data(url)
    qr_svg.make(fit=True)
    svg_img = qr_svg.make_image()
    svg_path = os.path.join(output_dir, f"{file_prefix}_standard.svg")
    with open(svg_path, 'wb') as f:
        svg_img.save(f)
    print(f"Generated Vector SVG: {svg_path}")
    
    # 2. Generate Standard Black & White High-Res PNG (3000x3000px, 300 DPI)
    # We use a box_size that results in a large image.
    qr = qrcode.QRCode(
        version=None, # Auto-detect version based on URL length
        error_correction=qrcode.constants.ERROR_CORRECT_H, # High error correction (best for printing/wear)
        box_size=100, # Large boxes for high resolution
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # Standard BW PNG
    img_bw = qr.make_image(fill_color="black", back_color="white")
    png_bw_path = os.path.join(output_dir, f"{file_prefix}_standard.png")
    img_bw.save(png_bw_path)
    print(f"Generated High-Res PNG (Black/White): {png_bw_path}")
    
    # 3. Generate Clay Colored PNG (using brand primary #D06A37)
    # Hex D06A37 is RGB (208, 106, 55)
    img_clay = qr.make_image(fill_color=(208, 106, 55), back_color="white")
    png_clay_path = os.path.join(output_dir, f"{file_prefix}_clay.png")
    img_clay.save(png_clay_path)
    print(f"Generated High-Res PNG (Clay): {png_clay_path}")
    
    # 4. Generate Clay SVG
    # We generate a SvgImage (rects) and replace fill color
    svg_clay_path = os.path.join(output_dir, f"{file_prefix}_clay.svg")
    
    qr_svg_rect = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
        image_factory=qrcode.image.svg.SvgImage
    )
    qr_svg_rect.add_data(url)
    qr_svg_rect.make(fit=True)
    svg_img_rect = qr_svg_rect.make_image()
    
    import io
    buf = io.BytesIO()
    svg_img_rect.save(buf)
    svg_xml = buf.getvalue().decode('utf-8')
    
    # Replace the fill color in SVG xml
    # The default SvgImage uses fill="#000000"
    svg_xml_clay = svg_xml.replace('fill="#000000"', 'fill="#D06A37"')
    with open(svg_clay_path, 'w', encoding='utf-8') as f:
        f.write(svg_xml_clay)
    print(f"Generated Vector SVG (Clay): {svg_clay_path}")

if __name__ == "__main__":
    output_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), "assets", "qr"))
    
    # QR 1: Short redirect URL (Highly Recommended)
    print("Generating QR codes for short URL (https://therealinside.com/lab)...")
    generate_qrs("https://therealinside.com/lab", "qr_lab_short", output_directory)
    
    # QR 2: Full URL (https://therealinside.com/lab-reports)
    print("\nGenerating QR codes for full URL (https://therealinside.com/lab-reports)...")
    generate_qrs("https://therealinside.com/lab-reports", "qr_lab_full", output_directory)
    
    print("\nAll QR code generation completed successfully!")
