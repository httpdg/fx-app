import { pool } from './db';

export interface Signal {
  id: number;
  pair: string;
  direction: 'up' | 'down';
  horizon_seconds: number;
  reasoning: string | null;
  created_at: string;
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

export async function insertSignal(
  pair: string,
  direction: 'up' | 'down',
  horizonSeconds: number,
  reasoning: string
) {
  await pool.query(
    'INSERT INTO signals (pair, direction, horizon_seconds, reasoning) VALUES ($1, $2, $3, $4)',
    [pair, direction, horizonSeconds, reasoning]
  );
}

export async function getRecentSignals(limit = 30): Promise<Signal[]> {
  const result = await pool.query(
    'SELECT id, pair, direction, horizon_seconds, reasoning, created_at FROM signals ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}
