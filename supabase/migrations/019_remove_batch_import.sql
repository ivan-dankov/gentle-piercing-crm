-- Migration 019: Remove all batch-imported March 2026 bookings
-- Deletes only bookings tagged with [batch-import-2026-03].
-- booking_services and booking_products are removed automatically via ON DELETE CASCADE.

DELETE FROM bookings
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'piercinggentle@gmail.com' LIMIT 1)
  AND notes LIKE '%[batch-import-2026-03]%';
