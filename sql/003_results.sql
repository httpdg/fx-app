ALTER TABLE signals ADD COLUMN IF NOT EXISTS entry_price NUMERIC;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS exit_price NUMERIC;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('hit', 'miss'));
ALTER TABLE signals ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS signals_unresolved_idx ON signals (created_at) WHERE resolved_at IS NULL;
