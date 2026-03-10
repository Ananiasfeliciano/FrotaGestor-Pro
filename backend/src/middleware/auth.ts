import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(createError('Token não fornecido', 401));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    next(createError('Token inválido ou expirado', 401));
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.userRole !== 'Administrador') {
    return next(createError('Acesso restrito a administradores', 403));
  }
  next();
}
