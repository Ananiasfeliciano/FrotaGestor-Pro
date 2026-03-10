import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../database/connection';
import { cacheGet, cacheSet, cacheInvalidate } from '../config/redis';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);

const vehicleSchema = z.object({
  placa: z.string().min(1).max(20),
  renavam: z.string().min(1).max(30),
  chassi: z.string().min(1).max(50),
  marca: z.string().min(1).max(100),
  modelo: z.string().min(1).max(100),
  ano_fabricacao: z.number().int().min(1900).max(2100),
  ano_modelo: z.number().int().min(1900).max(2100),
  tipo_veiculo: z.string().min(1).max(50),
  cor: z.string().min(1).max(50),
  combustivel: z.string().min(1).max(50),
  quilometragem: z.number().int().min(0),
  data_ultima_revisao: z.string().optional(),
  status: z.enum(['ativo', 'manutencao', 'inativo']).default('ativo'),
  observacoes: z.string().default(''),
  crlv_url: z.string().max(500).optional(),
  seguro_url: z.string().max(500).optional(),
});

// GET /vehicles
vehiclesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cached = await cacheGet<unknown[]>('vehicles:all');
    if (cached) return res.json(cached);

    const db = getDb();
    const vehicles = await db('vehicles').orderBy('placa');
    await cacheSet('vehicles:all', vehicles, 120);
    res.json(vehicles);
  } catch (err) { next(err); }
});

// GET /vehicles/:id
vehiclesRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const vehicle = await db('vehicles').where({ id: req.params.id }).first();
    if (!vehicle) return next(createError('Veículo não encontrado', 404));
    res.json(vehicle);
  } catch (err) { next(err); }
});

// POST /vehicles
vehiclesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = vehicleSchema.parse(req.body);
    const db = getDb();
    const [vehicle] = await db('vehicles').insert(data).returning('*');
    await cacheInvalidate('vehicles:*');

    await db('audit_logs').insert({
      user_id: req.userId,
      user_name: '',
      action: 'CRIAÇÃO',
      module: 'Veículos',
      details: `Veículo ${data.placa} criado`,
    });

    res.status(201).json(vehicle);
  } catch (err) { next(err); }
});

// PUT /vehicles/:id
vehiclesRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = vehicleSchema.partial().parse(req.body);
    const db = getDb();
    const [vehicle] = await db('vehicles')
      .where({ id: req.params.id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    if (!vehicle) return next(createError('Veículo não encontrado', 404));
    await cacheInvalidate('vehicles:*');

    await db('audit_logs').insert({
      user_id: req.userId,
      user_name: '',
      action: 'ALTERAÇÃO',
      module: 'Veículos',
      details: `Veículo ${vehicle.placa} alterado`,
    });

    res.json(vehicle);
  } catch (err) { next(err); }
});

// DELETE /vehicles/:id
vehiclesRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const vehicle = await db('vehicles').where({ id: req.params.id }).first();
    if (!vehicle) return next(createError('Veículo não encontrado', 404));

    await db('vehicles').where({ id: req.params.id }).del();
    await cacheInvalidate('vehicles:*');

    await db('audit_logs').insert({
      user_id: req.userId,
      user_name: '',
      action: 'EXCLUSÃO',
      module: 'Veículos',
      details: `Veículo ${vehicle.placa} excluído`,
    });

    res.json({ message: 'Veículo excluído com sucesso' });
  } catch (err) { next(err); }
});
