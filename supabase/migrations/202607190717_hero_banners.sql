-- Create hero_banners table
CREATE TABLE IF NOT EXISTS hero_banners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text,
  headline    text,
  subheadline text,
  cta_label   text,
  cta_link    text,
  sort_order  int DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- SELECT policy: anyone can read active banners
CREATE POLICY "anyone can view active hero banners"
  ON hero_banners FOR SELECT
  USING (active = true);

-- Write/Modify policy: admin only
CREATE POLICY "admin manages hero banners"
  ON hero_banners FOR ALL TO authenticated
  USING (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));
