-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add sizes to products and size to order_items
-- Run this in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add sizes column to products table
-- This holds the comma-separated list of sizes (e.g. "3.5 x 10mm, 4.0 x 12mm")
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes text;

-- ── 2. Add size column to order_items table
-- This stores the selected size for each ordered item
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size text;
