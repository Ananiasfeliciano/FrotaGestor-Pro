import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../database/connection';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const usersRouter = Router();
usersRouter.use(authenticate);

const userSchema = z.object({
  name: z.string().min(1).max(255),
  username: z.string().min(1).max(100),
  password: z.string().min(8).max(255).refine(
    (v) => /[A-Z]/.test(v) && /[0-9]/.test(v) && /[!@#$%^&*]/.test(v),
    { message: 'Senha deve conter maiúscula, número e caractere especial' },
  ),
  role: z.enum(['Administrador', 'Operador']).default('Operador'),
});

// GET /users
usersRouter.get('/', requireAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const users = await db('users').select('id', 'name', 'username', 'role', 'status', 'created_at');
    res.json(users);
  } catch (err) { next(err); }
});

// POST /users
usersRouter.post('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = userSchema.parse(req.body);
    const db = getDb();

    const exists = await db('users').where({ username: data.username.toUpperCase() }).first();
    if (exists) return next(createError('Nome de usuário já existe', 409));

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await db('users').insert({
      name: data.name,
      username: data.username.toUpperCase(),
      password_hash: passwordHash,
      role: data.role,
      status: 'Ativo',
    }).returning(['id', 'name', 'username', 'role', 'status']);

    await db('audit_logs').insert({
      user_id: req.userId!,
      user_name: '',
      action: 'CRIAÇÃO',
      module: 'Usuários',
      details: `Usuário ${data.username} criado`,
    });

    res.status(201).json(user);
  } catch (err) { next(err); }
});

// DELETE /users/:id
usersRouter.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.userId) {
      return next(createError('Não é possível excluir seu próprio usuário', 400));
    }
    const db = getDb();
    const deleted = await db('users').where({ id: req.params.id }).del();
    if (!deleted) return next(createError('Usuário não encontrado', 404));
    res.json({ message: 'Usuário excluído' });
  } catch (err) { next(err); }
});
