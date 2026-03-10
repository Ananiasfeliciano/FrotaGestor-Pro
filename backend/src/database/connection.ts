import knex, { Knex } from 'knex';
import { logger } from '../config/logger';

let db: Knex;

export async function connectDatabase(): Promise<Knex> {
  db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'frotagestor',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'frotagestor_pro',
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
    },
    migrations: {
      directory: __dirname + '/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: __dirname + '/seeds',
    },
  });

  // Testar conexão
  await db.raw('SELECT 1');
  logger.info('Database pool inicializado');

  // Executar migrations pendentes
  const [batch, migrations] = await db.migrate.latest();
  if (migrations.length > 0) {
    logger.info(`Migrations executadas (batch ${batch}): ${migrations.join(', ')}`);
  }

  return db;
}

export function getDb(): Knex {
  if (!db) throw new Error('Database não inicializado');
  return db;
}
