-- Migration 0006: Add is_unblockable flag to ability_definitions
ALTER TABLE ability_definitions ADD COLUMN IF NOT EXISTS is_unblockable BOOLEAN NOT NULL DEFAULT FALSE;
