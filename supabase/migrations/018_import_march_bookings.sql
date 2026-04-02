-- Migration 018: Import March 2026 bookings for piercinggentle@gmail.com
--
-- 39 bookings (bookings 1-40 from review, #20 merged into #19)
-- Bookings 1-38 → 2026-03-27 | Bookings 39-40 → 2026-04-01
-- Services looked up by base_price
-- Products looked up by SKU + closest sale_price (picks single vs pair correctly)
-- "Бижутерия" / "Бижутерия Али" looked up by name with price override
-- Fixed SKUs: 191→191C, 187с→187C, 57с→57C, 1230с→K1230C, 25с1→25C1,
--   unicorn→K010C, k1229→K1229C, к1223с→K1223C, 848s-2→848S-2, 176с→176C, 174с→174C
-- Note: SKUs 37, 37c, 598с have no matching product in DB — silently skipped
-- Re-runnable: cleans up previous [batch-import-2026-03] tagged bookings first

DO $$
DECLARE
  v_uid          UUID;
  v_bid          UUID;
  v_sid          UUID;
  v_pid          UUID;
  v_spray        UUID;  -- spray/aftercare product
  v_bij          UUID;  -- "Бижутерия"
  v_bij_ali      UUID;  -- "Бижутерия Али"
  v_price        NUMERIC(10,2);
  v_import_tag   TEXT := '[batch-import-2026-03]';
  v_import_start TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'piercinggentle@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'User piercinggentle@gmail.com not found'; END IF;

  -- Remove any previous run of this import
  DELETE FROM bookings WHERE user_id = v_uid AND notes LIKE '%[batch-import-2026-03]%';

  v_import_start := NOW();

  -- Cache reusable product IDs
  SELECT id INTO v_spray FROM products WHERE user_id = v_uid AND (name ILIKE '%спрей%' OR name ILIKE '%spray%') ORDER BY created_at LIMIT 1;
  IF v_spray IS NULL THEN
    INSERT INTO products (name, sale_price, active, user_id, sku) VALUES ('Спрей', 20, true, v_uid, 'spray') RETURNING id INTO v_spray;
  END IF;

  SELECT id INTO v_bij     FROM products WHERE user_id = v_uid AND name = 'Бижутерия'     LIMIT 1;
  SELECT id INTO v_bij_ali FROM products WHERE user_id = v_uid AND name = 'Бижутерия Али' LIMIT 1;

  -- ── BOOKING 1 | 2026-03-27 | Svc 150 + SKU 191 @ 180 + Spray 20 = 350
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '191C' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 2 | 2026-03-27 | Svc 280 + SKU 896-3 @ 180 + SKU 33 catalog + SKU 37 catalog = 620
  -- "Bfly голубые два" = pair (896-3); 33 & 37 = singles at catalog price
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (620, 'cash', '2026-03-27 11:00:00+01', 'Bfly голубые два', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 280 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 280, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  SELECT id, sale_price INTO v_pid, v_price FROM products WHERE user_id = v_uid AND sku = '33' ORDER BY ABS(sale_price - 90) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, v_price, v_uid); END IF;
  SELECT id, sale_price INTO v_pid, v_price FROM products WHERE user_id = v_uid AND sku = '37' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, v_price, v_uid); END IF;

  -- ── BOOKING 3 | 2026-03-27 | Svc 90 + SKU 112 @ 90 (single) = 180
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (180, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' ORDER BY ABS(sale_price - 90) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 90, v_uid); END IF;

  -- ── BOOKING 4 | 2026-03-27 | Svc 150 + SKU 187с @ 150 = 300
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (300, 'cash', '2026-03-27 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '187C' ORDER BY ABS(sale_price - 150) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 150, v_uid); END IF;

  -- ── BOOKING 5 | 2026-03-27 | Svc 450 + SKU 32 @ 160 (pair) + Spray 20 = 630
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (630, 'cash', '2026-03-27 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 450 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 450, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 6 | 2026-03-27 | Svc 150 + SKU 112 @ 180 (pair) = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ── BOOKING 7 | 2026-03-27 | Svc 150 + SKU 54 @ 160 (pair) = 310
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-27 11:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ── BOOKING 8 | 2026-03-27 | Svc 150 + SKU 57с @ 160 = 310
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '57C' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ── BOOKING 9 | 2026-03-27 | Svc 90 + Svc 260 + SKU 10 @ 85 + SKU 54 @ 160 (pair) + Spray 20 = 615
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (615, 'cash', '2026-03-27 13:00:00+01', 'выезд', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 260 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 260, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '10' ORDER BY ABS(sale_price - 85) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 10 | 2026-03-27 | Svc 150 = 150  [нос]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (150, 'cash', '2026-03-27 14:00:00+01', 'нос', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;

  -- ── BOOKING 11 | 2026-03-27 | Svc 150 + SKU 32 @ 160 (pair) = 310
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ── BOOKING 12 | 2026-03-27 | Svc 150 + SKU 1230с @ 170 + Spray 20 = 340
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (340, 'cash', '2026-03-27 11:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'K1230C' ORDER BY ABS(sale_price - 170) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 13 | 2026-03-27 | 2×Svc 90 + SKU 54 @ 85 (single) + SKU 32 @ 85 (single) + Spray×2 @ 15 + Бижутерия @ 80 = 460
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (460, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid);
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid);
  END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' ORDER BY ABS(sale_price - 85) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' ORDER BY ABS(sale_price - 85) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 2, 15, v_uid);
  IF v_bij IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij, 1, 80, v_uid); END IF;

  -- ── BOOKING 14 | 2026-03-27 | Svc 150 + SKU 32 @ 160 (pair) = 310
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-27 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ── BOOKING 15 | 2026-03-27 | Svc 150 + SKU 896-3 @ 180 = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ── BOOKING 16 | 2026-03-27 | Svc 150 + SKU 25с1 @ 160 = 310
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '25C1' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ── BOOKING 17 | 2026-03-27 | Svc 100 + Svc 150 + SKU unicorn @ 170 + Spray 20 = 440  [прокол носа]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (440, 'cash', '2026-03-27 11:00:00+01', 'прокол носа', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 100 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 100, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'K010C' ORDER BY ABS(sale_price - 170) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 18 | 2026-03-27 | Svc 150 + SKU 32 @ 160 (pair) + Spray 20 = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 19 | 2026-03-27 | Svc 150 (kid) + Svc 150 (2 ears) + Svc 90 (1 ear) + SKU 14 @ 70 (single) + SKU 181 @ 180 + SKU k1229 @ 170 + Spray×2 @ 20 = 850
  -- (originally two entries merged into one booking)
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (850, 'cash', '2026-03-27 13:00:00+01', '150 ребенок, 150 два уха, 90 одно ухо', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
  END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' ORDER BY ABS(sale_price - 70) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 70, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '181' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'K1229C' ORDER BY ABS(sale_price - 170) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 2, 20, v_uid);

  -- ── BOOKING 21 | 2026-03-27 | Svc 150 + SKU к1223с @ 170 + Spray 20 + Бижутерия @ 70 = 410
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (410, 'cash', '2026-03-27 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'K1223C' ORDER BY ABS(sale_price - 170) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  IF v_bij IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij, 1, 70, v_uid); END IF;

  -- ── BOOKING 22 | 2026-03-27 | Svc 150 + SKU 896-3 @ 180 + Spray 20 = 350
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 23 | 2026-03-27 | Svc 150 + SKU 14 @ 120 (pair) = 270
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (270, 'cash', '2026-03-27 11:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' ORDER BY ABS(sale_price - 120) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 120, v_uid); END IF;

  -- ── BOOKING 24 | 2026-03-27 | 2×Svc 150 + SKU 187с @ 150 + SKU 14 @ 120 (pair) + Бижутерия @ 60 = 630
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (630, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
  END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '187C' ORDER BY ABS(sale_price - 150) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' ORDER BY ABS(sale_price - 120) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 120, v_uid); END IF;
  IF v_bij IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij, 1, 60, v_uid); END IF;

  -- ── BOOKING 25 | 2026-03-27 | Svc 90 + SKU 159 @ 85 (single) + Spray @ 15 = 190  [лосьон 15]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (190, 'cash', '2026-03-27 13:00:00+01', 'лосьон 15', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '159' ORDER BY ABS(sale_price - 85) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 15, v_uid);

  -- ── BOOKING 26 | 2026-03-27 | Svc 150 + SKU 112 @ 90 (single) + SKU 53 @ 80 (single) = 320
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (320, 'cash', '2026-03-27 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' ORDER BY ABS(sale_price - 90) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '53' ORDER BY ABS(sale_price - 80) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;

  -- ── BOOKING 27 | 2026-03-27 | Svc 150 + SKU 848s-2 @ 180 = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '848S-2' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ── BOOKING 28 | 2026-03-27 | Svc 150 + Svc 30 + SKU 54 @ 80 (single) + SKU 53 @ 80 + Spray 20 + Бижутерия @ 80 = 440  [даунсайз]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (440, 'cash', '2026-03-27 11:00:00+01', 'даунсайз', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 30 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 30, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' ORDER BY ABS(sale_price - 80) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '53' ORDER BY ABS(sale_price - 80) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  IF v_bij IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij, 1, 80, v_uid); END IF;

  -- ── BOOKING 29 | 2026-03-27 | Svc 150 + SKU 187с @ 150 + Spray 20 = 320
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (320, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '187C' ORDER BY ABS(sale_price - 150) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 30 | 2026-03-27 | Svc 210 + SKU 14 × 2 @ 70 (single) + SKU 10 @ 70 + Spray 20 = 440  [три прокола]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (440, 'cash', '2026-03-27 13:00:00+01', 'три прокола', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 210 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 210, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' ORDER BY ABS(sale_price - 70) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 2, 70, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '10' ORDER BY ABS(sale_price - 70) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 70, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 31 | 2026-03-27 | Svc 60 + Бижутерия @ 70 = 130  [даунсайз]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (130, 'cash', '2026-03-27 14:00:00+01', 'даунсайз', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 60 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 60, v_uid); END IF;
  IF v_bij IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij, 1, 70, v_uid); END IF;

  -- ── BOOKING 32 | 2026-03-27 | Svc 250 + SKU 598с @ 180 + Spray 20 = 450  [выезд]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (450, 'cash', '2026-03-27 10:00:00+01', 'выезд', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 250 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 250, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '598с' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 33 | 2026-03-27 | Svc 150 + SKU 896-3 @ 180 + Spray 20 + Бижутерия Али @ 70 = 420
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (420, 'cash', '2026-03-27 11:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  IF v_bij_ali IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij_ali, 1, 70, v_uid); END IF;

  -- ── BOOKING 34 | 2026-03-27 | Svc 150 + SKU 112 @ 180 (pair) = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ── BOOKING 35 | 2026-03-27 | Svc 100 + SKU 176с @ 180 + Spray 20 = 300  [восстановление каналов]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (300, 'cash', '2026-03-27 13:00:00+01', 'восстановление каналов', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 100 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 100, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '176C' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 36 | 2026-03-27 | Svc 150 + SKU 25с1 @ 160 + Spray 20 = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '25C1' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 37 | 2026-03-27 | Svc 150 + SKU 60 @ 80 (single) + SKU 37c @ 80 (single) + Spray 20 = 330
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-27 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '60' ORDER BY ABS(sale_price - 80) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '37c' ORDER BY ABS(sale_price - 80) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ── BOOKING 38 | 2026-03-27 | Svc 30 + SKU 174с @ 180 + Бижутерия @ 70 = 280  [замена без прокола]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (280, 'cash', '2026-03-27 11:00:00+01', 'замена без прокола', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 30 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 30, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '174C' ORDER BY ABS(sale_price - 180) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  IF v_bij IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_bij, 1, 70, v_uid); END IF;

  -- ── BOOKING 39 | 2026-04-01 | Svc 260 + SKU 39 @ 160 = 420  [выезд]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (420, 'cash', '2026-04-01 10:00:00+01', 'выезд', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 260 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 260, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '39' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ── BOOKING 40 | 2026-04-01 | Svc 150 + Svc 90 (travel) + SKU 173 @ 160 + Spray 20 = 420  [выезд]
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (420, 'cash', '2026-04-01 11:00:00+01', 'выезд', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '173' ORDER BY ABS(sale_price - 160) LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- Tag all bookings from this run for safe re-run cleanup
  UPDATE bookings
  SET notes = COALESCE(notes || ' | ', '') || v_import_tag
  WHERE user_id = v_uid AND created_at >= v_import_start;

  RAISE NOTICE 'Successfully imported 39 bookings for user %', v_uid;
END $$;
