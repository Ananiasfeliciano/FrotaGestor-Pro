import { Router, Response, NextFunction } from 'express';
import { getDb } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

export const logsRouter = Router();
logsRouter.use(authenticate);

// GET /logs
logsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await db('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('audit_logs').count('* as count');
    res.json({ data: logs, total: Number(count) });
  } catch (err) { next(err); }
});
