#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# FrotaGestor Pro — Backup Manual
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="/opt/frotagestor-pro/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "${BACKUP_DIR}"

echo "Fazendo backup do FrotaGestor Pro..."

# Backup do PostgreSQL
echo "[1/3] Backup do banco de dados..."
docker exec frotagestor-postgres pg_dump \
    -U "${DB_USER:-frotagestor}" \
    -d "${DB_NAME:-frotagestor_pro}" \
    --format=custom \
    --compress=9 \
    > "${BACKUP_DIR}/db_${TIMESTAMP}.dump"

# Backup do Redis
echo "[2/3] Backup do Redis..."
docker exec frotagestor-redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE
sleep 2
docker cp frotagestor-redis:/data/dump.rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Backup das configurações
echo "[3/3] Backup das configurações..."
tar -czf "${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz" \
    .env \
    docker-compose.yml \
    docker/nginx/ \
    docker/monitoring/ \
    docker/postgres/ \
    2>/dev/null || true

# Limpar backups antigos (manter 30 dias)
find "${BACKUP_DIR}" -name "*.dump" -mtime +30 -delete
find "${BACKUP_DIR}" -name "*.rdb" -mtime +30 -delete
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +30 -delete

echo ""
echo "✅ Backup concluído em ${BACKUP_DIR}/"
ls -lh "${BACKUP_DIR}"/*_${TIMESTAMP}*
