-- Migration 020: Fix calculate_profit trigger + backfill earring_cost for imported bookings
--
-- Root cause: calculate_profit() fires BEFORE INSERT ON bookings, but booking_products rows
-- are inserted AFTER the booking. So at trigger time, total_product_cost = 0, meaning:
--   - profit = total_paid (no product cost deducted)
--   - earring_cost is never written by the trigger (it only reads it as a fallback)
--
-- Fix 1: Update trigger to ALSO write NEW.earring_cost so it stays in sync.
-- Fix 2: Backfill earring_cost and profit for all existing bookings where earring_cost IS NULL
--        but booking_products exist (i.e. imported/bulk-inserted bookings).

-- ── Step 1: Update calculate_profit() to write earring_cost ──────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_profit()
RETURNS TRIGGER AS $$
DECLARE
  total_product_cost NUMERIC(10, 2) := 0;
BEGIN
  -- Calculate total product cost from junction table (purchase cost × qty)
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

  -- Keep earring_cost in sync so the dashboard can read it directly
  NEW.earring_cost = total_product_cost;

  NEW.profit = NEW.total_paid - (
    total_product_cost +
    COALESCE(NEW.booksy_fee, 0) +
    COALESCE(NEW.broken_earring_loss, 0) +
    COALESCE(NEW.tax_amount, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Step 2: Backfill earring_cost + profit for bookings where earring_cost is NULL ────────────
-- This covers all batch-imported bookings (and any others created without going through the form).
UPDATE bookings b
SET
  earring_cost = sub.product_cost,
  profit = b.total_paid - (
    sub.product_cost +
    COALESCE(b.booksy_fee, 0) +
    COALESCE(b.broken_earring_loss, 0) +
    COALESCE(b.tax_amount, 0)
  )
FROM (
  SELECT
    bp.booking_id,
    COALESCE(SUM(COALESCE(p.cost, 0) * bp.qty), 0) AS product_cost
  FROM booking_products bp
  JOIN products p ON p.id = bp.product_id
  GROUP BY bp.booking_id
) sub
WHERE b.id = sub.booking_id
  AND b.earring_cost IS NULL;
