-- Migration: Seed clients for piercinggentle@gmail.com
-- This adds the initial client list for the default user

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
    -- Insert all clients
    INSERT INTO clients (name, phone, user_id) VALUES
    ('Agata Krawczyk', '732 743 268', default_user_id),
    ('Agata Wąsik', '500 695 950', default_user_id),
    ('Agnieszka Wardaszka', '787 213 711', default_user_id),
    ('Aleksandra Kosiacka', '513 555 086', default_user_id),
    ('Aleksandra Myszak', '507 132 086', default_user_id),
    ('Aliona', '796 695 178', default_user_id),
    ('Alina Полянська', '577 322 515', default_user_id),
    ('Алина (inst)', '793 136 493', default_user_id),
    ('Альона Лукінська', '884 928 600', default_user_id),
    ('Anna Sitova', '513 406 985', default_user_id),
    ('Anna Starzyk', '606 959 187', default_user_id),
    ('Anton Яремко', '502 765 119', default_user_id),
    ('Anna Chełchowska', '501 560 773', default_user_id),
    ('Anna Fedeshak', '509 779 266', default_user_id),
    ('Anna Powirska', '511 204 606', default_user_id),
    ('Anastasia Klevan', '889 840 790', default_user_id),
    ('Anastasiia Patkivska', '888 405 517', default_user_id),
    ('Anastasiya Audziayuk', '792 586 267', default_user_id),
    ('Anastazja Viniarzh', '729 409 901', default_user_id),
    ('angelground zero', '790 288 405', default_user_id),
    ('Dariia Konovalenko', '797 021 695', default_user_id),
    ('Диана Бакал', '511 391 767', default_user_id),
    ('Hanna Mayorova', '733 812 129', default_user_id),
    ('Helen Tsubalova', '513 640 870', default_user_id),
    ('Inesa Ardziuk', '730 592 471', default_user_id),
    ('Irene', '+39 389 605 9205', default_user_id),
    ('Ivan Dankov', '571 675 301', default_user_id),
    ('Julia Janicka', '530 590 255', default_user_id),
    ('Julia Rybka', '607 303 915', default_user_id),
    ('Юлия (Instagram)', '881 029 162', default_user_id),
    ('Ярослава Сидачева', '882 426 449', default_user_id),
    ('Kate Bondarewa', '731 803 328', default_user_id),
    ('Kira', '574 182 583', default_user_id),
    ('Klaudia Światkowska', '501 038 135', default_user_id),
    ('Kseniya Askerka', '573 818 260', default_user_id),
    ('Кристина (inst)', '796 614 335', default_user_id),
    ('Ксения', '538 455 176', default_user_id),
    ('Linal', '730 941 920', default_user_id),
    ('Liubou Fenko', '573 891 112', default_user_id),
    ('Liza', '504 332 110', default_user_id),
    ('Lukasz Wrzecionko', '605 313 797', default_user_id),
    ('Magda Golonko', '514 433 196', default_user_id),
    ('Magda Łabęcka', '518 241 818', default_user_id),
    ('Magda Teska', '503 612 614', default_user_id),
    ('Marek Węgrowski', '531 582 220', default_user_id),
    ('Maria Kadan', '571 871 815', default_user_id),
    ('Мария Шульга', '792 536 884', default_user_id),
    ('Monika Osowska', '502 668 769', default_user_id),
    ('Myroslava Tatsenko', '572 516 106', default_user_id),
    ('Natalie Tomkevich', '733 766 091', default_user_id),
    ('Наталья', '791 638 040', default_user_id),
    ('Olena Hovorukha', '575 075 252', default_user_id),
    ('Olha Kordupa', '881 305 398', default_user_id),
    ('Patrycja Falkowska', '503 106 732', default_user_id),
    ('Paulina Berdnyk', '517 586 914', default_user_id),
    ('Polina Reut', '572 156 583', default_user_id),
    ('Полина Vyshnia', '883 092 974', default_user_id),
    ('Sonia', '730 389 185', default_user_id),
    ('Stasia', '731 338 286', default_user_id),
    ('Stasia Klimova', '731 338 286', default_user_id),
    ('Sylwia Domeracka', '508 742 149', default_user_id),
    ('Sylwia Mika', '789 365 454', default_user_id),
    ('Vera', '571 378 276', default_user_id),
    ('Veranika Baravik', '795 099 945', default_user_id),
    ('Victoria Kobrynets', '536 704 473', default_user_id),
    ('Victoria Rampala', '571 378 885', default_user_id),
    ('Viktoria Vasiuk', '577 605 222', default_user_id),
    ('Vladyslava Z', '574 338 557', default_user_id),
    ('Валерія Бувалець', '690 228 050', default_user_id),
    ('Виктория', '503 408 959', default_user_id),
    ('Виолета Khadzko', '884 926 529', default_user_id),
    ('Weronika Nienartowicz', '516 909 233', default_user_id),
    ('Wiktoria Cianowska', '533 011 264', default_user_id),
    ('Wiktoria Giers', '575 049 699', default_user_id),
    ('Wiktoria Wojciechowicz', '532 553 131', default_user_id),
    ('Yulia Model TG', '668 712 797', default_user_id)
    ON CONFLICT DO NOTHING; -- Prevent duplicates if run multiple times
    
    RAISE NOTICE 'Inserted clients for user %', default_user_id;
  ELSE
    RAISE WARNING 'User piercinggentle@gmail.com not found. Clients not inserted.';
  END IF;
END $$;

