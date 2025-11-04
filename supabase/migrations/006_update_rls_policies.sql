-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON earrings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON services;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bookings;

-- Create new RLS policies that properly check authentication
CREATE POLICY "Allow all for authenticated users" ON clients
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON earrings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON services
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON bookings
  FOR ALL USING (auth.uid() IS NOT NULL);

