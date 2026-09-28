CREATE TABLE IF NOT EXISTS pair_settings (
  pair TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO pair_settings (pair) VALUES ('EUR/USD'), ('GBP/USD'), ('USD/JPY')
ON CONFLICT (pair) DO NOTHING;

CREATE TABLE IF NOT EXISTS signals (
  id BIGSERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  horizon_seconds INT NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signals_pair_created_idx ON signals (pair, created_at DESC);

-- Эти две таблицы НЕ имеют RLS-политики по владельцу — сигналы и список пар
-- не принадлежат конкретному юзеру, это общая для всех витрина, а не личные
-- данные. Изоляция по владельцу тут просто неприменима.
GRANT SELECT, INSERT, UPDATE, DELETE ON pair_settings, signals TO app_user;
GRANT USAGE, SELECT ON SEQUENCE signals_id_seq TO app_user;
