-- Add install_id column to licenses table.
-- This stores a per-browser UUID generated on extension install, used to
-- prevent the same device from claiming multiple free trials with different
-- email addresses.

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS install_id TEXT;

-- Sparse index — most rows will have a non-null value once the migration rolls
-- out, but older rows will remain NULL and should not be indexed.
CREATE INDEX IF NOT EXISTS idx_licenses_install_id
  ON licenses (install_id)
  WHERE install_id IS NOT NULL;
