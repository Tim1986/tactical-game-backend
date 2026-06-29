-- Migration 0003: Add armor_class and is_special to support new unit design

-- Add armor_class to unit_definitions
ALTER TABLE unit_definitions ADD COLUMN IF NOT EXISTS armor_class INTEGER NOT NULL DEFAULT 15;

-- Add is_special to ability_definitions  
ALTER TABLE ability_definitions ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT FALSE;

-- Add special_used to unit tracking in match state (stored in JSONB, no schema change needed)
-- The match state JSONB will now include specialUsed: boolean per unit instance
