-- Migration 018: Import March 2026 bookings for piercinggentle@gmail.com
--
-- PARSING RULES USED:
--   • NUMBER alone             → service lookup by base_price
--   • NUMBER (SKU)             → product lookup by sku, sold at NUMBER
--   • 20 alone / "Спрей"       → spray product at 20 PLN
--   • Items without SKU        → recorded in booking notes, included in total_paid
--   • Dates are spread across March 2026 (exact dates were not provided)
--   • payment_method = 'cash' for all — update rows as needed
--   • "выезд" entries use a service lookup at the travel price

DO $$
DECLARE
  v_uid   UUID;
  v_bid   UUID;
  v_sid   UUID;
  v_sid2  UUID;
  v_pid   UUID;
  v_pid2  UUID;
  v_spray UUID;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'piercinggentle@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User piercinggentle@gmail.com not found — aborting import';
  END IF;

  -- Ensure spray/aftercare product exists (created once, reused for every booking)
  SELECT id INTO v_spray
  FROM products
  WHERE user_id = v_uid
    AND (name ILIKE '%спрей%' OR name ILIKE '%spray%')
  ORDER BY created_at
  LIMIT 1;

  IF v_spray IS NULL THEN
    INSERT INTO products (name, sale_price, active, user_id, sku)
    VALUES ('Спрей', 20, true, v_uid, 'spray')
    RETURNING id INTO v_spray;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 1 | 2026-03-01 | Svc 150 + spray 20 + SKU 191c @ 180 = 350
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-01 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '191c' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 2 | 2026-03-01 | Svc 150 + spray 20 + SKU unicorn @ 170 = 340
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (340, 'cash', '2026-03-01 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'unicorn' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 3 | 2026-03-03 | Svc 150 + spray 20 + SKU 176c @ 180 = 350
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-03 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '176c' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 4 | 2026-03-03 | Svc 150 + spray 20 + SKU 181 @ 180 = 350
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-03 12:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '181' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 5 | 2026-03-05 | SKU 173 @ 160 = 160  [Уши не прокола — no service]
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (160, 'cash', '2026-03-05 10:00:00+01', 'Уши не прокола', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '173' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 6 | 2026-03-05 | Svc 90 + SKU 53 @ 80 + spray 20 = 190  [Сестра]
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (190, 'cash', '2026-03-05 13:00:00+01', 'Сестра 1 прокол', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '53' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 7 | 2026-03-07 | Svc 150 + SKU unicorn @ 170 + spray 20 = 340  [Ребенок]
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (340, 'cash', '2026-03-07 10:00:00+01', 'Ребенок', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'unicorn' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 8 | 2026-03-07 | Svc 150 + SKU 896-10 @ 180 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-07 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-10' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 9 | 2026-03-08 | Svc 150 + spray 20 + SKU 191 @ 180 = 350
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-08 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '191' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 10 | 2026-03-10 | Svc 280 + SKU 1 @ 33 + SKU 1 @ 37 = 350
  -- NOTE: "Bfly голубые два" — two items with SKU 1 at different price points
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (350, 'cash', '2026-03-10 10:00:00+01', 'Bfly голубые два', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 280 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 280, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '1' LIMIT 1;
  IF v_pid IS NOT NULL THEN
    INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 33, v_uid);
    INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 37, v_uid);
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 11 | 2026-03-10 | Svc 90 + SKU 112 @ 90 = 180
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (180, 'cash', '2026-03-10 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 90, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 12 | 2026-03-11 | Svc 150 + SKU 187с @ 150 = 300
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (300, 'cash', '2026-03-11 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '187с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 150, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 13 | 2026-03-11 | Svc 450 + spray 20 + SKU 32 @ 160 = 630
  -- NOTE: "Серьги 32" — no explicit price format but SKU 32 consistently = 160 elsewhere
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (630, 'cash', '2026-03-11 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 450 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 450, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 14 | 2026-03-12 | Svc 150 + SKU 112 @ 180 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-12 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 15 | 2026-03-12 | Svc 150 + SKU 54 @ 160 = 310
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-12 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 16 | 2026-03-13 | Svc 150 + SKU 57с @ 160 = 310
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-13 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '57с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 17 | 2026-03-13 | Svc 90 + Svc 260(выезд) + spray 20 + SKU 10 @ 85 + SKU 54 @ 160 = 615
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (615, 'cash', '2026-03-13 14:00:00+01', 'выезд', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 260 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 260, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '10' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 18 | 2026-03-14 | Svc 150 = 150  [нос — nose piercing]
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (150, 'cash', '2026-03-14 10:00:00+01', 'нос', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 19 | 2026-03-14 | Svc 150 + SKU 32 @ 160 = 310
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-14 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 20 | 2026-03-15 | Svc 150 + spray 20 + SKU 1230с @ 170 = 340
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (340, 'cash', '2026-03-15 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '1230с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 21 | 2026-03-15 | 2×Svc 90 + SKU 54 @ 85 + SKU 32 @ 85 + 2×spray @ 15 = 460
  -- NOTE: "80 бижутерия" — unlinked, included in total_paid (no SKU)
  -- NOTE: "30 (2 лосьона)" treated as 2 sprays at 15 each = 30
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (460, 'cash', '2026-03-15 14:00:00+01', '2 проколов; бижутерия 80 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid);
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid);
  END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 2, 15, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 22 | 2026-03-17 | Svc 150 + SKU 32 @ 160 = 310
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-17 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 23 | 2026-03-17 | Svc 150 + SKU 896-3 @ 180 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-17 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 24 | 2026-03-18 | Svc 150 + SKU 25с1 @ 160 = 310
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (310, 'cash', '2026-03-18 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '25с1' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 25 | 2026-03-18 | Svc 100 + Svc 150 + SKU unicorn @ 170 + spray 20 = 440
  -- NOTE: прокол носа (nose) + ear piercing combo
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (440, 'cash', '2026-03-18 14:00:00+01', 'прокол носа', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 100 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 100, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'unicorn' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 26 | 2026-03-19 | Svc 150 + SKU 32 @ 160 + spray 20 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-19 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '32' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 27 | 2026-03-19 | 2×Svc 150 + Svc 90 + 2×spray @ 20 = 430
  -- NOTE: "40 2 спрея" = 2 sprays for 40 total
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (430, 'cash', '2026-03-19 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
  END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 2, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 28 | 2026-03-21 | SKU 14 @ 70 + SKU 181 @ 180 + SKU k1229 @ 170 = 420
  -- NOTE: jewelry-only booking, no service
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (420, 'cash', '2026-03-21 10:00:00+01', 'украшения без прокола', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 70, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '181' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'k1229' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 29 | 2026-03-21 | Svc 150 + SKU к1223с @ 170 + spray 20 = 410
  -- NOTE: "70 бижу" — unlinked bijoux, included in total_paid (no SKU)
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (410, 'cash', '2026-03-21 13:00:00+01', 'бижу 70 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = 'к1223с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 170, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 30 | 2026-03-22 | Svc 150 + SKU 896-3 @ 180 + spray 20 = 350
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (350, 'cash', '2026-03-22 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 31 | 2026-03-22 | Svc 150 + SKU 14 @ 120 = 270
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (270, 'cash', '2026-03-22 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 120, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 32 | 2026-03-23 | 2×Svc 150 + SKU 187с @ 150 + SKU 14 @ 120 = 630
  -- NOTE: "60 бижутерия италия" — unlinked, included in total_paid (no SKU)
  -- NOTE: Two separate 150 services (two people or two piercings)
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (630, 'cash', '2026-03-23 10:00:00+01', 'бижутерия италия 60 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
    INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid);
  END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '187с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 120, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 33 | 2026-03-23 | Svc 90 + spray @ 15 + SKU 159 @ 85 = 190
  -- NOTE: "15 лосьон" — single lotion/aftercare at 15 PLN, using spray product
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (190, 'cash', '2026-03-23 14:00:00+01', 'лосьон 15', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 90 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 90, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 15, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '159' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 85, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 34 | 2026-03-24 | Svc 150 + SKU 112 @ 90 + SKU 53 @ 80 = 320
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (320, 'cash', '2026-03-24 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 90, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '53' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 35 | 2026-03-24 | Svc 150 + SKU 848s-2 @ 180 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-24 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '848s-2' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 36 | 2026-03-25 | Svc 150 + SKU 54 @ 80 + SKU 53 @ 80 + Svc 30 + spray 20 = 440
  -- NOTE: "160 (54, 53)" = pair of products, 80 each
  -- NOTE: "30+20+80 даунсайз" — service 30 (downsizing) + spray 20 + earrings 80 (no SKU)
  -- NOTE: "80 серьги даунсайз" — unlinked earrings for downsizing, included in total_paid
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (440, 'cash', '2026-03-25 10:00:00+01', 'даунсайз; серьги даунсайз 80 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 30 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 30, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '54' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '53' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 37 | 2026-03-25 | Svc 150 + SKU 187с @ 150 + spray 20 = 320
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (320, 'cash', '2026-03-25 14:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '187с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 38 | 2026-03-26 | Svc 210 + 2×SKU 14 @ 70 + 1×SKU 10 @ 70 + spray 20 = 440
  -- NOTE: "210 три прокола" — 3 piercings at 210 total
  -- NOTE: "210 (2 х14, 1х10)" — 2 pieces SKU 14 + 1 piece SKU 10, 70 each = 210
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (440, 'cash', '2026-03-26 10:00:00+01', 'три прокола; 2×SKU14 + 1×SKU10', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 210 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 210, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '14' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 2, 70, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '10' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 70, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 39 | 2026-03-26 | Svc 60 (даунсайз) = 130
  -- NOTE: "70 серьгатитан" — titanium earring 70, no SKU, included in total_paid
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (130, 'cash', '2026-03-26 14:00:00+01', 'даунсайз; серьга титан 70 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 60 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 60, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 40 | 2026-03-27 | Svc 250 (выезд) + spray 20 + SKU 598с @ 180 = 450
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (450, 'cash', '2026-03-27 10:00:00+01', 'выезд', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 250 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 250, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '598с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 41 | 2026-03-27 | Svc 150 + spray 20 + SKU 896-3 @ 180 = 420
  -- NOTE: "70 серьги Китай" — Chinese jewelry 70, no SKU, included in total_paid
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (420, 'cash', '2026-03-27 14:00:00+01', 'серьги Китай 70 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '896-3' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 42 | 2026-03-28 | Svc 150 + SKU 112 @ 180 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-28 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '112' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 43 | 2026-03-28 | Svc 100 + SKU 176с @ 180 + spray 20 = 300
  -- NOTE: "восстановление каналов" = channel restoration service
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (300, 'cash', '2026-03-28 13:00:00+01', 'восстановление каналов', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 100 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 100, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '176с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 44 | 2026-03-29 | Svc 150 + spray 20 + SKU 25с1 @ 160 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-29 10:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '25с1' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 45 | 2026-03-29 | Svc 150 + SKU 60 @ 80 + SKU 37c @ 80 + spray 20 = 330
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, user_id)
  VALUES (330, 'cash', '2026-03-29 13:00:00+01', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 150 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 150, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '60' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '37c' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 80, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 46 | 2026-03-30 | SKU 174с @ 180 + Svc 30 (замена) = 280
  -- NOTE: "70 сережки бижу" — bijoux earrings 70, no SKU, included in total_paid
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (280, 'cash', '2026-03-30 10:00:00+01', 'замена без прокола; сережки бижу 70 (без артикула)', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 30 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 30, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '174с' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 180, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 47 | 2026-03-30 | Svc 260 (выезд) + SKU 39 @ 160 = 420
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, user_id)
  VALUES (420, 'cash', '2026-03-30 14:00:00+01', 'выезд; серьги SKU 39', v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 260 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 260, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '39' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BOOKING 48 | 2026-03-31 | Svc 260(выезд) + SKU 173 @ 160 + spray 20 = 420 (discount 20)
  -- NOTE: Total stated = 420 but items sum to 440 → custom_discount = 20
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO bookings (total_paid, payment_method, start_time, notes, custom_discount, user_id)
  VALUES (420, 'cash', '2026-03-31 10:00:00+01', 'выезд; скидка 20', 20, v_uid) RETURNING id INTO v_bid;
  SELECT id INTO v_sid FROM services WHERE user_id = v_uid AND base_price = 260 ORDER BY created_at LIMIT 1;
  IF v_sid IS NOT NULL THEN INSERT INTO booking_services (booking_id, service_id, price, user_id) VALUES (v_bid, v_sid, 260, v_uid); END IF;
  SELECT id INTO v_pid FROM products WHERE user_id = v_uid AND sku = '173' LIMIT 1;
  IF v_pid IS NOT NULL THEN INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_pid, 1, 160, v_uid); END IF;
  INSERT INTO booking_products (booking_id, product_id, qty, price, user_id) VALUES (v_bid, v_spray, 1, 20, v_uid);

  RAISE NOTICE 'Successfully imported 48 March 2026 bookings for user %', v_uid;
END $$;
