import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../database/connection';
import { cacheInvalidate } from '../config/redis';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const inspectionsRouter = Router();
inspectionsRouter.use(authenticate);

const inspectionItemSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(['OK', 'Atenção', 'Problema']),
  observation: z.string().default(''),
});

const inspectionSchema = z.object({
  vehicle_id: z.string().uuid(),
  status_final: z.enum(['Aprovado', 'Reprovado']),
  observacoes_gerais: z.string().default(''),
  items: z.array(inspectionItemSchema).min(1),
  photo_urls: z.array(z.string()).default([]),
});

// GET /inspections
inspectionsRouter.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const inspections = await db('inspections')
      .leftJoin('vehicles', 'inspections.vehicle_id', 'vehicles.id')
      .leftJoin('users', 'inspections.user_id', 'users.id')
      .select(
        'inspections.*',
        'vehicles.placa as veiculo_placa',
        'vehicles.modelo as veiculo_modelo',
        'users.name as usuario_nome',
      )
      .orderBy('inspections.data', 'desc');

    // Carregar itens para cada inspeção
    const ids = inspections.map((i: any) => i.id);
    const items = ids.length > 0
      ? await db('inspection_items').whereIn('inspection_id', ids)
      : [];

    const result = inspections.map((insp: any) => ({
      ...insp,
      items: items.filter((it: any) => it.inspection_id === insp.id),
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// POST /inspections
inspectionsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = inspectionSchema.parse(req.body);
    const db = getDb();

    const [inspection] = await db('inspections').insert({
      vehicle_id: data.vehicle_id,
      user_id: req.userId,
      status_final: data.status_final,
      observacoes_gerais: data.observacoes_gerais,
      photo_urls: JSON.stringify(data.photo_urls),
    }).returning('*');

    // Inserir itens
    const itemRows = data.items.map((item) => ({
      inspection_id: inspection.id,
      name: item.name,
      status: item.status,
      observation: item.observation,
    }));
    await db('inspection_items').insert(itemRows);

    // Se reprovado, colocar veículo em manutenção
    if (data.status_final === 'Reprovado') {
      await db('vehicles').where({ id: data.vehicle_id }).update({ status: 'manutencao' });
      await cacheInvalidate('vehicles:*');
    }

    await db('audit_logs').insert({
      user_id: req.userId!,
      user_name: '',
      action: 'CRIAÇÃO',
      module: 'Inspeções',
      details: `Inspeção ${data.status_final} criada para veículo ${data.vehicle_id}`,
    });

    res.status(201).json({ ...inspection, items: data.items });
  } catch (err) { next(err); }
});

// GET /inspections/:id
inspectionsRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const inspection = await db('inspections').where({ id: req.params.id }).first();
    if (!inspection) return next(createError('Inspeção não encontrada', 404));

    const items = await db('inspection_items').where({ inspection_id: inspection.id });
    res.json({ ...inspection, items });
  } catch (err) { next(err); }
});
