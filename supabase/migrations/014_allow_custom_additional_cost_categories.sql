-- Migration: Allow custom additional cost categories
-- Remove the CHECK constraint that limits categories to fixed values
-- This allows users to create their own custom category names

-- Drop the existing CHECK constraint
ALTER TABLE additional_costs 
DROP CONSTRAINT IF EXISTS additional_costs_type_check;

-- The type column is already TEXT, so no need to change the column type
-- We just removed the constraint that limited it to specific values

