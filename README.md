# TRI — The Real Inside | Backend

Complete Node.js backend for therealinside.com

## ✅ Issues Solved

- ✅ Node.js Backend (Express.js)
- ✅ PostgreSQL Database
- ✅ Login / Register (JWT + Bcrypt)
- ✅ Persistent Cart (Database + Redis Cache)
- ✅ Orders System (with transaction safety)
- ✅ Address Book (CRUD)
- ✅ Razorpay Payment
- ✅ Email System (Nodemailer)
- ✅ Admin Panel APIs
- ✅ Newsletter Subscribe
- ✅ Security (Helmet, Rate Limiting, CORS)
- ✅ CI/CD (GitHub Actions — with test gate)
- ✅ Monitoring (Grafana + Prometheus)
- ✅ Docker + NGINX
- ✅ Redis Cache Layer

---

## 🔧 Known Issues Fixed (Audit 2026-06)

| Issue | File | Fix |
|-------|------|-----|
| Fake bcrypt hash for seed admin | `db/schema.sql` | Replaced with real `bcrypt.hashSync('admin123', 10)` output |
| Transaction leak: empty cart `BEGIN` with no `ROLLBACK` | `routes/orders.js` | Added `ROLLBACK` before all early returns inside transaction |
| `admin.js` middleware crashes if `req.user` is undefined | `middleware/admin.js` | Added null-guard returning 401 before role check |
| `redis` dependency unused | `package.json` | Wired as real cache layer (`utils/cache.js`) |
| JWT expired vs invalid not distinguished | `middleware/auth.js` | `TokenExpiredError` returns `"Token expired!"` message |
| No tests — CI deploys without validation | `backend/tests/` | Full Jest + Supertest suite added |
| No `test` job in GitHub Actions | `.github/workflows/deploy.yml` | `test` job added; `deploy` requires it to pass |
| `addresses` table has no API | `routes/addresses.js` | Full CRUD + default-address endpoint added |
| No security documentation | `backend/SECURITY_NOTES.md` | Created with credentials, JWT, rate-limit docs |

---

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/auth/profile` *(auth required)*
- `PUT  /api/auth/profile` *(auth required)*

### Products
- `GET /api/products` *(cached 60s)*
- `GET /api/products/:slug` *(cached 60s)*

### Cart *(all auth required)*
- `GET    /api/cart` *(cached 30s per user)*
- `POST   /api/cart/add`
- `PUT    /api/cart/:id`
- `DELETE /api/cart/:id`
- `DELETE /api/cart` *(clear all)*

### Addresses *(all auth required)*
- `GET    /api/addresses`
- `POST   /api/addresses`
- `PUT    /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `PUT    /api/addresses/:id/default`

### Orders *(all auth required)*
- `POST /api/orders/place` — accepts `address` (raw JSON) **or** `address_id` (from address book)
- `GET  /api/orders/history`
- `GET  /api/orders/:order_number`

### Payment *(all auth required)*
- `POST /api/payment/create-order`
- `POST /api/payment/verify`

### Newsletter
- `POST /api/newsletter/subscribe`

### Admin *(all auth + admin role required)*
- `GET  /api/admin/stats`
- `GET  /api/admin/orders`
- `PUT  /api/admin/orders/:id/status`
- `GET  /api/admin/users`
- `GET  /api/admin/products`
- `POST /api/admin/products`
- `PUT  /api/admin/products/:id`
- `GET  /api/admin/newsletter`

---

## Setup

1. Clone repo
2. Copy `.env.example` to `.env` and fill values
3. Run: `docker compose up -d --build`
4. Done!

---

## 🚀 First Deploy Checklist

- [ ] **Change the default admin password** — run `node scripts/seed-admin.js <new-password>` and execute the printed SQL
- [ ] Set a strong `JWT_SECRET` in GitHub Secrets (use `openssl rand -hex 32`)
- [ ] Set real `DB_PASSWORD` (not the default `postgres`)
- [ ] Set real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- [ ] Set real `EMAIL` and `EMAIL_PASSWORD` for order confirmations
- [ ] Run `certbot` for HTTPS: `certbot --nginx -d therealinside.com`
- [ ] Verify health endpoint: `curl https://therealinside.com/health`
- [ ] Remove `http://localhost` and `http://localhost:3000` from CORS in production

---

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `SERVER_IP` | GCP VM public IP |
| `SERVER_USER` | SSH user (e.g. `ubuntu`) |
| `SSH_KEY` | Private SSH key |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `RAZORPAY_KEY_ID` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret |
| `EMAIL` | Gmail address for notifications |
| `EMAIL_PASSWORD` | Gmail app password |
| `GRAFANA_PASSWORD` | Grafana admin password |

---

## Running Tests

```bash
cd backend
npm test
```

Tests require a running PostgreSQL instance (uses `.env` or `DATABASE_URL`).  
The GitHub Actions `test` job provides a `services: postgres` container automatically.

See `backend/SECURITY_NOTES.md` for security configuration details.
