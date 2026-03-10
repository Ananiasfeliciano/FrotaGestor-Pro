import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let client: RedisClientType;

export async function connectRedis(): Promise<RedisClientType> {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  client = createClient({
    socket: { host, port },
    password,
  });

  client.on('error', (err) => logger.error('Redis erro:', err));
  client.on('reconnecting', () => logger.warn('Redis reconectando...'));

  await client.connect();
  return client;
}

export function getRedis(): RedisClientType {
  if (!client) throw new Error('Redis não inicializado');
  return client;
}

// ── Cache helpers ────────────────────────────────────────
const DEFAULT_TTL = 300; // 5 minutos

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(key: string, data: unknown, ttl = DEFAULT_TTL): Promise<void> {
  await getRedis().setEx(`cache:${key}`, ttl, JSON.stringify(data));
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  const keys = await getRedis().keys(`cache:${pattern}`);
  if (keys.length > 0) await getRedis().del(keys);
}

export async function sessionSet(userId: string, token: string, ttl = 28800): Promise<void> {
  await getRedis().setEx(`session:${userId}`, ttl, token);
}

export async function sessionGet(userId: string): Promise<string | null> {
  return getRedis().get(`session:${userId}`);
}

export async function sessionDel(userId: string): Promise<void> {
  await getRedis().del(`session:${userId}`);
}
