import crypto from 'node:crypto';
import { config } from './config';

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface VerifiedInitData {
  user: TelegramUser;
}

// Проверка подписи initData по алгоритму самого Telegram:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
// Клиенту не верим совсем — сюда попадает только то, что прошло эту проверку.
export function verifyTelegramInitData(initData: string): VerifiedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const pairs: string[] = [];
  params.forEach((value, key) => {
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    return null;
  }

  // Отбрасываем совсем протухшие initData (больше суток).
  const authDate = Number(params.get('auth_date') ?? '0');
  const ageSeconds = Date.now() / 1000 - authDate;
  if (!authDate || ageSeconds > 86400) {
    return null;
  }

  const userRaw = params.get('user');
  if (!userRaw) return null;

  const user = JSON.parse(userRaw) as TelegramUser;
  return { user };
}

export function signSession(userId: string): string {
  const hmac = crypto.createHmac('sha256', config.sessionSecret).update(userId).digest('hex');
  return `${userId}.${hmac}`;
}

export function verifySession(value: string | undefined): string | null {
  if (!value) return null;
  const [userId, sig] = value.split('.');
  if (!userId || !sig) return null;

  const expected = crypto.createHmac('sha256', config.sessionSecret).update(userId).digest('hex');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return userId;
}
