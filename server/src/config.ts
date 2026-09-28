import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}`);
  }
  return value;
}

export const config = {
  botToken: required('BOT_TOKEN'),
  sessionSecret: required('SESSION_SECRET'),
  databaseUrl: required('APP_DATABASE_URL'),
  port: Number(process.env.PORT ?? 3000),
  isProd: process.env.NODE_ENV === 'production',
  // Эти два — не required(): без них сервер и вход работают как раньше,
  // просто планировщик сигналов сам себя выключит и напишет об этом в лог.
  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  signalHorizonSeconds: Number(process.env.SIGNAL_HORIZON_SECONDS ?? 300)
};
