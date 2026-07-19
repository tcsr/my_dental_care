-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  diameter    text,
  length      text,
  sku         text,
  stock_qty   int NOT NULL DEFAULT 0,
  price_delta numeric(10,2) DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Policies (mirroring products table policies)
CREATE POLICY "anyone can view active product variants"
  ON product_variants FOR SELECT
  USING (active = true);

CREATE POLICY "admin manages product variants"
  ON product_variants FOR ALL TO authenticated
  USING (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Add variant_id to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id);

-- Atomic stock decrement function
CREATE OR REPLACE FUNCTION decrement_variant_stock(p_variant_id uuid, p_qty int)
RETURNS void SECURITY DEFINER AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Get parent product ID
  SELECT product_id INTO v_product_id FROM product_variants WHERE id = p_variant_id;

  -- Decrement variant stock
  UPDATE product_variants
  SET stock_qty = stock_qty - p_qty
  WHERE id = p_variant_id
    AND stock_qty >= p_qty;

  -- Decrement parent product stock (if tracked)
  IF v_product_id IS NOT NULL THEN
    UPDATE products
    SET stock_qty = stock_qty - p_qty
    WHERE id = v_product_id
      AND stock_qty IS NOT NULL
      AND stock_qty >= p_qty;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION decrement_variant_stock(uuid, int) TO authenticated;
