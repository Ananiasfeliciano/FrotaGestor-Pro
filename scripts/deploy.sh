#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# FrotaGestor Pro — Script de Deploy (Servidor Linux)
# ═══════════════════════════════════════════════════════════════════
# Uso: ./scripts/deploy.sh [production|staging]
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

ENVIRONMENT="${1:-production}"
PROJECT_DIR="/opt/frotagestor-pro"
COMPOSE_FILE="docker-compose.yml"

echo "╔══════════════════════════════════════════════╗"
echo "║  FrotaGestor Pro — Deploy ${ENVIRONMENT}     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Verificar pré-requisitos ───────────────────────────
echo "[1/8] Verificando pré-requisitos..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker não encontrado"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ Docker Compose não encontrado"; exit 1; }

# ── 2. Ir para diretório do projeto ──────────────────────
echo "[2/8] Navegando para ${PROJECT_DIR}..."
cd "${PROJECT_DIR}"

# ── 3. Verificar .env ────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "📋 Copie .env.production.example para .env e preencha os valores."
    exit 1
fi

# ── 4. Pull das imagens mais recentes ────────────────────
echo "[3/8] Baixando imagens atualizadas..."
docker compose -f "${COMPOSE_FILE}" pull

# ── 5. Build dos serviços ────────────────────────────────
echo "[4/8] Construindo serviços..."
docker compose -f "${COMPOSE_FILE}" build --no-cache

# ── 6. Parar serviços antigos ────────────────────────────
echo "[5/8] Parando serviços antigos..."
docker compose -f "${COMPOSE_FILE}" down --remove-orphans

# ── 7. Iniciar serviços ──────────────────────────────────
echo "[6/8] Iniciando serviços..."
docker compose -f "${COMPOSE_FILE}" up -d

# ── 8. Iniciar monitoramento ─────────────────────────────
echo "[7/8] Iniciando monitoramento..."
docker compose -f "${COMPOSE_FILE}" --profile monitoring up -d

# ── 9. Verificar saúde ───────────────────────────────────
echo "[8/8] Verificando saúde dos serviços..."
sleep 10

echo ""
echo "═══ Status dos Serviços ══════════════════════"
docker compose -f "${COMPOSE_FILE}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "═══ Health Checks ════════════════════════════"
HEALTH=$(curl -sf http://localhost:4000/health 2>/dev/null || echo '{"status":"unreachable"}')
echo "API: ${HEALTH}"

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📊 Grafana:   http://localhost:3001"
echo "🔍 Prometheus: http://localhost:9090"
echo "🌐 App:       https://frotagestor-pro.com"
echo ""
