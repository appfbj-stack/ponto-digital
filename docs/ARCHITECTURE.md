# Arquitetura

## Visão geral

Kairos Ponto é um SaaS multi-tenant construído em monorepo, com isolamento total por `tenant_id` em todas as entidades de negócio.

```
┌─────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         TRAEFIK                             │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │   WEB    │   │EMPLOYEE  │   │ SUPER-ADMIN  │
        │ (Next)   │   │ PWA      │   │  (Next)      │
        └────┬─────┘   └────┬─────┘   └──────┬───────┘
             │              │                 │
             └──────────────┼─────────────────┘
                            ▼
                  ┌──────────────────┐
                  │       API        │
                  │     (NestJS)     │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   POSTGRESQL     │
                  │     CENTRAL      │
                  │  (kairos_ponto)  │
                  └──────────────────┘
```

## Decisões arquiteturais

### 1. Multi-tenant por `tenant_id` em todas as queries

Toda tabela de negócio possui `tenant_id`. Nenhuma query no backend é executada sem `WHERE tenant_id = $currentTenant`.

Proteção em camadas:
- Middleware global no NestJS extrai `tenant_id` do JWT
- Services recebem `tenantId` via parâmetro ou request context
- Repositórios (Prisma) usam extension custom que injeta `where: { tenantId }`
- Testes validam que usuário de empresa A nunca acessa dados de empresa B

### 2. Backend separado (NestJS)

PRD foi explícito: NestJS, não Next.js API Routes. Motivos:
- Guards, interceptors, pipes, modules organizados
- Swagger nativo
- Melhor para escalar
- Injeção de dependência facilita testes

### 3. Frontend em 3 apps Next.js separados

- `apps/web` → Admin da empresa
- `apps/employee` → PWA do funcionário
- `apps/super-admin` → Plataforma

Compartilham o package `@kairos/ui` (componentes shadcn) e `@kairos/types`.

### 4. PWA com Service Worker próprio

Sem usar `next-pwa` (que está deprecated). Implementação manual de:
- Workbox para cache de assets
- IndexedDB (Dexie) para fila offline
- Background Sync API

### 5. Reconhecimento facial com abstração

**Server-side (`@kairos/face`):**

Interface `FaceProvider` no package `@kairos/face`. Implementações:
- `LocalFaceProvider` (MVP, comparação de embeddings via distância euclidiana)
- `MockFaceProvider` (dev/test, sempre aceita)
- `AwsRekognitionProvider` (placeholder — implementar quando migrar)
- `AzureFaceProvider` (placeholder — implementar quando migrar)
- Trocar via env `FACE_PROVIDER`

**Client-side (no PWA do funcionário):**

Hook React `useFaceCapture` que:
- Carrega modelos do face-api.js sob demanda (lazy, ~6MB total)
- Acessa câmera frontal
- Detecta rosto a cada 200ms
- Calcula movimento (liveness por desafio natural)
- Gera embedding 128-dim

**Fluxo completo:**

```
Funcionário → "Cadastrar biometria"
   ↓
useFaceCapture inicia câmera
   ↓
Detecta rosto → pede movimento (liveness)
   ↓
Captura 3 amostras (3-5s cada)
   ↓
App envia 3 embeddings + liveness
   ↓
BiometricService.register (server):
   - valida embeddings
   - calcula média (mais robusto)
   - criptografa (AES-256-GCM)
   - salva em facial_biometrics
   - audit log
   ↓
No registro de ponto:
App gera 1 embedding ao vivo
   ↓
BiometricService.verify (server):
   - descriptografa embedding armazenada
   - compara (distância euclidiana < threshold)
   - retorna matched/distance/confidence
   - audit log de verificação
   ↓
Se matched → registra ponto com faceValidated=true
Se não matched → bloqueia com mensagem amigável
```

**Liveness (anti-spoof):**
- Score baseado em movimento do rosto entre frames
- Threshold: 0.3 pra cadastro, 0.2 pra verificação
- Detecta foto estática (sem movimento = provável spoof)
- Tempo mínimo: 500ms (anti-automação)
- Tempo máximo: 30s (anti-bot)

**Criptografia:**
- Embedding criptografada com AES-256-GCM antes de salvar
- Chave em `BIOMETRIC_ENCRYPTION_KEY` (32 bytes base64)
- IV aleatório por registro
- Auth tag verificada na descriptografia
- Embedding nunca é armazenada em plaintext
- Foto NUNCA é enviada pro servidor (só embedding, vetor numérico)

### 6. Horário sempre do servidor

Celular manda `client_timestamp` mas o servidor ignora para auditoria. Servidor retorna `server_timestamp` no response. O que vale é o do banco.

### 7. Fuso horário por tenant

`tenants.timezone` (ex: `America/Sao_Paulo`). Tudo armazenado em UTC no banco, renderizado no frontend com `date-fns-tz` no timezone da empresa.

### 8. Criptografia de dados sensíveis

Embedding facial e dados biométricos são criptografados com AES-256-GCM antes de ir pro banco. Chave em env (`BIOMETRIC_ENCRYPTION_KEY`).

---

## Estrutura de pastas

```
kairos-ponto/
├── apps/
│   ├── api/                    # NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenants/
│   │   │   │   ├── users/
│   │   │   │   ├── employees/
│   │   │   │   ├── departments/
│   │   │   │   ├── locations/
│   │   │   │   ├── attendance/
│   │   │   │   ├── schedules/
│   │   │   │   ├── reports/
│   │   │   │   ├── audit/
│   │   │   │   └── ...
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   └── pipes/
│   │   │   ├── prisma/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/
│   ├── web/                    # Next.js admin
│   ├── employee/               # Next.js PWA
│   └── super-admin/            # Next.js platform
├── packages/
│   ├── database/               # Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   ├── ui/                     # shadcn components
│   ├── types/                  # shared types
│   ├── config/                 # env validation
│   └── utils/                  # helpers
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   ├── employee.Dockerfile
│   ├── super-admin.Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── docs/
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

---

## Fluxo de registro de ponto

```
Funcionário
    │
    ▼
[1] Login (JWT)
    │
    ▼
[2] PWA carrega localização atual
    │
    ▼
[3] Toque em "REGISTRAR PONTO"
    │
    ▼
[4] API valida: usuário, jornada, próximo tipo esperado
    │
    ▼
[5] Captura GPS (lat, lng, accuracy)
    │
    ▼
[6] Validação de geocerca (Haversine)
    │
    ├── Fora do raio ──► Bloqueado OU ocorrência (config)
    │
    └── Dentro do raio
            │
            ▼
[7] Captura facial (face-api.js)
    │
    ▼
[8] Liveness (challenge de movimento)
    │
    ▼
[9] Comparação com embedding armazenada
    │
    ├── Não confere ──► Rejeitado
    │
    └── Confere
            │
            ▼
[10] POST /attendance/register
     body: { type, lat, lng, accuracy, faceToken, clientEventId }
     │
     ▼
[11] API gera server_timestamp, valida tudo novamente,
     insere em attendance_records, gera audit_log
     │
     ▼
[12] Response com server_timestamp
     │
     ▼
[13] PWA mostra "PONTO REGISTRADO ✓"
```

---

## Status de registro

```
PENDING  → criado offline, aguardando sync
VALIDATED → validado pelo backend
SYNCED   → persistido no banco
CORRECTED → corrigido via solicitação aprovada
CANCELLED → cancelado
REJECTED → rejeitado
```

Registros **nunca são apagados** — só recebem novo status. Histórico sempre preservado.
