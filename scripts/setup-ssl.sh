#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# FrotaGestor Pro — Setup SSL (Let's Encrypt)
# ═══════════════════════════════════════════════════════════════════
# Uso: ./scripts/setup-ssl.sh frotagestor-pro.com
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

DOMAIN="${1:?Uso: $0 <dominio>}"
PROJECT_DIR="/opt/frotagestor-pro"
SSL_DIR="${PROJECT_DIR}/docker/ssl"

echo "Gerando certificado SSL para: ${DOMAIN}"

# Instalar certbot se necessário
if ! command -v certbot &>/dev/null; then
    apt-get install -y certbot
fi

# Gerar certificado
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@${DOMAIN} \
    -d ${DOMAIN} \
    -d www.${DOMAIN}

# Copiar para diretório do projeto
mkdir -p "${SSL_DIR}"
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem "${SSL_DIR}/"
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem "${SSL_DIR}/"

# Cron para renovação automática
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'cp /etc/letsencrypt/live/${DOMAIN}/*.pem ${SSL_DIR}/ && docker compose -f ${PROJECT_DIR}/docker-compose.yml restart nginx'") | sort -u | crontab -

echo "✅ Certificado SSL gerado!"
echo "   ${SSL_DIR}/fullchain.pem"
echo "   ${SSL_DIR}/privkey.pem"
echo "   Renovação automática configurada via cron."
