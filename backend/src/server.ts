import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { logger } from './config/logger';
import { connectDatabase } from './database/connection';
import { connectRedis } from './config/redis';
import { metricsMiddleware, metricsEndpoint } from './config/metrics';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { vehiclesRouter } from './routes/vehicles';
import { inspectionsRouter } from './routes/inspections';
import { resourcesRouter } from './routes/resources';
import { usersRouter } from './routes/users';
import { logsRouter } from './routes/logs';
import { settingsRouter } from './routes/settings';
import { syncRouter } from './routes/sync';
import { healthRouter } from './routes/health';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// ── Segurança ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));

// ── Rate Limiting ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
});
app.use(limiter);

// ── Parsing & Compressão ─────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ── Logging ──────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.http(msg.trim()) },
}));

// ── Métricas Prometheus ──────────────────────────────────
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

// ── Rotas ────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/vehicles`, vehiclesRouter);
app.use(`${API_PREFIX}/inspections`, inspectionsRouter);
app.use(`${API_PREFIX}/resources`, resourcesRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/logs`, logsRouter);
app.use(`${API_PREFIX}/settings`, settingsRouter);
app.use(`${API_PREFIX}/sync`, syncRouter);

// ── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ── Inicialização ────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDatabase();
    logger.info('PostgreSQL conectado');

    await connectRedis();
    logger.info('Redis conectado');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Servidor rodando na porta ${PORT}`);
      logger.info(`API disponível em ${API_PREFIX}`);
      logger.info(`Métricas em /metrics`);
      logger.info(`Health check em /health`);
    });
  } catch (err) {
    logger.error('Falha ao iniciar servidor:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
