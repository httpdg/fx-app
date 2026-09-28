import { Pool, PoolClient } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

// Все запросы, завязанные на конкретного юзера, идут ТОЛЬКО через эту
// функцию. Она выставляет app.current_user_id внутри транзакции — RLS-
// политики в базе читают эту переменную и физически не отдают чужие строки,
// даже если в коде выше будет баг или подделанный запрос.
export async function withUserContext<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertUser(user: { id: string; username?: string; firstName?: string }) {
  await withUserContext(user.id, (client) =>
    client.query(
      `INSERT INTO users (id, username, first_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, first_name = EXCLUDED.first_name`,
      [user.id, user.username ?? null, user.firstName ?? null]
    )
  );
}
