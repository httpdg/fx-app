-- Выполняется один раз через psql или SQL-консоль Railway, от имени
-- супер-юзера (того, под кем Railway создаёт базу — обычно postgres).

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY, -- это telegram user id, отдельный uuid не нужен
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_owner ON users;
CREATE POLICY users_owner ON users
  USING (id = current_setting('app.current_user_id', true)::bigint)
  WITH CHECK (id = current_setting('app.current_user_id', true)::bigint);

-- Пример таблицы с данными, привязанными к юзеру.
-- Каждая следующая таблица с личными данными делается по этому же образцу.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- FORCE заставляет политику работать даже для владельца таблицы.
-- Важно: супер-юзер (postgres) всё равно обходит RLS всегда — это
-- правило самого Postgres, а не наша недоработка. Поэтому сервер
-- обязан подключаться под отдельной ролью без прав супер-юзера (см. ниже).
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_owner ON user_settings;
CREATE POLICY user_settings_owner ON user_settings
  USING (user_id = current_setting('app.current_user_id', true)::bigint)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::bigint);

-- Роль для самого бэкенда. НЕ супер-юзер — иначе вся защита выше
-- не имеет смысла. Замени пароль на свой перед выполнением.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'rootbaby';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- После этого собери APP_DATABASE_URL вручную:
-- postgresql://app_user:ЗАМЕНИ_НА_СВОЙ_ПАРОЛЬ@<хост из DATABASE_URL>:<порт>/<база>
