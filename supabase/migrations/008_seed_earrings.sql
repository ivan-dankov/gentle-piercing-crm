-- Migration: Seed earrings for piercinggentle@gmail.com
-- This adds the initial earring inventory for the default user

DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Find the user ID for piercinggentle@gmail.com
  SELECT id INTO default_user_id
  FROM auth.users
  WHERE email = 'piercinggentle@gmail.com'
  LIMIT 1;

  -- Only insert if user exists
  IF default_user_id IS NOT NULL THEN
    -- Insert all earrings
    INSERT INTO earrings (name, cost, sale_price, stock_qty, sold_qty, active, user_id) VALUES
    ('Титановый конус №160C', 41.00, 90.00, 0, 0, true, default_user_id),
    ('Камушек №33 (большой циркон в золоте)', 41.00, 90.00, 0, 0, true, default_user_id),
    ('Титановая серёжка №17 (в оправе)', 46.00, 90.00, 0, 0, true, default_user_id),
    ('Титановая серёжка №159 (мини)', 38.00, 80.00, 0, 0, true, default_user_id),
    ('Титановая серёжка №111 (лонг)', 38.00, 80.00, 0, 0, true, default_user_id),
    ('Бабочка №60', 29.00, 70.00, 0, 0, true, default_user_id),
    ('Камушек №54 (кубик 3 мм)', 35.00, 75.00, 0, 0, true, default_user_id),
    ('Камушек №53 (мини)', 35.00, 75.00, 0, 0, true, default_user_id),
    ('Камушек №39 (розовый кубик цирконий)', 35.00, 75.00, 0, 0, true, default_user_id),
    ('Базовая серёжка', 21.00, 60.00, 0, 0, true, default_user_id),
    ('Ниобий — большой кристалл (2)', 86.00, 170.00, 0, 0, true, default_user_id),
    ('Жемчуг (2)', 57.81, 140.00, 0, 0, true, default_user_id),
    ('Бабочки (2)', 57.81, 140.00, 0, 0, true, default_user_id),
    ('Ниобий — маленькие кристаллы (2)', 82.00, 160.00, 0, 0, true, default_user_id),
    ('Ниобий — цветочек (2)', 87.00, 160.00, 0, 0, true, default_user_id),
    ('Божьи коровки (2)', 58.00, 130.00, 0, 0, true, default_user_id),
    ('Кристаллики (2)', 68.88, 140.00, 0, 0, true, default_user_id),
    ('Золотые сердечки (2)', 68.88, 140.00, 0, 0, true, default_user_id),
    ('Золотые звёздочки (2)', 68.88, 140.00, 0, 0, true, default_user_id),
    ('Цветочки с кристаллами Swarovski (2)', 82.00, 150.00, 0, 0, true, default_user_id),
    ('Премиум (шарики, fancy ball, и др.) (2)', 100.86, 160.00, 0, 0, true, default_user_id),
    ('Детские серёжки (2)', 91.00, 150.00, 0, 0, true, default_user_id),
    ('Базовая модель (2)', 42.00, 100.00, 0, 0, true, default_user_id)
    ON CONFLICT DO NOTHING; -- Prevent duplicates if run multiple times
    
    RAISE NOTICE 'Inserted earrings for user %', default_user_id;
  ELSE
    RAISE WARNING 'User piercinggentle@gmail.com not found. Earrings not inserted.';
  END IF;
END $$;

