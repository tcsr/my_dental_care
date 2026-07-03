-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Gap fixes for Simple Implant
-- Run this in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── FIX 1: update_own_profile → set approved = FALSE on registration
-- This ensures new doctor registrations go through admin approval
-- before getting access to the portal.
-- NOTE: Existing approved users are NOT affected (only INSERT/UPDATE matters on new rows)

CREATE OR REPLACE FUNCTION update_own_profile(
  p_id uuid,
  p_name text,
  p_clinic_name text,
  p_phone text,
  p_address text,
  p_gst_number text
)
RETURNS void SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET 
    name = p_name,
    clinic_name = p_clinic_name,
    phone = p_phone,
    address = p_address,
    gst_number = p_gst_number
    -- NOTE: approved is intentionally NOT set here.
    -- Admins approve via the Admin Panel using handleApprove().
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;


-- ── FIX 2: Add handle_new_user trigger to set approved = FALSE by default
-- New users must be approved by admin before logging in.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, name, approved)
  VALUES (new.id, 'doctor', new.raw_user_meta_data->>'name', FALSE);
  RETURN new;
END;
$$;

-- Re-create the trigger (drop old one first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- ── FIX 3: Atomic stock decrement RPC
-- Safely decrements stock_qty only if sufficient stock is available.
-- Skips products with NULL stock_qty (untracked products).

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty int)
RETURNS void SECURITY DEFINER AS $$
BEGIN
  UPDATE products
  SET stock_qty = stock_qty - p_qty
  WHERE id = p_product_id
    AND stock_qty IS NOT NULL
    AND stock_qty >= p_qty;
  -- If stock is insufficient or null, silently does nothing.
  -- Business logic should prevent ordering out-of-stock items via UI.
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, int) TO authenticated;


-- ── FIX 4 (Optional): Remove auto-confirm trigger if email confirmation was disabled
-- The confirm_user_email_on_approval trigger auto-confirmed emails when approved=true.
-- This is still correct — it will fire when admin approves a doctor.
-- No change needed here.

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────
