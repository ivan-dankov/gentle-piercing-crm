-- Migration: Remove cost_belarus and rename cost_poland to cost in earrings table

-- First, migrate any existing data from cost_poland to cost (if cost doesn't exist yet)
-- Then drop cost_belarus column
ALTER TABLE earrings DROP COLUMN IF EXISTS cost_belarus;

-- Rename cost_poland to cost
ALTER TABLE earrings RENAME COLUMN cost_poland TO cost;

