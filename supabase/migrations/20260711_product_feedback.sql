-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add product feedback & ratings table
-- Run this in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT  unique_product_user_feedback UNIQUE (product_id, user_id)
);

-- Enable RLS on feedback
ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active feedback
CREATE POLICY "anyone can view product feedback"
  ON product_feedback FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own feedback
CREATE POLICY "authenticated users can insert own feedback"
  ON product_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can update their own feedback
CREATE POLICY "authenticated users can update own feedback"
  ON product_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own feedback, admins can delete all
CREATE POLICY "users or admins can delete feedback"
  ON product_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Policy: Allow public read access to profiles name/details for reviews
DROP POLICY IF EXISTS "user reads own profile" ON profiles;
DROP POLICY IF EXISTS "admin reads all profiles" ON profiles;
CREATE POLICY "anyone can read profiles" ON profiles FOR SELECT USING (true);

-- Add rating columns to products table if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

-- Trigger to auto-update rating averages
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    rating_avg = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM product_feedback
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM product_feedback
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_rating_stats ON product_feedback;
CREATE TRIGGER trigger_update_product_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON product_feedback
  FOR EACH ROW EXECUTE PROCEDURE update_product_rating_stats();
