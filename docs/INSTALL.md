# Guia de Instalação

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9
- **Acesso ao PostgreSQL central** já existente no VPS
- **Docker** (opcional, recomendado para dev/prod)

## 1. Banco de Dados

O Kairos Ponto **NÃO cria** um servidor PostgreSQL. Ele se conecta ao PostgreSQL central já existente.

No seu PostgreSQL central, crie apenas o banco:

```sql
CREATE DATABASE kairos_ponto;
```

E garanta que o usuário que vai se conectar tenha permissões:

```sql
GRANT ALL PRIVILEGES ON DATABASE kairos_ponto TO kairos_user;
```

## 2. Configuração de ambiente

```bash
# Clone o projeto
git clone <repo>
cd kairos-ponto

# Instale dependências
pnpm install

# Copie o .env.example
cp .env.example .env
```

Edite o `.env` com:

```env
# Aponta para o seu PostgreSQL central
DATABASE_URL=postgresql://kairos_user:SUA_SENHA@HOST:5432/kairos_ponto

# Gere secrets fortes
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
BIOMETRIC_ENCRYPTION_KEY=$(openssl rand -base64 32)

# URLs (dev)
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_EMPLOYEE_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPER_ADMIN_API_URL=http://localhost:3001

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3003
```

## 3. Migrations e seed

```bash
# Gera o client do Prisma
pnpm db:generate

# Aplica as migrations no banco
pnpm db:migrate

# Popula o banco com dados de demo
pnpm db:seed
```

## 3.1 Modelos de IA (reconhecimento facial)

O PWA do funcionário usa **face-api.js** com modelos pré-treinados (~6-10MB total).

**Opção A — Download local (dev):**

```bash
cd apps/employee
mkdir -p public/models
# TinyFaceDetector (~190KB)
curl -L -o public/models/tiny_face_detector_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -L -o public/models/tiny_face_detector_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
# FaceLandmark68 (~350KB)
curl -L -o public/models/face_landmark_68_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -L -o public/models/face_landmark_68_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
# FaceRecognition (~6MB)
curl -L -o public/models/face_recognition_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -L -o public/models/face_recognition_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -L -o public/models/face_recognition_model-shard2 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
```

**Opção B — CDN (recomendado para produção):**

Edite `apps/employee/src/lib/face-api.ts` e troque:

```ts
const MODEL_URL = '/models';
// por:
const MODEL_URL = 'https://cdn.kairosponto.com.br/face-models';
```

Faça upload dos modelos pro seu CDN/S3. Vantagens:
- Service Worker cacheia (funciona offline)
- Não pesa o bundle do Next.js
- Atualiza modelos sem redeploy

**Verificação:** abra `http://localhost:3002/perfil` no Chrome, permita câmera e teste o cadastro.

## 4. Subir a aplicação

### Modo dev (com hot-reload)

```bash
pnpm dev
```

Acesse:
- **API:** http://localhost:3001 (Swagger em `/api/docs`)
- **Admin:** http://localhost:3000
- **Funcionário (PWA):** http://localhost:3002
- **Super Admin:** http://localhost:3003

### Modo produção (Docker)

```bash
# Build das imagens
docker compose -f docker/docker-compose.yml build

# Sobe os containers
docker compose -f docker/docker-compose.yml up -d
```

## 5. Credenciais de demo

Após `pnpm db:seed`:

| Perfil | Email | Senha |
|--------|-------|-------|
| Super Admin | super@demo.com | demo123 |
| Admin Empresa | admin@demo.com | demo123 |
| Funcionário | joao@demo.com | demo123 |

> ⚠️ **Troque as senhas demo antes de ir para produção.**

## 6. Verificação

```bash
# Testa a conexão com o banco
pnpm --filter @kairos/api exec node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$connect().then(()=>console.log('OK')).finally(()=>p.\$disconnect())"

# Roda os testes
pnpm test

# Roda o linter
pnpm lint
```

## Solução de problemas

### Erro: "Can't reach database"

- Verifique se a `DATABASE_URL` está correta
- Verifique se o host do PostgreSQL central está acessível
- Teste com `psql` ou `pg_isready`

### Erro: "permission denied for schema public"

Execute no PostgreSQL:

```sql
GRANT ALL ON SCHEMA public TO kairos_user;
```

### Erro: "JWT_SECRET deve ter no mínimo 32 caracteres"

O secret precisa ter pelo menos 32 caracteres. Use `openssl rand -base64 64`.

### pnpm install travando

Verifique se o store do pnpm existe e tem espaço:

```bash
pnpm store path
df -h $(pnpm store path)
```
