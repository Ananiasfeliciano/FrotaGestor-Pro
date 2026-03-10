import { Router, Response, NextFunction } from 'express';
import { getDb } from '../database/connection';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

// GET /settings
settingsRouter.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rows = await db('settings').select('key', 'value');
    const settings: Record<string, any> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) { next(err); }
});

// PUT /settings
settingsRouter.put('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await db('settings')
        .insert({ key, value: JSON.stringify(value) })
        .onConflict('key')
        .merge({ value: JSON.stringify(value), updated_at: db.fn.now() });
    }
    res.json({ message: 'Configurações atualizadas' });
  } catch (err) { next(err); }
});
