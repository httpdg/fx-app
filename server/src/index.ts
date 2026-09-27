import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fstatic from '@fastify/static';
import path from 'node:path';
import { config } from './config';
import { verifyTelegramInitData, signSession, verifySession } from './auth';
import { upsertUser } from './db';

const app = Fastify({ logger: true });
const SESSION_COOKIE = 'session';

app.register(cookie);
app.register(fstatic, {
  root: path.join(__dirname, '..', 'public'),
  wildcard: false
});

// Единственная точка входа. Телега передаёт initData, мы проверяем подпись
// на сервере и в ответ выдаём сессию. Отдельного экрана логина нет —
// с точки зрения юзера он просто открыл приложение и уже внутри.
app.post('/api/auth/telegram', async (req, reply) => {
  const body = req.body as { initData?: string } | undefined;
  const initData = body?.initData;
  if (!initData) {
    return reply.code(400).send({ ok: false });
  }

  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return reply.code(401).send({ ok: false });
  }

  const userId = String(verified.user.id);
  await upsertUser({
    id: userId,
    username: verified.user.username,
    firstName: verified.user.first_name
  });

  reply.setCookie(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  return { ok: true };
});

app.get('/api/me', async (req, reply) => {
  const userId = verifySession(req.cookies[SESSION_COOKIE]);
  if (!userId) {
    return reply.code(401).send({ ok: false });
  }
  return { ok: true, userId };
});

// Всё, что не /api, отдаём как SPA — фронт сам разберётся с маршрутом.
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url?.startsWith('/api')) {
    reply.code(404).send({ ok: false });
    return;
  }
  reply.sendFile('index.html');
});

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
