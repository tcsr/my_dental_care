-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Phase 1 taxonomy — implant subtype + bone plate/fixation categories
-- Additive & backward-compatible. Run in Supabase Dashboard → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Implant subtype (one_piece | two_piece | NULL). NULL = legacy behavior.
ALTER TABLE products ADD COLUMN IF NOT EXISTS implant_subtype text
  CHECK (implant_subtype IN ('one_piece', 'two_piece'));

-- 2. New product categories (distinct from existing "Bone Graft").
--    bg_color / text_color / icon columns match the existing product_categories seed.
-- icon column stores an emoji (matches the existing seed convention).
INSERT INTO product_categories (name, bg_color, text_color, icon)
VALUES
  ('Bone Plate',     'rgba(100,116,139,0.12)', '#64748b', '🦴'),
  ('Fixation Screw', 'rgba(120,113,108,0.12)', '#78716c', '🔩')
ON CONFLICT (name) DO NOTHING;
