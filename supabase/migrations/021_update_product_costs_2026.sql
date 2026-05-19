-- Migration 021: Update product costs from 2026 Inverness price list
--
-- Source: 2026 CENNIK INVERNESSMED (brutto price per pair)
-- Formula: cost = ROUND(pdf_brutto_price * 0.80, 2)
-- For "Single -" variants: cost = ROUND(pdf_brutto_price * 0.40, 2)
-- Scope: piercinggentle@gmail.com user only, matched by SKU

DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'piercinggentle@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User piercinggentle@gmail.com not found';
  END IF;

  -- ── Step 1: Update PAIR products (name NOT LIKE 'Single - %') ─────────────
  UPDATE products
  SET cost = CASE sku
    WHEN '10'      THEN 39.18
    WHEN '14'      THEN 39.18
    WHEN '17'      THEN 83.17
    WHEN '24C1'    THEN 64.78
    WHEN '25C1'    THEN 64.78
    WHEN '32'      THEN 64.78
    WHEN '33'      THEN 90.38
    WHEN '39'      THEN 64.71
    WHEN '40'      THEN 55.10
    WHEN '53'      THEN 64.78
    WHEN '54'      THEN 66.38
    WHEN '57C'     THEN 63.99
    WHEN '60'      THEN 55.10
    WHEN '84'      THEN 71.11
    WHEN '89'      THEN 71.11
    WHEN '90'      THEN 71.11
    WHEN '111'     THEN 73.50
    WHEN '112'     THEN 88.70
    WHEN '116'     THEN 82.30
    WHEN '117C'    THEN 92.78
    WHEN '119'     THEN 82.30
    WHEN '119ST'   THEN 92.78
    WHEN '120'     THEN 82.30
    WHEN '120ST'   THEN 92.78
    WHEN '121C'    THEN 92.78
    WHEN '122C'    THEN 111.90
    WHEN '135C'    THEN 102.38
    WHEN '136C'    THEN 102.38
    WHEN '137C'    THEN 111.90
    WHEN '159'     THEN 70.54
    WHEN '160C1'   THEN 111.90
    WHEN '173'     THEN 71.11
    WHEN '174C'    THEN 102.38
    WHEN '175C'    THEN 102.38
    WHEN '176C'    THEN 102.38
    WHEN '181'     THEN 89.50
    WHEN '185C'    THEN 102.38
    WHEN '187C'    THEN 60.78
    WHEN '191C'    THEN 102.38
    WHEN '355'     THEN 111.90
    WHEN '510'     THEN 71.18
    WHEN '530C'    THEN 83.18
    WHEN '578C'    THEN 95.10
    WHEN '587C'    THEN 83.90
    WHEN '588C'    THEN 95.10
    WHEN '592C'    THEN 92.78
    WHEN '602C'    THEN 55.10
    WHEN '802'     THEN 82.30
    WHEN '803'     THEN 82.30
    WHEN '804'     THEN 82.30
    WHEN '804ST'   THEN 92.78
    WHEN '805'     THEN 86.14
    WHEN '848S-2'  THEN 102.38
    WHEN '896-10'  THEN 96.70
    WHEN '896-3'   THEN 96.70
    WHEN '898C'    THEN 55.10
    WHEN '903C1'   THEN 111.98
    WHEN '930C'    THEN 92.78
    WHEN 'K008C'   THEN 83.90
    WHEN 'K009C'   THEN 83.90
    WHEN 'K010C'   THEN 83.90
    WHEN 'K032C'   THEN 83.90
    WHEN 'K621C-1' THEN 83.90
    WHEN 'K622C'   THEN 83.90
    WHEN 'K623C-1' THEN 83.90
    WHEN 'K776C'   THEN 42.30
    WHEN 'K1223C'  THEN 83.90
    WHEN 'K1224C'  THEN 83.90
    WHEN 'K1226C'  THEN 83.90
    WHEN 'K1228C'  THEN 83.90
    WHEN 'K1229C'  THEN 83.90
    WHEN 'K1230C'  THEN 83.90
    WHEN '1230C'   THEN 83.90
    WHEN 'K1231C'  THEN 83.90
    WHEN 'K1232C'  THEN 83.90
    WHEN '1232C'   THEN 83.90
    WHEN '956070'  THEN 81.58
    WHEN '956120'  THEN 81.58
    ELSE cost
  END
  WHERE user_id = v_uid
    AND name NOT LIKE 'Single - %'
    AND sku IN (
      '10','14','17','24C1','25C1','32','33','39','40',
      '53','54','57C','60','84','89','90',
      '111','112','116','117C','119','119ST','120','120ST',
      '121C','122C','135C','136C','137C','159','160C1','173',
      '174C','175C','176C','181','185C','187C','191C','355',
      '510','530C','578C','587C','588C','592C','602C',
      '802','803','804','804ST','805','848S-2','896-10','896-3',
      '898C','903C1','930C',
      'K008C','K009C','K010C','K032C','K621C-1','K622C','K623C-1',
      'K776C','K1223C','K1224C','K1226C','K1228C','K1229C',
      'K1230C','1230C','K1231C','K1232C','1232C',
      '956070','956120'
    );

  -- ── Step 2: Update SINGLE products (name LIKE 'Single - %') ──────────────
  UPDATE products
  SET cost = CASE sku
    WHEN '10'      THEN 19.59
    WHEN '14'      THEN 19.59
    WHEN '17'      THEN 41.58
    WHEN '24C1'    THEN 32.39
    WHEN '25C1'    THEN 32.39
    WHEN '32'      THEN 32.39
    WHEN '33'      THEN 45.19
    WHEN '39'      THEN 32.36
    WHEN '40'      THEN 27.55
    WHEN '53'      THEN 32.39
    WHEN '54'      THEN 33.19
    WHEN '57C'     THEN 32.00
    WHEN '60'      THEN 27.55
    WHEN '84'      THEN 35.56
    WHEN '89'      THEN 35.56
    WHEN '90'      THEN 35.56
    WHEN '111'     THEN 36.75
    WHEN '112'     THEN 44.35
    WHEN '116'     THEN 41.15
    WHEN '117C'    THEN 46.39
    WHEN '119'     THEN 41.15
    WHEN '119ST'   THEN 46.39
    WHEN '120'     THEN 41.15
    WHEN '120ST'   THEN 46.39
    WHEN '121C'    THEN 46.39
    WHEN '122C'    THEN 55.95
    WHEN '135C'    THEN 51.19
    WHEN '136C'    THEN 51.19
    WHEN '137C'    THEN 55.95
    WHEN '159'     THEN 35.27
    WHEN '160C1'   THEN 55.95
    WHEN '173'     THEN 35.56
    WHEN '174C'    THEN 51.19
    WHEN '175C'    THEN 51.19
    WHEN '176C'    THEN 51.19
    WHEN '181'     THEN 44.75
    WHEN '185C'    THEN 51.19
    WHEN '187C'    THEN 30.39
    WHEN '191C'    THEN 51.19
    WHEN '355'     THEN 55.95
    WHEN '510'     THEN 35.59
    WHEN '530C'    THEN 41.59
    WHEN '578C'    THEN 47.55
    WHEN '587C'    THEN 41.95
    WHEN '588C'    THEN 47.55
    WHEN '592C'    THEN 46.39
    WHEN '602C'    THEN 27.55
    WHEN '802'     THEN 41.15
    WHEN '803'     THEN 41.15
    WHEN '804'     THEN 41.15
    WHEN '804ST'   THEN 46.39
    WHEN '805'     THEN 43.07
    WHEN '848S-2'  THEN 51.19
    WHEN '896-10'  THEN 48.35
    WHEN '896-3'   THEN 48.35
    WHEN '898C'    THEN 27.55
    WHEN '903C1'   THEN 55.99
    WHEN '930C'    THEN 46.39
    WHEN 'K008C'   THEN 41.95
    WHEN 'K009C'   THEN 41.95
    WHEN 'K010C'   THEN 41.95
    WHEN 'K032C'   THEN 41.95
    WHEN 'K621C-1' THEN 41.95
    WHEN 'K622C'   THEN 41.95
    WHEN 'K623C-1' THEN 41.95
    WHEN 'K776C'   THEN 21.15
    WHEN 'K1223C'  THEN 41.95
    WHEN 'K1224C'  THEN 41.95
    WHEN 'K1226C'  THEN 41.95
    WHEN 'K1228C'  THEN 41.95
    WHEN 'K1229C'  THEN 41.95
    WHEN 'K1230C'  THEN 41.95
    WHEN '1230C'   THEN 41.95
    WHEN 'K1231C'  THEN 41.95
    WHEN 'K1232C'  THEN 41.95
    WHEN '1232C'   THEN 41.95
    WHEN '956070'  THEN 40.79
    WHEN '956120'  THEN 40.79
    ELSE cost
  END
  WHERE user_id = v_uid
    AND name LIKE 'Single - %'
    AND sku IN (
      '10','14','17','24C1','25C1','32','33','39','40',
      '53','54','57C','60','84','89','90',
      '111','112','116','117C','119','119ST','120','120ST',
      '121C','122C','135C','136C','137C','159','160C1','173',
      '174C','175C','176C','181','185C','187C','191C','355',
      '510','530C','578C','587C','588C','592C','602C',
      '802','803','804','804ST','805','848S-2','896-10','896-3',
      '898C','903C1','930C',
      'K008C','K009C','K010C','K032C','K621C-1','K622C','K623C-1',
      'K776C','K1223C','K1224C','K1226C','K1228C','K1229C',
      'K1230C','1230C','K1231C','K1232C','1232C',
      '956070','956120'
    );

  -- ── Step 3: Insert 8 new SKUs (pair + Single variant each) ───────────────
  INSERT INTO products (name, sku, cost, sale_price, active, user_id) VALUES
    -- SKU 37: Cubic Zirconia classic setting - 2mm -24Kt Gold Plated GP (88.89 * 0.8 = 71.11)
    ('Cubic Zirconia classic setting - 2mm -24Kt Gold Plated GP',          '37',     71.11, 0, true, v_uid),
    ('Single - Cubic Zirconia classic setting - 2mm -24Kt Gold Plated GP', '37',     35.56, 0, true, v_uid),
    -- SKU 41: sts Crystal Bezel - 3mm -24Kt Gold Plated GP (104.88 * 0.8 = 83.90)
    ('sts Crystal Bezel - 3mm -24Kt Gold Plated GP',                       '41',     83.90, 0, true, v_uid),
    ('Single - sts Crystal Bezel - 3mm -24Kt Gold Plated GP',              '41',     41.95, 0, true, v_uid),
    -- SKU 85C: sts May Emerald Crystal - 3mm -24Kt Gold Plated GP (88.89 * 0.8 = 71.11)
    ('sts May Emerald Crystal - 3mm -24Kt Gold Plated GP',                 '85C',    71.11, 0, true, v_uid),
    ('Single - sts May Emerald Crystal - 3mm -24Kt Gold Plated GP',        '85C',    35.56, 0, true, v_uid),
    -- SKU 87C: sts July Ruby Crystal - 3mm -24Kt Gold Plated GP (88.89 * 0.8 = 71.11)
    ('sts July Ruby Crystal - 3mm -24Kt Gold Plated GP',                   '87C',    71.11, 0, true, v_uid),
    ('Single - sts July Ruby Crystal - 3mm -24Kt Gold Plated GP',          '87C',    35.56, 0, true, v_uid),
    -- SKU 659C: Flower Rainbow - 5mm -24Kt Gold Plated GP (110.9 * 0.8 = 88.72)
    ('Flower Rainbow - 5mm -24Kt Gold Plated GP',                          '659C',   88.72, 0, true, v_uid),
    ('Single - Flower Rainbow - 5mm -24Kt Gold Plated GP',                 '659C',   44.36, 0, true, v_uid),
    -- SKU 840C-1: sts Heart Pink Enamel - 5mm 24Kt Gold Plated GP (125.9 * 0.8 = 100.72)
    ('sts Heart Pink Enamel - 5mm 24Kt Gold Plated GP',                    '840C-1', 100.72, 0, true, v_uid),
    ('Single - sts Heart Pink Enamel - 5mm 24Kt Gold Plated GP',           '840C-1', 50.36, 0, true, v_uid),
    -- SKU 840C-2: sts Red Heart Enamel - 5mm -24Kt Gold Plated GP (125.9 * 0.8 = 100.72)
    ('sts Red Heart Enamel - 5mm -24Kt Gold Plated GP',                    '840C-2', 100.72, 0, true, v_uid),
    ('Single - sts Red Heart Enamel - 5mm -24Kt Gold Plated GP',           '840C-2', 50.36, 0, true, v_uid),
    -- SKU 841C: sts Butterfly Pink Enamel - 6mm 24Kt Gold Plated GP (125.9 * 0.8 = 100.72)
    ('sts Butterfly Pink Enamel - 6mm 24Kt Gold Plated GP',                '841C',   100.72, 0, true, v_uid),
    ('Single - sts Butterfly Pink Enamel - 6mm 24Kt Gold Plated GP',       '841C',   50.36, 0, true, v_uid)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Migration 021 complete for user %', v_uid;
END $$;
