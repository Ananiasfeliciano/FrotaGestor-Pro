# FrotaGestor Pro — Infraestrutura Cloud

## Arquitetura

```
                    ┌──────────────────────────────────────────────────────┐
                    │                    INTERNET                          │
                    └────────────────────┬─────────────────────────────────┘
                                         │
                                    ┌────┴────┐
                                    │  NGINX  │  ← SSL / Load Balancer
                                    │  :80/443│     Rate Limiting
                                    └────┬────┘
                              ┌──────────┼──────────┐
                              │          │          │
                        ┌─────┴───┐ ┌────┴────┐ ┌───┴──────┐
                        │Frontend │ │ API (x3)│ │WebSocket │
                        │  React  │ │ Express │ │  Sync    │
                        │  :80    │ │  :4000  │ │  :4000   │
                        └─────────┘ └────┬────┘ └───┬──────┘
                                         │          │
                              ┌──────────┼──────────┘
                              │          │
                        ┌─────┴───┐ ┌────┴────┐
                        │ Redis   │ │PostgreSQL│
                        │ Cache   │ │ Database │
                        │ :6379   │ │  :5432   │
                        └─────────┘ └─────────┘
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                        ┌─────┴───┐ ┌────┴────┐ ┌───┴──────┐
                        │Prometheus│ │ Grafana │ │  ELK     │
                        │ Métricas│ │Dashboards│ │  Logs    │
                        │  :9090  │ │  :3001  │ │  :5601   │
                        └─────────┘ └─────────┘ └──────────┘
```

## Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Nginx | 80, 443 | Reverse proxy, SSL, load balancer |
| Frontend | 80 (interno) | React SPA via Nginx |
| Backend API | 4000 | Express.js REST API |
| PostgreSQL | 5432 | Banco de dados principal |
| Redis | 6379 | Cache, sessões, filas |
| Prometheus | 9090 | Coleta de métricas |
| Grafana | 3001 | Dashboards de monitoramento |
| Elasticsearch | 9200 | Armazenamento de logs |
| Logstash | 5044 | Pipeline de logs |
| Kibana | 5601 | Visualização de logs |

## Requisitos do Servidor

### Mínimo (Dev/Staging)
- 2 vCPU, 4 GB RAM, 40 GB SSD
- Ubuntu 22.04 LTS

### Produção
- 4 vCPU, 8 GB RAM, 100 GB SSD
- Ubuntu 22.04 LTS

### Produção + Monitoramento + Logs
- 8 vCPU, 16 GB RAM, 200 GB SSD

## Deploy Rápido

### 1. Setup do Servidor
```bash
# Em um servidor Ubuntu limpo:
curl -sSL https://raw.githubusercontent.com/Ananiasfeliciano/FrotaGestor-Pro/main/scripts/setup-server.sh | bash
```

### 2. Configurar Variáveis
```bash
cd /opt/frotagestor-pro
nano .env    # Preencher JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD, etc.
```

### 3. SSL (Let's Encrypt)
```bash
./scripts/setup-ssl.sh frotagestor-pro.com
```

### 4. Deploy
```bash
./scripts/deploy.sh production
```

### 5. Verificar
```bash
# Health check
curl https://frotagestor-pro.com/health

# Status dos containers
docker compose ps

# Logs
docker compose logs -f backend
```

## Comandos Úteis

```bash
# ── Iniciar tudo ──────────────────────────────
docker compose up -d

# ── Com monitoramento ─────────────────────────
docker compose --profile monitoring up -d

# ── Com logs centralizados ────────────────────
docker compose --profile logging up -d

# ── Escalar backend (3 instâncias) ────────────
docker compose up -d --scale backend=3

# ── Ver logs em tempo real ────────────────────
docker compose logs -f backend

# ── Parar tudo ────────────────────────────────
docker compose down

# ── Backup manual ─────────────────────────────
./scripts/backup.sh

# ── Atualizar ─────────────────────────────────
git pull origin main
docker compose build --no-cache
docker compose up -d
```

## CI/CD

O pipeline [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) executa automaticamente:

```
Push no GitHub (main)
    │
    ├── Lint & Typecheck (frontend + backend)
    ├── Testes Backend (com Postgres + Redis)
    │
    ├── Build Docker Images → GitHub Container Registry
    ├── Deploy Vercel (frontend web)
    ├── Deploy Server (SSH → docker compose up)
    └── Build Electron (Windows installer)
```

### GitHub Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_DATABASE_URL` | Firebase RTDB URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_ID` | Firebase messaging ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_URL` | URL da API (/api/v1) |
| `VERCEL_TOKEN` | Token de deploy Vercel |
| `VERCEL_ORG_ID` | Org ID do Vercel |
| `VERCEL_PROJECT_ID` | Project ID do Vercel |
| `SERVER_HOST` | IP do servidor de produção |
| `SERVER_USER` | Usuário SSH |
| `SERVER_SSH_KEY` | Chave SSH privada |

## API Endpoints

### Autenticação
```
POST   /api/v1/auth/login     → Login (retorna JWT)
POST   /api/v1/auth/logout    → Logout (invalida sessão)
GET    /api/v1/auth/me         → Dados do usuário logado
```

### Veículos
```
GET    /api/v1/vehicles        → Listar todos
GET    /api/v1/vehicles/:id    → Detalhes
POST   /api/v1/vehicles        → Criar
PUT    /api/v1/vehicles/:id    → Atualizar
DELETE /api/v1/vehicles/:id    → Excluir
```

### Inspeções
```
GET    /api/v1/inspections     → Listar todas
GET    /api/v1/inspections/:id → Detalhes
POST   /api/v1/inspections     → Criar (14 itens checklist)
```

