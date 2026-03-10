import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection';
import { getRedis } from '../config/redis';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    await getDb().raw('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await getRedis().ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    await getDb().raw('SELECT 1');
    await getRedis().ping();
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({ alive: true });
});
