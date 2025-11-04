-- Migration: Support multiple earrings and services per booking

-- Create junction table for booking earrings
CREATE TABLE booking_earrings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  earring_id UUID NOT NULL REFERENCES earrings(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for booking services
CREATE TABLE booking_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing data from bookings to junction tables
INSERT INTO booking_earrings (booking_id, earring_id, qty)
SELECT id, earring_id, earring_qty
FROM bookings
WHERE earring_id IS NOT NULL;

INSERT INTO booking_services (booking_id, service_id, price)
SELECT id, service_id, service_price
FROM bookings
WHERE service_id IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX idx_booking_earrings_booking_id ON booking_earrings(booking_id);
CREATE INDEX idx_booking_earrings_earring_id ON booking_earrings(earring_id);
CREATE INDEX idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX idx_booking_services_service_id ON booking_services(service_id);

-- Update function to handle stock updates from junction table
CREATE OR REPLACE FUNCTION update_earring_stock_from_junction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease stock, increase sold
    UPDATE earrings
    SET stock_qty = stock_qty - NEW.qty,
        sold_qty = sold_qty + NEW.qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle stock changes if earring or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.qty != NEW.qty THEN
      -- Revert old earring
      UPDATE earrings
      SET stock_qty = stock_qty + OLD.qty,
          sold_qty = sold_qty - OLD.qty
      WHERE id = OLD.earring_id;
      
      -- Apply new earring
      UPDATE earrings
      SET stock_qty = stock_qty - NEW.qty,
          sold_qty = sold_qty + NEW.qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert stock and sold
    UPDATE earrings
    SET stock_qty = stock_qty + OLD.qty,
        sold_qty = sold_qty - OLD.qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for junction table
CREATE TRIGGER booking_earring_junction_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON booking_earrings
  FOR EACH ROW
  EXECUTE FUNCTION update_earring_stock_from_junction();

-- Update profit calculation to aggregate from junction tables
CREATE OR REPLACE FUNCTION calculate_profit()
RETURNS TRIGGER AS $$
DECLARE
  total_earring_cost NUMERIC(10, 2) := 0;
BEGIN
  -- Calculate total earring cost from junction table
  SELECT COALESCE(SUM(
    COALESCE(e.cost, 0) * be.qty
  ), 0) INTO total_earring_cost
  FROM booking_earrings be
  JOIN earrings e ON e.id = be.earring_id
  WHERE be.booking_id = NEW.id;
  
  -- Fallback to legacy field if no junction table entries
  IF total_earring_cost = 0 AND NEW.earring_cost IS NOT NULL THEN
    total_earring_cost = NEW.earring_cost;
  END IF;
  
  NEW.profit = NEW.total_paid - (
    total_earring_cost +
    COALESCE(NEW.booksy_fee, 0) +
    COALESCE(NEW.broken_earring_loss, 0) +
    COALESCE(NEW.tax_amount, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for new tables
ALTER TABLE booking_earrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for junction tables
CREATE POLICY "Allow all for authenticated users" ON booking_earrings
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON booking_services
  FOR ALL USING (true);

-- Note: We keep the old columns (earring_id, service_id, etc.) for backward compatibility
-- They can be removed in a future migration if needed