### Recursos (Postos / Oficinas / Peças)
```
GET    /api/v1/resources/:type          → Listar
POST   /api/v1/resources/:type          → Criar
PUT    /api/v1/resources/:type/:id      → Atualizar
DELETE /api/v1/resources/:type/:id      → Excluir
POST   /api/v1/resources/:type/:id/receipts → Adicionar nota
```
Onde `:type` = `station` | `workshop` | `parts`

### Usuários
```
GET    /api/v1/users           → Listar (admin)
POST   /api/v1/users           → Criar (admin)
DELETE /api/v1/users/:id       → Excluir (admin)
```

### Logs & Configurações
```
GET    /api/v1/logs            → Logs de auditoria
GET    /api/v1/settings        → Configurações
PUT    /api/v1/settings        → Atualizar configurações (admin)
```

### Sync & Health
```
POST   /api/v1/sync/push       → Push de dados
GET    /api/v1/sync/pull/:key   → Pull de dados
GET    /api/v1/sync/status      → Status de sincronização
GET    /health                  → Health check completo
GET    /health/ready            → Readiness check
GET    /health/live             → Liveness check
GET    /metrics                 → Métricas Prometheus
```

## Monitoramento

### Grafana (http://servidor:3001)
- **Dashboard Overview**: requisições/s, latência p95, taxa de erros, CPU, memória
- **PostgreSQL**: conexões ativas, queries lentas
- **Redis**: memória, hit rate, keys

### Alertas Configurados
| Alerta | Condição | Severidade |
|--------|----------|------------|
| API Down | `up == 0` por 1m | 🔴 Critical |
| Alta Latência | p95 > 2s por 5m | 🟡 Warning |
| Taxa Erros Alta | 5xx > 5% por 5m | 🔴 Critical |
| Database Down | `pg_up == 0` | 🔴 Critical |
| DB Conexões 80%+ | conexões/max > 0.8 | 🟡 Warning |
| Redis Down | `redis_up == 0` | 🔴 Critical |
| Redis Memória 90%+ | used/max > 0.9 | 🟡 Warning |
| CPU Alto | > 80% por 10m | 🟡 Warning |
| Memória Alta | > 90% por 5m | 🔴 Critical |
| Disco Cheio | > 85% por 5m | 🟡 Warning |

## Cloud Providers

A arquitetura é compatível com:

### AWS
- **EC2** ou **ECS Fargate** para containers
- **RDS PostgreSQL** para banco de dados
- **ElastiCache Redis** para cache
- **ALB** para load balancer
- **S3** para backups
- **CloudWatch** para alertas

### Google Cloud
- **Cloud Run** ou **GKE** para containers
- **Cloud SQL PostgreSQL** para banco
- **Memorystore Redis** para cache
- **Cloud Load Balancing**
- **Cloud Storage** para backups

### Azure
- **Container Instances** ou **AKS** para containers
- **Database for PostgreSQL** para banco
- **Cache for Redis** para cache
- **Application Gateway** para load balancer
- **Blob Storage** para backups

## Estrutura de Arquivos

```
├── backend/                    ← API Node.js/Express
│   ├── src/
│   │   ├── server.ts           ← Entry point
│   │   ├── config/
│   │   │   ├── logger.ts       ← Winston logging
│   │   │   ├── redis.ts        ← Redis client + helpers
│   │   │   └── metrics.ts      ← Prometheus métricas
│   │   ├── database/
│   │   │   ├── connection.ts   ← Knex + PostgreSQL
│   │   │   ├── migrations/     ← Schema do banco
│   │   │   └── seeds/          ← Dados iniciais
│   │   ├── middleware/
│   │   │   ├── auth.ts         ← JWT + Role-based access
│   │   │   └── errorHandler.ts ← Error handler global
│   │   └── routes/
│   │       ├── auth.ts         ← Login / Logout / Me
│   │       ├── vehicles.ts     ← CRUD Veículos
│   │       ├── inspections.ts  ← CRUD Inspeções
│   │       ├── resources.ts    ← CRUD Postos/Oficinas/Peças
│   │       ├── users.ts        ← CRUD Usuários
│   │       ├── logs.ts         ← Logs de auditoria
│   │       ├── settings.ts     ← Configurações
│   │       ├── sync.ts         ← Sincronização (push/pull)
│   │       └── health.ts       ← Health checks
│   ├── package.json
│   └── tsconfig.json
├── docker/
│   ├── backend.Dockerfile      ← Multi-stage Node.js
│   ├── frontend.Dockerfile     ← Multi-stage React + Nginx
│   ├── nginx/
│   │   ├── nginx.conf          ← Reverse proxy (HTTPS/LB)
│   │   └── frontend.conf       ← SPA config
│   ├── postgres/
│   │   ├── postgresql.conf     ← Config otimizada
│   │   └── init.sql            ← Extensões iniciais
│   ├── monitoring/
│   │   ├── prometheus.yml      ← Scrape config
│   │   ├── alerts.yml          ← Regras de alerta
│   │   └── grafana/
│   │       ├── provisioning/   ← Auto-config Grafana
│   │       └── dashboards/     ← Dashboard JSON
│   └── logging/
│       └── logstash.conf       ← Pipeline de logs
├── scripts/
│   ├── deploy.sh               ← Deploy automatizado
│   ├── setup-server.sh         ← Setup de servidor limpo
│   ├── setup-ssl.sh            ← Certificado SSL
│   └── backup.sh               ← Backup manual
├── .github/workflows/
│   └── ci-cd.yml               ← Pipeline CI/CD completo
├── docker-compose.yml          ← Orquestração completa
├── .env.production.example     ← Template de variáveis
└── INFRASTRUCTURE.md           ← Esta documentação
```
