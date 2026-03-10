import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../database/connection';
import { sessionSet, sessionDel } from '../config/redis';
import { createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Rate limit para login: 5 tentativas / 60 segundos
const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: 'Muitas tentativas. Aguarde 60 segundos.' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(255),
});

// POST /auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const db = getDb();

    const user = await db('users')
      .where({ username: username.toUpperCase(), status: 'Ativo' })
      .first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return next(createError('Credenciais inválidas', 401));
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    await sessionSet(user.id, token);

    // Audit log
    await db('audit_logs').insert({
      user_id: user.id,
      user_name: user.name,
      action: 'LOGIN',
      module: 'Autenticação',
      details: `Login realizado via ${req.headers['user-agent']?.substring(0, 100) || 'unknown'}`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.userId) await sessionDel(req.userId);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const user = await db('users').where({ id: req.userId }).first();
    if (!user) return next(createError('Usuário não encontrado', 404));

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    next(err);
  }
});
