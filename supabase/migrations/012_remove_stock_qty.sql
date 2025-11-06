-- Migration: Remove stock_qty column from earrings table
-- Keep sold_qty and broken_qty for statistics tracking

-- Step 1: Update trigger functions to remove stock_qty references

-- Update the junction table trigger function (booking_earrings)
CREATE OR REPLACE FUNCTION update_earring_stock_from_junction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only update sold_qty (remove stock_qty)
    UPDATE earrings
    SET sold_qty = sold_qty + NEW.qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle sold_qty changes if earring or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.qty != NEW.qty THEN
      -- Revert old earring
      UPDATE earrings
      SET sold_qty = sold_qty - OLD.qty
      WHERE id = OLD.earring_id;
      
      -- Apply new earring
      UPDATE earrings
      SET sold_qty = sold_qty + NEW.qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert sold_qty
    UPDATE earrings
    SET sold_qty = sold_qty - OLD.qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update the broken earrings trigger function
CREATE OR REPLACE FUNCTION update_earring_stock_from_broken()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only update broken_qty (remove stock_qty)
    UPDATE earrings
    SET broken_qty = broken_qty + NEW.qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle broken_qty changes if earring or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.qty != NEW.qty THEN
      -- Revert old earring
      UPDATE earrings
      SET broken_qty = broken_qty - OLD.qty
      WHERE id = OLD.earring_id;
      
      -- Apply new earring
      UPDATE earrings
      SET broken_qty = broken_qty + NEW.qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert broken_qty
    UPDATE earrings
    SET broken_qty = broken_qty - OLD.qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update the legacy bookings trigger function (if it still exists)
-- Note: This function may not be used anymore since we use junction tables
CREATE OR REPLACE FUNCTION update_earring_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only update sold_qty (remove stock_qty)
    UPDATE earrings
    SET sold_qty = sold_qty + NEW.earring_qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle sold_qty changes if earring or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.earring_qty != NEW.earring_qty THEN
      -- Revert old earring
      UPDATE earrings
      SET sold_qty = sold_qty - OLD.earring_qty
      WHERE id = OLD.earring_id;
      
      -- Apply new earring
      UPDATE earrings
      SET sold_qty = sold_qty + NEW.earring_qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert sold_qty
    UPDATE earrings
    SET sold_qty = sold_qty - OLD.earring_qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Remove stock_qty column from earrings table
ALTER TABLE earrings DROP COLUMN IF EXISTS stock_qty;

