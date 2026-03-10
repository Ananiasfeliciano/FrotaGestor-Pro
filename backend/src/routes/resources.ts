import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../database/connection';
import { cacheGet, cacheSet, cacheInvalidate } from '../config/redis';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const resourcesRouter = Router();
resourcesRouter.use(authenticate);

const TABLES: Record<string, string> = {
  station: 'fuel_stations',
  workshop: 'workshops',
  parts: 'auto_part_stores',
};

const EXTRA_FIELDS: Record<string, string> = {
  station: 'combustiveis_disponiveis',
  workshop: 'especialidades',
  parts: 'tipos_pecas',
};

const resourceSchema = z.object({
  nome: z.string().min(1).max(255),
  cnpj: z.string().min(1).max(30),
  endereco: z.string().min(1).max(500),
  telefone: z.string().min(1).max(30),
  observacoes: z.string().default(''),
  extra: z.string().default(''),
});

const receiptSchema = z.object({
  vehicle_id: z.string().uuid(),
  date: z.string(),
  value: z.number().positive(),
  description: z.string().min(1).max(500),
  document_number: z.string().max(100).optional(),
  mileage: z.number().int().min(0).optional(),
  fuel_type: z.string().max(50).optional(),
  liters: z.number().positive().optional(),
  price_per_liter: z.number().positive().optional(),
  warranty_until: z.string().optional(),
  professional: z.string().max(200).optional(),
  is_oil_change: z.boolean().default(false),
  next_oil_change_km: z.number().int().min(0).optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().int().min(1),
    unit_value: z.number().positive(),
  })).optional(),
});

// GET /resources/:type
resourcesRouter.get('/:type', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = TABLES[req.params.type];
    if (!table) return next(createError('Tipo de recurso inválido', 400));

    const cached = await cacheGet(`resources:${req.params.type}`);
    if (cached) return res.json(cached);

    const db = getDb();
    const resources = await db(table).orderBy('nome');

    // Carregar receipts para cada recurso
    const ids = resources.map((r: any) => r.id);
    const receipts = ids.length > 0
      ? await db('receipts').where({ resource_type: req.params.type }).whereIn('resource_id', ids)
      : [];

    const result = resources.map((r: any) => ({
      ...r,
      receipts: receipts.filter((rc: any) => rc.resource_id === r.id),
    }));

    await cacheSet(`resources:${req.params.type}`, result, 120);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /resources/:type
resourcesRouter.post('/:type', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = TABLES[req.params.type];
    const extraField = EXTRA_FIELDS[req.params.type];
    if (!table) return next(createError('Tipo de recurso inválido', 400));

    const data = resourceSchema.parse(req.body);
    const db = getDb();

    const row: any = {
      nome: data.nome,
      cnpj: data.cnpj,
      endereco: data.endereco,
      telefone: data.telefone,
      observacoes: data.observacoes,
    };
    if (extraField) row[extraField] = data.extra;

    const [resource] = await db(table).insert(row).returning('*');
    await cacheInvalidate(`resources:${req.params.type}`);
    res.status(201).json(resource);
  } catch (err) { next(err); }
});

// PUT /resources/:type/:id
resourcesRouter.put('/:type/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = TABLES[req.params.type];
    const extraField = EXTRA_FIELDS[req.params.type];
    if (!table) return next(createError('Tipo de recurso inválido', 400));

    const data = resourceSchema.partial().parse(req.body);
    const db = getDb();

    const row: any = { ...data, updated_at: db.fn.now() };
    if (extraField && data.extra !== undefined) {
      row[extraField] = data.extra;
      delete row.extra;
    }

    const [resource] = await db(table).where({ id: req.params.id }).update(row).returning('*');
    if (!resource) return next(createError('Recurso não encontrado', 404));
    await cacheInvalidate(`resources:${req.params.type}`);
    res.json(resource);
  } catch (err) { next(err); }
});

// DELETE /resources/:type/:id
resourcesRouter.delete('/:type/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = TABLES[req.params.type];
    if (!table) return next(createError('Tipo de recurso inválido', 400));

    const db = getDb();
    // Deletar receipts associados
    await db('receipts').where({ resource_type: req.params.type, resource_id: req.params.id }).del();
    const deleted = await db(table).where({ id: req.params.id }).del();
    if (!deleted) return next(createError('Recurso não encontrado', 404));
    await cacheInvalidate(`resources:${req.params.type}`);
    res.json({ message: 'Recurso excluído' });
  } catch (err) { next(err); }
});

// POST /resources/:type/:id/receipts
resourcesRouter.post('/:type/:id/receipts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = TABLES[req.params.type];
    if (!table) return next(createError('Tipo de recurso inválido', 400));

    const data = receiptSchema.parse(req.body);
    const db = getDb();

    const resource = await db(table).where({ id: req.params.id }).first();
    if (!resource) return next(createError('Recurso não encontrado', 404));

    const { items, ...receiptData } = data;
    const [receipt] = await db('receipts').insert({
      ...receiptData,
      resource_type: req.params.type,
      resource_id: req.params.id,
    }).returning('*');

    if (items && items.length > 0) {
      const itemRows = items.map((item) => ({ ...item, receipt_id: receipt.id }));
      await db('receipt_items').insert(itemRows);
    }

    // Atualizar quilometragem do veículo se for maior
    if (data.mileage) {
      await db('vehicles')
        .where('id', data.vehicle_id)
        .andWhere('quilometragem', '<', data.mileage)
        .update({ quilometragem: data.mileage });
      await cacheInvalidate('vehicles:*');
    }

    await cacheInvalidate(`resources:${req.params.type}`);
    res.status(201).json(receipt);
  } catch (err) { next(err); }
});
