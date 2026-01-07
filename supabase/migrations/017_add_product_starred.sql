-- Migration: Add starred field to products table

-- Add starred column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false;

-- Create index for faster queries on starred products
CREATE INDEX IF NOT EXISTS idx_products_starred ON products(starred) WHERE starred = true;

