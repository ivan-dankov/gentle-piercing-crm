-- Migration: Add user isolation to all tables
-- This ensures each user only sees and manages their own data

-- Step 1: Add user_id columns to main tables (nullable initially)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE earrings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Add user_id columns to junction tables
ALTER TABLE booking_earrings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE booking_services 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE booking_broken_earrings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 3: Find user ID for piercinggentle@gmail.com and assign existing data
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Find the user ID for piercinggentle@gmail.com
  SELECT id INTO default_user_id
  FROM auth.users
  WHERE email = 'piercinggentle@gmail.com'
  LIMIT 1;

  -- If user exists, assign all existing data to them
  IF default_user_id IS NOT NULL THEN
    -- Assign existing clients
    UPDATE clients 
    SET user_id = default_user_id 
    WHERE user_id IS NULL;

    -- Assign existing earrings
    UPDATE earrings 
    SET user_id = default_user_id 
    WHERE user_id IS NULL;

    -- Assign existing services
    UPDATE services 
    SET user_id = default_user_id 
    WHERE user_id IS NULL;

    -- Assign existing bookings
    UPDATE bookings 
    SET user_id = default_user_id 
    WHERE user_id IS NULL;

    -- Assign junction tables based on parent booking's user_id
    UPDATE booking_earrings be
    SET user_id = b.user_id
    FROM bookings b
    WHERE be.booking_id = b.id 
      AND be.user_id IS NULL 
      AND b.user_id IS NOT NULL;

    UPDATE booking_services bs
    SET user_id = b.user_id
    FROM bookings b
    WHERE bs.booking_id = b.id 
      AND bs.user_id IS NULL 
      AND b.user_id IS NOT NULL;

    UPDATE booking_broken_earrings bbe
    SET user_id = b.user_id
    FROM bookings b
    WHERE bbe.booking_id = b.id 
      AND bbe.user_id IS NULL 
      AND b.user_id IS NOT NULL;
  END IF;
END $$;

-- Step 4: Set NOT NULL constraint after backfilling data
ALTER TABLE clients 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE earrings 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE services 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE bookings 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE booking_earrings 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE booking_services 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE booking_broken_earrings 
ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Add indexes on user_id for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_earrings_user_id ON earrings(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_earrings_user_id ON booking_earrings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_user_id ON booking_services(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_broken_earrings_user_id ON booking_broken_earrings(user_id);

-- Step 6: Drop existing RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON earrings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON services;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON booking_earrings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON booking_services;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON booking_broken_earrings;

-- Step 7: Create new RLS policies that check user_id
-- SELECT policies
CREATE POLICY "Users can view their own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own earrings" ON earrings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own services" ON services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own booking_earrings" ON booking_earrings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own booking_services" ON booking_services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own booking_broken_earrings" ON booking_broken_earrings
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT policies (automatically set user_id to auth.uid())
CREATE POLICY "Users can insert their own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own earrings" ON earrings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own services" ON services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking_earrings" ON booking_earrings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking_services" ON booking_services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking_broken_earrings" ON booking_broken_earrings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE policies
CREATE POLICY "Users can update their own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own earrings" ON earrings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services" ON services
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking_earrings" ON booking_earrings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking_services" ON booking_services
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking_broken_earrings" ON booking_broken_earrings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE policies
CREATE POLICY "Users can delete their own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own earrings" ON earrings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services" ON services
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings" ON bookings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking_earrings" ON booking_earrings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking_services" ON booking_services
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking_broken_earrings" ON booking_broken_earrings
  FOR DELETE USING (auth.uid() = user_id);

