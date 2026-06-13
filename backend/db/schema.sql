-- TRI Database Schema
-- Run this file to setup database

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  role VARCHAR(20) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  image VARCHAR(255),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cart Table
CREATE TABLE IF NOT EXISTS cart (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_id VARCHAR(100),
  razorpay_order_id VARCHAR(100),
  address TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Newsletter Table
CREATE TABLE IF NOT EXISTS newsletter (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default products
INSERT INTO products (name, slug, description, price, original_price, stock, image, category) VALUES
('TRI Fusion Pack', 'tri-fusion-pack', 'Protein + EAAs + Pre-Workout — 9 Sachets. Experience the complete 3-day performance protocol.', 599.00, 899.00, 100, '/assets/tri_fusion_pack_ad.webp', 'bundle'),
('TRI True Whey Protein', 'tri-true-whey', 'Clear whey that actually digests. 24.5g cold-processed grass-fed whey concentrate.', 1299.00, 1599.00, 50, '/assets/whey_russian_chocolate.webp', 'protein'),
('TRI Power BCAA', 'tri-power-bcaa', '7g BCAAs at the gold-standard 2:1:1 ratio, plus 3g hydration electrolytes.', 999.00, 1299.00, 75, '/assets/bcaa_mojito.webp', 'bcaa'),
('TRI Pump Drake Pre-Workout', 'tri-pump-drake', '6g Citrulline Malate, 3.2g Beta-Alanine, and 200mg natural caffeine.', 1199.00, 1499.00, 60, '/assets/drake_lemon_lime.webp', 'pre-workout')
ON CONFLICT (slug) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password, role, is_verified) VALUES
('TRI Admin', 'admin@therealinside.com', '$2b$10$rBnQKXxDnF5Q5Q5Q5Q5Q5OzKXxDnF5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5u', 'admin', true)
ON CONFLICT (email) DO NOTHING;
