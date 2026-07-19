-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add is_featured flag to products (landing carousel highlights)
-- Additive & backward-compatible. Run in Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
