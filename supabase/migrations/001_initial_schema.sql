-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  source TEXT CHECK (source IN ('booksy', 'instagram', 'referral', 'walk-in')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Earrings table
CREATE TABLE earrings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  cost_belarus NUMERIC(10, 2),
  cost_poland NUMERIC(10, 2),
  sale_price NUMERIC(10, 2) NOT NULL,
  stock_qty INTEGER DEFAULT 0,
  sold_qty INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  earring_id UUID REFERENCES earrings(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  earring_qty INTEGER DEFAULT 1,
  earring_cost NUMERIC(10, 2),
  earring_revenue NUMERIC(10, 2),
  service_price NUMERIC(10, 2) DEFAULT 0,
  is_model BOOLEAN DEFAULT false,
  travel_fee NUMERIC(10, 2) DEFAULT 20,
  booksy_fee NUMERIC(10, 2) DEFAULT 0,
  custom_discount NUMERIC(10, 2) DEFAULT 0,
  broken_earring_loss NUMERIC(10, 2) DEFAULT 0,
  total_paid NUMERIC(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'blik')),
  tax_enabled BOOLEAN DEFAULT false,
  tax_rate NUMERIC(5, 2) DEFAULT 8.5,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  location TEXT,
  notes TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  profit NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update earring stock and sold quantities
CREATE OR REPLACE FUNCTION update_earring_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease stock, increase sold
    UPDATE earrings
    SET stock_qty = stock_qty - NEW.earring_qty,
        sold_qty = sold_qty + NEW.earring_qty
    WHERE id = NEW.earring_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle stock changes if earring or qty changed
    IF OLD.earring_id != NEW.earring_id OR OLD.earring_qty != NEW.earring_qty THEN
      -- Revert old earring
      UPDATE earrings
      SET stock_qty = stock_qty + OLD.earring_qty,
          sold_qty = sold_qty - OLD.earring_qty
      WHERE id = OLD.earring_id;
      
      -- Apply new earring
      UPDATE earrings
      SET stock_qty = stock_qty - NEW.earring_qty,
          sold_qty = sold_qty + NEW.earring_qty
      WHERE id = NEW.earring_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert stock and sold
    UPDATE earrings
    SET stock_qty = stock_qty + OLD.earring_qty,
        sold_qty = sold_qty - OLD.earring_qty
    WHERE id = OLD.earring_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update earring stock
CREATE TRIGGER booking_earring_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_earring_stock();

-- Function to calculate profit
CREATE OR REPLACE FUNCTION calculate_profit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profit = NEW.total_paid - (
    COALESCE(NEW.earring_cost, 0) +
    COALESCE(NEW.booksy_fee, 0) +
    COALESCE(NEW.broken_earring_loss, 0) +
    COALESCE(NEW.tax_amount, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate profit
CREATE TRIGGER booking_profit_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profit();

-- Function to calculate tax amount
CREATE OR REPLACE FUNCTION calculate_tax()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tax_enabled THEN
    NEW.tax_amount = (NEW.total_paid * NEW.tax_rate / 100);
  ELSE
    NEW.tax_amount = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate tax
CREATE TRIGGER booking_tax_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_tax();

-- Function to set service_price to 0 if is_model is true
CREATE OR REPLACE FUNCTION handle_model_service()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_model THEN
    NEW.service_price = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle model service
CREATE TRIGGER booking_model_service_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_model_service();

-- Create indexes for better performance
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_earring_id ON bookings(earring_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_earrings_active ON earrings(active);
CREATE INDEX idx_services_active ON services(active);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE earrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users - adjust based on your auth setup)
CREATE POLICY "Allow all for authenticated users" ON clients
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON earrings
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON services
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON bookings
  FOR ALL USING (true);

