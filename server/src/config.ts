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
  isProd: process.env.NODE_ENV === 'production'
};
