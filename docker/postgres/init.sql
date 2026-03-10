-- ═══════════════════════════════════════════════════════════
-- PostgreSQL — Inicialização FrotaGestor Pro
-- ═══════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configurar pg_stat_statements para monitoramento
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
