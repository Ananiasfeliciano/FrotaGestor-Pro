import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDb } from '../database/connection';

export const syncRouter = Router();
syncRouter.use(authenticate);

// POST /sync/push — Client envia dados para o servidor
syncRouter.post('/push', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, data, updatedAt, deviceId } = req.body;
    if (!key || !data) {
      return res.status(400).json({ error: 'key e data são obrigatórios' });
    }

    const db = getDb();
    await db('settings')
      .insert({
        key: `sync:${key}`,
        value: JSON.stringify({ data, updatedAt, deviceId }),
      })
      .onConflict('key')
      .merge({
        value: JSON.stringify({ data, updatedAt, deviceId }),
        updated_at: db.fn.now(),
      });

    res.json({ message: 'Sincronizado', key, updatedAt });
  } catch (err) { next(err); }
});

// GET /sync/pull/:key — Client puxa dados do servidor
syncRouter.get('/pull/:key', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const row = await db('settings').where({ key: `sync:${req.params.key}` }).first();
    if (!row) return res.json({ data: null, updatedAt: 0 });

    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    res.json(parsed);
  } catch (err) { next(err); }
});

// GET /sync/status — Status de todas as chaves sincronizadas
syncRouter.get('/status', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rows = await db('settings').where('key', 'like', 'sync:%').select('key', 'updated_at');
    const status = rows.map((r: any) => ({
      key: r.key.replace('sync:', ''),
      updatedAt: r.updated_at,
    }));
    res.json(status);
  } catch (err) { next(err); }
});
