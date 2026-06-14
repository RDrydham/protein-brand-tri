# ═══════════════════════════════════════════════════════════════════
#   GCP VM — Backend Fix Karne Ke Steps
#   (GCP Console → Compute Engine → SSH kholo)
# ═══════════════════════════════════════════════════════════════════

# STEP 1: Project folder mein jao
cd ~/protein-brand-tri
# Ya jahan bhi project upload kiya tha:
# cd ~/ATRI

# STEP 2: Latest code pull karo (ab fixes aa jayenge)
git pull origin main

# STEP 3: .env file create karo (pehle se hai toh skip karo)
nano .env
# Paste karo ye content aur apni values fill karo:
# ---------------------------------------------------
# DB_HOST=db
# DB_USER=postgres
# DB_NAME=tridb
# DB_PASSWORD=KoiStrongPassword123!
# JWT_SECRET=YehBahutLambaRandomStringHoniChahiye123456789
# RAZORPAY_KEY_ID=rzp_live_xxxxxx
# RAZORPAY_KEY_SECRET=xxxxxxxxxx
# EMAIL=gmail@gmail.com
# EMAIL_PASSWORD=app-password-here
# NODE_ENV=production
# ---------------------------------------------------
# Save: Ctrl+X → Y → Enter

# STEP 4: Purana sab band karo
sudo docker-compose down

# STEP 5: Fresh start karo (--build lagao taaki nayi image bane)
sudo docker-compose up -d --build

# STEP 6: Check karo sab chal raha hai
sudo docker-compose ps

# STEP 7: Backend ka test karo (success: {"status":"ok",...})
curl http://localhost:3000/health

# STEP 8: Agar PORT 80/443 open nahi hai GCP Firewall mein:
# GCP Console → VPC Network → Firewall → Create Rule:
#   Name: allow-web
#   Direction: Ingress
#   Source: 0.0.0.0/0
#   Protocols: tcp:80,443

# ─── TROUBLESHOOTING ─────────────────────────────────────────────

# Agar backend crash ho raha hai, log dekho:
sudo docker-compose logs backend --tail=50

# Agar database nahi chal raha:
sudo docker-compose logs db --tail=30

# Sab restart karo:
sudo docker-compose restart

# Puri tarah se fresh start (DATA DELETE HOGI):
# sudo docker-compose down -v
# sudo docker-compose up -d --build
