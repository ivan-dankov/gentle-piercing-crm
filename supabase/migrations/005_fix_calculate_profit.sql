-- Migration: Fix calculate_profit function to use correct cost column and handle broken earrings

-- Update calculate_profit function to handle broken earrings from junction table
CREATE OR REPLACE FUNCTION calculate_profit()
RETURNS TRIGGER AS $$
DECLARE
  total_earring_cost NUMERIC(10, 2) := 0;
  total_broken_earring_cost NUMERIC(10, 2) := 0;
BEGIN
  -- Calculate total earring cost from junction table (using correct 'cost' column)
  SELECT COALESCE(SUM(
    COALESCE(e.cost, 0) * be.qty
  ), 0) INTO total_earring_cost
  FROM booking_earrings be
  JOIN earrings e ON e.id = be.earring_id
  WHERE be.booking_id = NEW.id;
  
  -- Calculate total broken earring cost from junction table
  SELECT COALESCE(SUM(
    COALESCE(be_broken.cost, e_broken.cost, 0) * be_broken.qty
  ), 0) INTO total_broken_earring_cost
  FROM booking_broken_earrings be_broken
  JOIN earrings e_broken ON e_broken.id = be_broken.earring_id
  WHERE be_broken.booking_id = NEW.id;
  
  -- Fallback to legacy field if no junction table entries
  IF total_earring_cost = 0 AND NEW.earring_cost IS NOT NULL THEN
    total_earring_cost = NEW.earring_cost;
  END IF;
  
  -- Use broken_earring_loss from junction table if available, otherwise use legacy field
  IF total_broken_earring_cost = 0 AND NEW.broken_earring_loss IS NOT NULL THEN
    total_broken_earring_cost = NEW.broken_earring_loss;
  END IF;
  
  NEW.profit = NEW.total_paid - (
    total_earring_cost +
    COALESCE(NEW.booksy_fee, 0) +
    total_broken_earring_cost +
    COALESCE(NEW.tax_amount, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
