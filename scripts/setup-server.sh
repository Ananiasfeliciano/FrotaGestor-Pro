#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# FrotaGestor Pro — Setup Inicial do Servidor
# ═══════════════════════════════════════════════════════════════════
# Execute em um servidor Ubuntu 22.04+ limpo:
#   curl -sSL https://raw.githubusercontent.com/Ananiasfeliciano/FrotaGestor-Pro/main/scripts/setup-server.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

echo "╔══════════════════════════════════════════════╗"
echo "║  FrotaGestor Pro — Setup do Servidor         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Atualizar sistema ─────────────────────────────────
echo "[1/7] Atualizando sistema..."
apt-get update -y && apt-get upgrade -y

# ── 2. Instalar Docker ───────────────────────────────────
echo "[2/7] Instalando Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# ── 3. Instalar Docker Compose ───────────────────────────
echo "[3/7] Docker Compose..."
if ! docker compose version &>/dev/null; then
    apt-get install -y docker-compose-plugin
fi

# ── 4. Instalar ferramentas ──────────────────────────────
echo "[4/7] Instalando ferramentas auxiliares..."
apt-get install -y git curl wget htop unzip fail2ban ufw

# ── 5. Configurar firewall ───────────────────────────────
echo "[5/7] Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 6. Configurar fail2ban ───────────────────────────────
echo "[6/7] Configurando fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# ── 7. Clonar projeto ────────────────────────────────────
echo "[7/7] Clonando projeto..."
PROJECT_DIR="/opt/frotagestor-pro"
if [ ! -d "${PROJECT_DIR}" ]; then
    git clone https://github.com/Ananiasfeliciano/FrotaGestor-Pro.git "${PROJECT_DIR}"
fi

cd "${PROJECT_DIR}"

# Criar .env a partir do exemplo
if [ ! -f ".env" ]; then
    cp .env.production.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais!"
    echo "   nano ${PROJECT_DIR}/.env"
    echo ""
fi

# Criar diretório SSL
mkdir -p docker/ssl

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Editar .env:           nano ${PROJECT_DIR}/.env"
echo "  2. Gerar certificado SSL: ./scripts/setup-ssl.sh seu-dominio.com"
echo "  3. Deploy:                ./scripts/deploy.sh"
echo ""
