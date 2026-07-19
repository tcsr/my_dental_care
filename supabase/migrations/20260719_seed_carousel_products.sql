-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Seed missing carousel fallback products into the products table
-- These are the products shown on the landing page carousel when the DB is empty.
-- After seeding, the carousel will use live DB products and the detail page
-- will route to /product/:id correctly for all carousel items.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── SLIDE 1 — One Piece / Basal / Compression Implants ─────────────────────

INSERT INTO products (name, category, price, description, image_url, sizes, active, implant_subtype)
VALUES
  (
    'Mono Implant 3.5mm',
    'Compression',
    2900,
    'Single-piece compression implant with 3.5mm diameter. Ideal for narrow ridges with immediate loading capability. Grade 5 Titanium, SLA surface.',
    'products/two-piece-implant.jpeg',
    '3.5 x 8mm, 3.5 x 10mm, 3.5 x 12mm, 3.5 x 14mm',
    true,
    'one_piece'
  ),
  (
    'Mono Implant 4.2mm',
    'Compression',
    2900,
    'Single-piece compression implant with 4.2mm diameter. Superior primary stability for immediate loading protocols. Grade 5 Titanium, SLA surface.',
    'products/two-piece-implant.jpeg',
    '4.2 x 8mm, 4.2 x 10mm, 4.2 x 12mm, 4.2 x 14mm',
    true,
    'one_piece'
  ),
  (
    'Basal Implant 4.0mm',
    'Basal',
    3200,
    'Basal bone implant 4.0mm diameter. Anchored in the cortical basal bone for high primary stability. Suitable for immediate loading even in compromised bone.',
    'products/two-piece-implant.jpeg',
    '4.0 x 10mm, 4.0 x 12mm, 4.0 x 14mm, 4.0 x 16mm',
    true,
    'one_piece'
  ),
  (
    'Basal Implant 4.5mm',
    'Basal',
    3200,
    'Basal bone implant 4.5mm diameter. Wide-body design for high bone contact area and stability. Suitable for posterior immediate loading.',
    'products/two-piece-implant.jpeg',
    '4.5 x 10mm, 4.5 x 12mm, 4.5 x 14mm, 4.5 x 16mm',
    true,
    'one_piece'
  )
ON CONFLICT DO NOTHING;

-- ── SLIDE 2 — Two Piece / Root Form Implants ───────────────────────────────

INSERT INTO products (name, category, price, description, image_url, sizes, active, implant_subtype)
VALUES
  (
    'Root Form Classic 3.5mm',
    'Root Form',
    2500,
    'Classic two-piece root-form implant 3.5mm. Compatible with standard surgical kits. Grade 5 Titanium with HA/SLA surface for enhanced osseointegration.',
    'products/two-piece-implant.jpeg',
    '3.5 x 8.5mm, 3.5 x 10mm, 3.5 x 11.5mm, 3.5 x 13mm',
    true,
    'two_piece'
  ),
  (
    'Root Form Classic 4.3mm',
    'Root Form',
    2500,
    'Classic two-piece root-form implant 4.3mm. Standard diameter for most clinical scenarios. Excellent primary stability and broad prosthetic compatibility.',
    'products/two-piece-implant.jpeg',
    '4.3 x 8.5mm, 4.3 x 10mm, 4.3 x 11.5mm, 4.3 x 13mm',
    true,
    'two_piece'
  ),
  (
    'Root Form Classic 5.0mm',
    'Root Form',
    2500,
    'Wide-body two-piece root-form implant 5.0mm. For wide ridges and molar replacements. Superior stability with large implant-bone contact surface.',
    'products/two-piece-implant.jpeg',
    '5.0 x 8.5mm, 5.0 x 10mm, 5.0 x 11.5mm',
    true,
    'two_piece'
  )
ON CONFLICT DO NOTHING;

-- ── SLIDE 2 — Standard Surgical Kit ────────────────────────────────────────

INSERT INTO products (name, category, price, description, image_url, active)
VALUES
  (
    'Standard Surgical Kit',
    'General Instruments',
    18000,
    'Complete standard surgical kit for two-piece root-form implant placement. Includes drills, depth gauges, torque wrench, and implant drivers. Titanium and stainless steel instruments.',
    'products/apexkonnect-kit.jpeg',
    true
  )
ON CONFLICT DO NOTHING;

-- ── SLIDE 3 — Bone Plates and Fixation Screws ──────────────────────────────

INSERT INTO products (name, category, price, description, image_url, active)
VALUES
  (
    'L-Plate 4 Hole',
    'Bone Plate',
    1200,
    'L-shaped titanium bone plate with 4 holes. Used for mandibular angle fractures and osteotomy fixation. Grade 5 Titanium, gamma sterilized.',
    'products/bone-plates.jpeg',
    true
  ),
  (
    'Straight Plate 6 Hole',
    'Bone Plate',
    1500,
    'Straight titanium bone plate with 6 holes. For symphysis and parasymphysis fractures, sagittal split osteotomies. Grade 5 Titanium, gamma sterilized.',
    'products/bone-plates.jpeg',
    true
  ),
  (
    'Fixation Screw 2.0mm',
    'Fixation Screw',
    350,
    'Self-tapping titanium fixation screw 2.0mm diameter. For use with bone plates in maxillofacial and orthognathic surgery. Grade 5 Titanium, gamma sterilized.',
    'products/bone-screws.jpeg',
    true
  )
ON CONFLICT DO NOTHING;

-- ── SLIDE 1 — Basal Surgical Kit (bonus) ───────────────────────────────────

INSERT INTO products (name, category, price, description, image_url, active)
VALUES
  (
    'Basal Surgical Kit',
    'General Instruments',
    15000,
    'Complete surgical kit for one-piece basal and compression implant placement. Includes cortical drills, step drills, paralleling pins, depth gauges, and torque wrench. Color-coded for easy identification.',
    'products/dental-implant-kit.jpeg',
    true
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
