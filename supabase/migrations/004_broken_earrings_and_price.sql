-- Migration: Add price to booking_earrings and create booking_broken_earrings table

-- Add price column to booking_earrings (nullable, allows price override)
ALTER TABLE booking_earrings 
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NULL;

-- Add broken_qty column to earrings table to track broken items
ALTER TABLE earrings
ADD COLUMN IF NOT EXISTS broken_qty INTEGER DEFAULT 0;

-- Create junction table for broken earrings
CREATE TABLE IF NOT EXISTS booking_broken_earrings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  earring_id UUID NOT NULL REFERENCES earrings(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  cost NUMERIC(10, 2) NULL, -- nullable, allows cost override
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_broken_earrings_booking_id ON booking_broken_earrings(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_broken_earrings_earring_id ON booking_broken_earrings(earring_id);

-- Create trigger for broken earrings to update stock (decrease stock, increase broken)
CREATE OR REPLACE FUNCTION update_earring_stock_from_broken()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease stock, increase broken
    UPDATE earrings
    SET stock_qty = stock_qty - NEW.qty,
        broken_qty = COALESCE(broken_qty, 0) + NEW.qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle stock changes if earring or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.qty != NEW.qty THEN
      -- Revert old earring
      UPDATE earrings
      SET stock_qty = stock_qty + OLD.qty,
          broken_qty = COALESCE(broken_qty, 0) - OLD.qty
      WHERE id = OLD.earring_id;
      
      -- Apply new earring
      UPDATE earrings
      SET stock_qty = stock_qty - NEW.qty,
          broken_qty = COALESCE(broken_qty, 0) + NEW.qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert stock and broken
    UPDATE earrings
    SET stock_qty = stock_qty + OLD.qty,
        broken_qty = COALESCE(broken_qty, 0) - OLD.qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for broken earrings stock updates
DROP TRIGGER IF EXISTS booking_broken_earring_stock_trigger ON booking_broken_earrings;
CREATE TRIGGER booking_broken_earring_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON booking_broken_earrings
  FOR EACH ROW
  EXECUTE FUNCTION update_earring_stock_from_broken();

-- Enable RLS for new table
ALTER TABLE booking_broken_earrings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for booking_broken_earrings
CREATE POLICY "Allow all for authenticated users" ON booking_broken_earrings
  FOR ALL USING (true);
