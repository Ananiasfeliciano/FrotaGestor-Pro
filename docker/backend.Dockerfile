# ═══════════════════════════════════════════════════════════
# FrotaGestor Pro — Backend API Dockerfile
# Multi-stage build para imagem otimizada
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm run build

# ── Stage 2: Production ──────────────────────────────────
FROM node:22-alpine AS production

RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app

WORKDIR /app

COPY --from=builder /app/package.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs && chown -R app:app /app

USER app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health/live || exit 1

CMD ["node", "dist/server.js"]
