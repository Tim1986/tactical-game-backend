-- Account deletion (GDPR/CCPA + Apple 5.1.1(v) / Google Play data-deletion).
--
-- `matches` references users(id) with RESTRICT (no cascade), so a user with
-- match history cannot be hard-deleted. Instead we soft-delete: retain the row
-- (keeping match history referentially intact) but anonymize all PII and mark
-- deleted_at. NULL deleted_at = active account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
