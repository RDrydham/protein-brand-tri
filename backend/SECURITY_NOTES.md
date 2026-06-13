# TRI Backend Security Notes

## Default Admin Credentials

| Field    | Value                          |
|----------|-------------------------------|
| Email    | `admin@therealinside.com`     |
| Password | `admin123`                    |

> **⚠️ CRITICAL: Change the admin password immediately after your first deploy.**
>
> Run the helper script to generate a new hash and update the database:
> ```bash
> node scripts/seed-admin.js <your-new-password>
> # Copy the printed SQL and run it against the production DB
> ```

---

## JWT Policy

| Setting        | Value              |
|----------------|--------------------|
| Secret source  | `process.env.JWT_SECRET` (never hardcoded) |
| Token expiry   | 7 days (`7d`)      |
| Algorithm      | HS256 (jsonwebtoken default) |

**Recommendations:**
- Set `JWT_SECRET` to a random 64-character string: `openssl rand -hex 32`
- Store it in GitHub Secrets as `JWT_SECRET` — never commit it to the repo
- Consider reducing expiry to `1d` in production and implementing refresh tokens

---

## Rate Limiting

| Route                   | Window   | Max Requests |
|-------------------------|----------|-------------|
| All `/api/*` routes     | 15 min   | 100         |
| `/api/auth/login`       | 15 min   | 10          |
| `/api/auth/register`    | 15 min   | 10          |

Both auth limiters are applied **on top of** the global limiter (most restrictive wins).

---

## Password Hashing

- Algorithm: **bcrypt** with cost factor **10**
- Library: `bcrypt` v5.x (uses native bindings — faster + more secure than `bcryptjs`)
- The seed admin hash is generated programmatically — see `scripts/seed-admin.js`

---

## CORS Policy

Allowed origins:
- `https://therealinside.com`
- `http://localhost`
- `http://localhost:3000`

Update `server.js` CORS config if you add a staging domain.

---

## Production Checklist

- [ ] Change default admin password (see above)
- [ ] Set a strong `JWT_SECRET` in GitHub Secrets (min 32 chars, random)
- [ ] Set real `DB_PASSWORD` — not the default `postgres`
- [ ] Configure real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- [ ] Run `certbot` for HTTPS on the domain
- [ ] Verify `/health` returns `{ "status": "ok" }` after deploy
- [ ] Remove `http://localhost` from CORS origins in production
