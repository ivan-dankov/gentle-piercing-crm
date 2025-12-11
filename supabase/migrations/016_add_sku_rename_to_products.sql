-- Migration: Add SKU column and rename earrings to products

-- Step 1: Add SKU column to earrings table (before renaming)
ALTER TABLE earrings
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Step 2: Rename tables
ALTER TABLE earrings RENAME TO products;
ALTER TABLE booking_earrings RENAME TO booking_products;
ALTER TABLE booking_broken_earrings RENAME TO booking_broken_products;

-- Step 3: Rename columns in junction tables (earring_id -> product_id)
ALTER TABLE booking_products
RENAME COLUMN earring_id TO product_id;

ALTER TABLE booking_broken_products
RENAME COLUMN earring_id TO product_id;

-- Step 4: Update foreign key constraints (drop old, create new)
ALTER TABLE booking_products
DROP CONSTRAINT IF EXISTS booking_earrings_earring_id_fkey,
DROP CONSTRAINT IF EXISTS booking_products_earring_id_fkey;

ALTER TABLE booking_products
ADD CONSTRAINT booking_products_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE booking_broken_products
DROP CONSTRAINT IF EXISTS booking_broken_earrings_earring_id_fkey,
DROP CONSTRAINT IF EXISTS booking_broken_products_earring_id_fkey;

ALTER TABLE booking_broken_products
ADD CONSTRAINT booking_broken_products_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Step 5: Update foreign key references in bookings table (legacy fields - keep earring_id column name for now)
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_earring_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_product_id_fkey
FOREIGN KEY (earring_id) REFERENCES products(id) ON DELETE SET NULL;

-- Step 6: Update trigger functions to use new table/column names
CREATE OR REPLACE FUNCTION update_product_stock_from_junction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only update sold_qty
    UPDATE products
    SET sold_qty = sold_qty + NEW.qty
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle sold_qty changes if product or qty changed
    IF OLD.product_id != NEW.product_id OR OLD.qty != NEW.qty THEN
      -- Revert old product
      UPDATE products
      SET sold_qty = sold_qty - OLD.qty
      WHERE id = OLD.product_id;
      
      -- Apply new product
      UPDATE products
      SET sold_qty = sold_qty + NEW.qty
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert sold_qty
    UPDATE products
    SET sold_qty = sold_qty - OLD.qty
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_stock_from_broken()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only update broken_qty
    UPDATE products
    SET broken_qty = broken_qty + NEW.qty
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle broken_qty changes if product or qty changed
    IF OLD.product_id != NEW.product_id OR OLD.qty != NEW.qty THEN
      -- Revert old product
      UPDATE products
      SET broken_qty = broken_qty - OLD.qty
      WHERE id = OLD.product_id;
      
      -- Apply new product
      UPDATE products
      SET broken_qty = broken_qty + NEW.qty
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert broken_qty
    UPDATE products
    SET broken_qty = broken_qty - OLD.qty
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only update sold_qty
    UPDATE products
    SET sold_qty = sold_qty + NEW.earring_qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle sold_qty changes if product or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.earring_qty != NEW.earring_qty THEN
      -- Revert old product
      UPDATE products
      SET sold_qty = sold_qty - OLD.earring_qty
      WHERE id = OLD.earring_id;
      
      -- Apply new product
      UPDATE products
      SET sold_qty = sold_qty + NEW.earring_qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert sold_qty
    UPDATE products
    SET sold_qty = sold_qty - OLD.earring_qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update profit calculation function
CREATE OR REPLACE FUNCTION calculate_profit()
RETURNS TRIGGER AS $$
DECLARE
  total_product_cost NUMERIC(10, 2) := 0;
BEGIN
  -- Calculate total product cost from junction table
  SELECT COALESCE(SUM(
    COALESCE(p.cost, 0) * bp.qty
  ), 0) INTO total_product_cost
  FROM booking_products bp
  JOIN products p ON p.id = bp.product_id
  WHERE bp.booking_id = NEW.id;
  
  -- Fallback to legacy field if no junction table entries
  IF total_product_cost = 0 AND NEW.earring_cost IS NOT NULL THEN
    total_product_cost = NEW.earring_cost;
  END IF;
  
  NEW.profit = NEW.total_paid - (
    total_product_cost +
    COALESCE(NEW.booksy_fee, 0) +
    COALESCE(NEW.broken_earring_loss, 0) +
    COALESCE(NEW.tax_amount, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Update triggers
DROP TRIGGER IF EXISTS booking_earring_junction_stock_trigger ON booking_products;
CREATE TRIGGER booking_product_junction_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON booking_products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_from_junction();

DROP TRIGGER IF EXISTS booking_broken_earring_stock_trigger ON booking_broken_products;
CREATE TRIGGER booking_broken_product_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON booking_broken_products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_from_broken();

DROP TRIGGER IF EXISTS booking_earring_stock_trigger ON bookings;
CREATE TRIGGER booking_product_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Step 9: Update indexes
DROP INDEX IF EXISTS idx_booking_earrings_booking_id;
DROP INDEX IF EXISTS idx_booking_earrings_earring_id;
DROP INDEX IF EXISTS idx_booking_broken_earrings_booking_id;
DROP INDEX IF EXISTS idx_booking_broken_earrings_earring_id;
DROP INDEX IF EXISTS idx_earrings_active;
DROP INDEX IF EXISTS idx_earrings_user_id;
DROP INDEX IF EXISTS idx_booking_earrings_user_id;
DROP INDEX IF EXISTS idx_booking_broken_earrings_user_id;

CREATE INDEX idx_booking_products_booking_id ON booking_products(booking_id);
CREATE INDEX idx_booking_products_product_id ON booking_products(product_id);
CREATE INDEX idx_booking_broken_products_booking_id ON booking_broken_products(booking_id);
CREATE INDEX idx_booking_broken_products_product_id ON booking_broken_products(product_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_products_user_id ON booking_products(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_broken_products_user_id ON booking_broken_products(user_id);

-- Step 10: Update RLS policies
-- Drop old policies (they may have been renamed automatically, but drop explicitly)
DROP POLICY IF EXISTS "Users can view their own earrings" ON products;
DROP POLICY IF EXISTS "Users can insert their own earrings" ON products;
DROP POLICY IF EXISTS "Users can update their own earrings" ON products;
DROP POLICY IF EXISTS "Users can delete their own earrings" ON products;

DROP POLICY IF EXISTS "Users can view their own booking_earrings" ON booking_products;
DROP POLICY IF EXISTS "Users can insert their own booking_earrings" ON booking_products;
DROP POLICY IF EXISTS "Users can update their own booking_earrings" ON booking_products;
DROP POLICY IF EXISTS "Users can delete their own booking_earrings" ON booking_products;

DROP POLICY IF EXISTS "Users can view their own booking_broken_earrings" ON booking_broken_products;
DROP POLICY IF EXISTS "Users can insert their own booking_broken_earrings" ON booking_broken_products;
DROP POLICY IF EXISTS "Users can update their own booking_broken_earrings" ON booking_broken_products;
DROP POLICY IF EXISTS "Users can delete their own booking_broken_earrings" ON booking_broken_products;

-- Create new policies with correct table names
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own booking_products" ON booking_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking_products" ON booking_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking_products" ON booking_products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking_products" ON booking_products
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own booking_broken_products" ON booking_broken_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking_broken_products" ON booking_broken_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking_broken_products" ON booking_broken_products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking_broken_products" ON booking_broken_products
  FOR DELETE USING (auth.uid() = user_id);
