# Kairos Ponto

> **Controle de ponto inteligente com reconhecimento facial e geolocalização.**

SaaS profissional de controle de jornada e ponto eletrônico para empresas, com:

- 📱 PWA para o funcionário
- 🖥️ Painel administrativo da empresa
- 👑 Painel Super Admin da plataforma
- 🤖 Reconhecimento facial com liveness
- 📍 Geolocalização com geocerca
- ⏰ Jornadas, escalas e banco de horas
- 📊 Relatórios e espelho de ponto
- 🔒 Multi-tenant com isolamento total por `tenant_id`
- 📜 Auditoria completa
- 📡 Funcionamento offline controlado
- 🛡️ Arquitetura preparada para LGPD

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend (Admin, Employee, Super Admin) | Next.js 15, React, TypeScript, Tailwind, shadcn/ui |
| Backend | NestJS, TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL (instância central existente) |
| PWA | Service Worker + IndexedDB |
| Pagamentos | Asaas |
| Deploy | Docker, Dokploy, Traefik, Cloudflare |
| Monorepo | Turborepo + pnpm |

---

## Estrutura

```
kairos-ponto/
├── apps/
│   ├── web/           # Painel administrativo da empresa (Next.js)
│   ├── employee/      # PWA do funcionário (Next.js + PWA)
│   ├── super-admin/   # Painel da plataforma (Next.js)
│   └── api/           # Backend (NestJS + Prisma)
├── packages/
│   ├── database/      # Prisma schema + migrations + seeds
│   ├── ui/            # Componentes compartilhados (shadcn/ui)
│   ├── types/         # Tipos compartilhados
│   ├── config/        # Validação de env (zod)
│   └── utils/         # Helpers (date, geo, hash, crypto)
├── docker/            # Dockerfiles e compose
├── docs/              # Documentação
└── .github/           # CI
```

---

## Quick Start

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Acesso à instância PostgreSQL central existente
- Docker (opcional, recomendado para dev)

### Instalação

```bash
# 1. Clone e instale dependências
git clone <repo>
cd kairos-ponto
pnpm install

# 2. Configure as variáveis
cp .env.example .env
# edite .env com a DATABASE_URL do seu PostgreSQL central

# 3. Crie o banco "kairos_ponto" no PostgreSQL central
# (ou peça ao DBA para criar)

# 4. Rode migrations + seed
pnpm db:migrate
pnpm db:seed

# 5. Suba os apps em dev
pnpm dev
```

Acesse:

- API: http://localhost:3001
- Web (Admin): http://localhost:3000
- Employee (PWA): http://localhost:3002
- Super Admin: http://localhost:3003

### Credenciais de demo (após seed)

| Perfil | Email | Senha |
|--------|-------|-------|
| Super Admin | super@demo.com | demo123 |
| Admin Empresa | admin@demo.com | demo123 |
| Funcionário | joao@demo.com | demo123 |

---

## Comandos

```bash
pnpm dev                 # Sobe todos os apps
pnpm build               # Build de produção
pnpm test                # Testes unitários
pnpm test:e2e            # Testes e2e (Playwright)
pnpm lint                # Lint
pnpm format              # Formata código
pnpm db:migrate          # Aplica migrations
pnpm db:seed             # Popula banco com dados demo
pnpm db:studio           # Abre Prisma Studio
```

---

## Documentação

- [INSTALAÇÃO](./docs/INSTALL.md)
- [DEPLOY](./docs/DEPLOY.md)
- [BANCO DE DADOS](./docs/DATABASE.md)
- [API](./docs/API.md)
- [MANUAL DO ADMINISTRADOR](./docs/MANUAL_ADMIN.md)
- [MANUAL DO FUNCIONÁRIO](./docs/MANUAL_EMPLOYEE.md)
- [ARQUITETURA](./docs/ARCHITECTURE.md)
- [SEGURANÇA & LGPD](./docs/SECURITY.md)

---

## Licença

Proprietário. Todos os direitos reservados.
