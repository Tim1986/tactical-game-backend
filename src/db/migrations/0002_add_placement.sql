ALTER TABLE teams ADD COLUMN IF NOT EXISTS placement JSONB NOT NULL DEFAULT '[{"x":1,"y":1},{"x":1,"y":3},{"x":1,"y":5},{"x":1,"y":7}]';
