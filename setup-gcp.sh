#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#   TRI Backend — GCP VM Complete Setup Script
#   Run this ONCE on a fresh Google Cloud VM
#   Usage: bash setup-gcp.sh
# ═══════════════════════════════════════════════════════════════

set -e  # Stop on any error

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   TRI Backend — GCP Setup Starting...   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Update system ───────────────────────────────────────────
echo "📦 Step 1: System update..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Install Docker ──────────────────────────────────────────
echo "🐳 Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo bash
    sudo usermod -aG docker $USER
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# ── 3. Install Docker Compose ──────────────────────────────────
echo "🐳 Step 3: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# ── 4. Install Certbot (SSL) ───────────────────────────────────
echo "🔐 Step 4: Installing Certbot..."
sudo apt-get install -y certbot
echo "✅ Certbot installed"

# ── 5. Create .env file ────────────────────────────────────────
echo ""
echo "⚙️  Step 5: Setting up environment variables..."
if [ ! -f .env ]; then
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 48)
    DB_PASS=$(openssl rand -base64 24)

    cat > .env << EOF
# ─── Database ──────────────────────
DB_PASSWORD=${DB_PASS}
DB_HOST=db
DB_USER=postgres
DB_NAME=tridb

# ─── JWT ──────────────────────────
JWT_SECRET=${JWT_SECRET}

# ─── Razorpay ─────────────────────
# Apni Razorpay keys yahan daalen:
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

# ─── Email (Gmail) ────────────────
# Gmail address aur App Password:
EMAIL=your@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
EOF
    echo "✅ .env file created (JWT_SECRET aur DB_PASSWORD auto-generated)"
    echo ""
    echo "⚠️  RAZORPAY aur EMAIL credentials .env mein daalni padegi!"
    echo "   File: $(pwd)/.env"
else
    echo "✅ .env file already exists"
fi

# ── 6. SSL Certificate (HTTPS) ────────────────────────────────
echo ""
echo "🔐 Step 6: SSL Certificate setup..."
mkdir -p /var/www/certbot
echo ""
echo "Domain ke liye SSL certificate lenge."
echo "Aapka domain kya hai? (e.g., therealaside.com ya therealinside.com)"
read -p "Domain: " DOMAIN

if [ -n "$DOMAIN" ]; then
    # Temporarily stop nginx if running
    sudo docker-compose down nginx 2>/dev/null || true
    
    # Get SSL certificate
    sudo certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email admin@${DOMAIN} \
        --no-eff-email || echo "⚠️ SSL failed — HTTP par chal lenge pehle"
    
    echo "✅ SSL certificate created for $DOMAIN"
    
    # Update nginx.conf with correct domain
    sed -i "s/therealinside.com/$DOMAIN/g" nginx/nginx.conf
    sed -i "s/therealaside.com/$DOMAIN/g" nginx/nginx.conf
    echo "✅ Nginx config updated with domain: $DOMAIN"
fi

# ── 7. Start everything with Docker Compose ───────────────────
echo ""
echo "🚀 Step 7: Starting all services..."
sudo docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# ── 8. Verify everything is running ───────────────────────────
echo ""
echo "✅ Step 8: Checking service status..."
sudo docker-compose ps

echo ""
echo "🔍 Testing backend health..."
sleep 5
curl -s http://localhost:3000/health && echo "" || echo "⚠️ Backend not responding yet — thoda wait karo"

# ── 9. Auto-renew SSL ──────────────────────────────────────────
echo ""
echo "📅 Step 9: Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx") | crontab -
echo "✅ SSL auto-renewal cron added"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      ✅ SETUP COMPLETE!                 ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Backend: http://localhost:3000/health  ║"
echo "║  Website: https://your-domain.com       ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📝 ABHI YEH KARO:"
echo "   1. nano .env  → Razorpay + Email keys daalo"
echo "   2. docker-compose restart backend"
echo ""
