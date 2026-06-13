# TRI — The Real Inside | Backend

Complete Node.js backend for therealinside.com

## Issues Solved

- ✅ Node.js Backend (Express.js)
- ✅ PostgreSQL Database
- ✅ Login / Register (JWT + Bcrypt)
- ✅ Persistent Cart (Database)
- ✅ Orders System
- ✅ Razorpay Payment
- ✅ Email System (Nodemailer)
- ✅ Admin Panel APIs
- ✅ Newsletter Subscribe
- ✅ Security (Helmet, Rate Limiting, CORS)
- ✅ CI/CD (GitHub Actions)
- ✅ Monitoring (Grafana + Prometheus)
- ✅ Docker + NGINX

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/profile
- PUT  /api/auth/profile

### Products
- GET /api/products
- GET /api/products/:slug

### Cart
- GET    /api/cart
- POST   /api/cart/add
- PUT    /api/cart/:id
- DELETE /api/cart/:id

### Orders
- POST /api/orders/place
- GET  /api/orders/history
- GET  /api/orders/:order_number

### Payment
- POST /api/payment/create-order
- POST /api/payment/verify

### Newsletter
- POST /api/newsletter/subscribe

### Admin
- GET /api/admin/stats
- GET /api/admin/orders
- PUT /api/admin/orders/:id/status
- GET /api/admin/users
- GET /api/admin/products
- POST /api/admin/products
- PUT /api/admin/products/:id

## Setup

1. Clone repo
2. Copy .env.example to .env and fill values
3. Run: docker compose up -d --build
4. Done!

## GitHub Secrets Required

- SERVER_IP
- SERVER_USER
- SSH_KEY
- DB_PASSWORD
- JWT_SECRET
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- EMAIL
- EMAIL_PASSWORD
- GRAFANA_PASSWORD
