#!/bin/bash
# ════════════════════════════════════════════════
#   TRI Backend — Fix & Restart Script
#   GCP SSH mein run karo: bash fix-backend.sh
# ════════════════════════════════════════════════

echo "🔍 Checking Docker status..."
sudo docker-compose ps

echo ""
echo "📋 Backend logs (last 30 lines):"
sudo docker-compose logs backend --tail=30

echo ""
echo "📋 Database logs (last 20 lines):"
sudo docker-compose logs db --tail=20

echo ""
echo "🔍 Checking .env file..."
if [ -f .env ]; then
    echo "✅ .env exists. Keys present:"
    grep -E "^(DB_PASSWORD|JWT_SECRET|NODE_ENV)" .env | sed 's/=.*/=***/'
else
    echo "❌ .env file MISSING! Creating with defaults..."
    JWT_SEC=$(openssl rand -base64 48 | tr -d '\n')
    DB_PW=$(openssl rand -base64 16 | tr -d '\n')
    cat > .env << EOF
DB_HOST=db
DB_USER=postgres
DB_NAME=tridb
DB_PASSWORD=${DB_PW}
JWT_SECRET=${JWT_SEC}
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=placeholder_secret
EMAIL=no-reply@therealinside.com
EMAIL_PASSWORD=placeholder
NODE_ENV=production
PORT=3000
EOF
    echo "✅ .env created with auto-generated secrets"
fi

echo ""
echo "🔄 Stopping all containers..."
sudo docker-compose down

echo ""
echo "🏗️  Rebuilding and starting (this takes 1-2 min)..."
sudo docker-compose up -d --build

echo ""
echo "⏳ Waiting 40 seconds for services to start..."
sleep 40

echo ""
echo "📊 Final status:"
sudo docker-compose ps

echo ""
echo "🧪 Testing backend health:"
HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "✅ Backend is UP: $HEALTH"
else
    echo "❌ Backend not responding — checking logs:"
    sudo docker-compose logs backend --tail=20
fi
