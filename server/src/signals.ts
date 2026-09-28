import { pool } from './db';

export interface Signal {
  id: number;
  pair: string;
  direction: 'up' | 'down';
  horizon_seconds: number;
  reasoning: string | null;
  entry_price: string | null;
  exit_price: string | null;
  result: 'hit' | 'miss' | null;
  created_at: string;
  resolved_at: string | null;
}

export async function getEnabledPairs(): Promise<string[]> {
  const result = await pool.query('SELECT pair FROM pair_settings WHERE enabled = true ORDER BY pair');
  return result.rows.map((r) => r.pair);
}

export async function getLastSignalAt(pair: string): Promise<Date | null> {
  const result = await pool.query(
    'SELECT created_at FROM signals WHERE pair = $1 ORDER BY created_at DESC LIMIT 1',
    [pair]
  );
  return result.rows[0]?.created_at ?? null;
}

export async function insertSignal(input: {
  pair: string;
  direction: 'up' | 'down';
  horizonSeconds: number;
  reasoning: string;
  entryPrice: number;
}) {
  await pool.query(
    `INSERT INTO signals (pair, direction, horizon_seconds, reasoning, entry_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.pair, input.direction, input.horizonSeconds, input.reasoning, input.entryPrice]
  );
}

// Сигналы, которым пора подводить итог: время с момента создания уже
// перевалило за их собственный horizon_seconds, а итога ещё нет.
export async function getDueSignals(): Promise<Signal[]> {
  const result = await pool.query(
    `SELECT * FROM signals
     WHERE resolved_at IS NULL
       AND created_at <= now() - (horizon_seconds || ' seconds')::interval`
  );
  return result.rows;
}

export async function resolveSignal(id: number, exitPrice: number, result: 'hit' | 'miss') {
  await pool.query(
    'UPDATE signals SET exit_price = $1, result = $2, resolved_at = now() WHERE id = $3',
    [exitPrice, result, id]
  );
}

export async function getRecentSignals(limit = 30): Promise<Signal[]> {
  const result = await pool.query(
    'SELECT * FROM signals ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

export async function getHitStats(limit = 20): Promise<{ hits: number; total: number }> {
  const result = await pool.query(
    `SELECT result FROM signals WHERE result IS NOT NULL ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  const total = result.rows.length;
  const hits = result.rows.filter((r) => r.result === 'hit').length;
  return { hits, total };
}
