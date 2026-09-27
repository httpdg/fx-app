// Проверка на живую: юзер A физически не может прочитать или подделать
// запись юзера B, даже если очень захочет. Запускать так:
//   node scripts/test-isolation.mjs
// Нужны переменные DATABASE_URL (супер-юзер) и APP_DATABASE_URL (app_user)
// в окружении — например через `node --env-file=.env scripts/test-isolation.mjs`

import pg from 'pg';
const { Pool } = pg;

const SUPER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;

if (!SUPER_URL || !APP_URL) {
  console.error('Нужны переменные DATABASE_URL и APP_DATABASE_URL.');
  process.exit(1);
}

const USER_A = '1';
const USER_B = '2';

async function main() {
  const superPool = new Pool({ connectionString: SUPER_URL });
  const appPool = new Pool({ connectionString: APP_URL });
  let failed = false;

  try {
    await superPool.query(
      `INSERT INTO users (id, first_name) VALUES ($1,$2),($3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [USER_A, 'Test A', USER_B, 'Test B']
    );
    await superPool.query('DELETE FROM user_settings WHERE user_id IN ($1,$2)', [USER_A, USER_B]);
    await superPool.query('INSERT INTO user_settings (user_id) VALUES ($1),($2)', [USER_A, USER_B]);

    const client = await appPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [USER_A]);

      const foreign = await client.query('SELECT * FROM user_settings WHERE user_id = $1', [USER_B]);
      if (foreign.rows.length === 0) {
        console.log('OK: юзер A не видит запись юзера B');
      } else {
        console.log('ПРОВАЛ: юзер A прочитал запись юзера B');
        failed = true;
      }

      const own = await client.query('SELECT * FROM user_settings WHERE user_id = $1', [USER_A]);
      if (own.rows.length === 1) {
        console.log('OK: юзер A видит свою запись');
      } else {
        console.log('ПРОВАЛ: юзер A не видит свою запись');
        failed = true;
      }

      let blocked = false;
      try {
        await client.query('UPDATE user_settings SET user_id = $1 WHERE user_id = $2', [USER_B, USER_A]);
      } catch {
        blocked = true;
      }
      if (blocked) {
        console.log('OK: подделать чужой user_id нельзя');
      } else {
        console.log('ПРОВАЛ: подделка user_id прошла');
        failed = true;
      }

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  } finally {
    await superPool.end();
    await appPool.end();
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
