-- Migration: Create additional_costs table
-- This table stores additional business costs like rent, ads, print, consumables, etc.

CREATE TABLE IF NOT EXISTS additional_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rent', 'ads', 'print', 'consumables', 'other')),
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_additional_costs_user_id ON additional_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_costs_date ON additional_costs(date);
CREATE INDEX IF NOT EXISTS idx_additional_costs_type ON additional_costs(type);

-- Enable RLS (Row Level Security)
ALTER TABLE additional_costs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own costs
CREATE POLICY "Users can view their own additional costs"
  ON additional_costs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own costs
CREATE POLICY "Users can insert their own additional costs"
  ON additional_costs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own costs
CREATE POLICY "Users can update their own additional costs"
  ON additional_costs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own costs
CREATE POLICY "Users can delete their own additional costs"
  ON additional_costs
  FOR DELETE
  USING (auth.uid() = user_id);

