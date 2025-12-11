-- Add 'card' to payment_method check constraint
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_payment_method_check;

ALTER TABLE bookings
ADD CONSTRAINT bookings_payment_method_check 
CHECK (payment_method IN ('cash', 'blik', 'card'));
