-- Migration: Add reviews table
-- Run this ONCE on the live production database.
-- Safe to re-run (uses IF NOT EXISTS).
--
-- On GCP/server, run with:
--   docker exec -i tri-db-1 psql -U postgres -d tridb < backend/db/migrate_add_reviews.sql
-- OR via docker-compose:
--   docker compose exec db psql -U postgres -d tridb -f /docker-entrypoint-initdb.d/migrate_add_reviews.sql

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, product_name)
);

-- Confirm
SELECT 'reviews table ready' AS status;
