# API Reference

A API está documentada automaticamente via **Swagger**.

Em dev: http://localhost:3001/api/docs

## Autenticação

Todas as rotas (exceto `/auth/login`) requerem **Bearer token** no header:

```
Authorization: Bearer <access_token>
```

O `access_token` expira em 15min. Use `/auth/refresh` para renovar.

## Roles

- `SUPER_ADMIN` — gerencia a plataforma
- `COMPANY_ADMIN` — gerencia a empresa
- `MANAGER` — gerencia times/setores
- `EMPLOYEE` — registra ponto

## Endpoints principais

### Auth

```http
POST /api/auth/login
Body: { email, password }
→ { user, tokens: { accessToken, refreshToken, expiresIn } }

POST /api/auth/refresh
Body: { refreshToken }
→ { tokens: { accessToken, refreshToken, expiresIn } }

POST /api/auth/logout
Body: { refreshToken }
→ 204 No Content

POST /api/auth/me
→ { user: { id, email, role, tenantId, ... } }
```

### Tenants

```http
GET /api/tenants/me
→ Dados da empresa do usuário logado
```

### Employees

```http
GET /api/employees?status=ACTIVE&departmentId=...&search=...
→ Lista de funcionários

GET /api/employees/me
→ Dados do funcionário logado

GET /api/employees/:id
→ Detalhes de um funcionário

POST /api/employees
Body: { name, cpf, email, ... }
→ Cria funcionário + usuário

PUT /api/employees/:id
Body: { ... }
→ Atualiza funcionário

PATCH /api/employees/:id/status
Body: { status: "ACTIVE" | "INACTIVE" | "VACATION" | "LEAVE" }
→ Altera status
```

### Departments

```http
GET /api/departments
POST /api/departments
PUT /api/departments/:id
```

### Locations (geocerca)

```http
GET /api/locations
POST /api/locations
Body: { name, address, latitude, longitude, radiusMeters }
PUT /api/locations/:id
```

### Schedules (jornadas)

```http
GET /api/schedules
POST /api/schedules
Body: {
  name,
  scheduleType: "FIVE_BY_TWO" | "SIX_BY_ONE" | "TWELVE_BY_THIRTY_SIX" | "CUSTOM",
  entryToleranceMinutes,
  exitToleranceMinutes,
  weeklyHours: {
    monday:    { entry, breakStart, breakEnd, exit },
    tuesday:   { entry, breakStart, breakEnd, exit },
    ...
  }
}
PUT /api/schedules/:id
```

### Attendance (ponto)

```http
POST /api/attendance/register
Body: {
  type: "ENTRY" | "BREAK_START" | "BREAK_END" | "EXIT" | "OVERTIME",
  latitude, longitude, accuracy,
  faceToken, faceConfidence, livenessPassed,
  deviceId, clientTimestamp, clientEventId
}
→ { record: { id, timestamp, inGeofence, ... } }

GET /api/attendance/my?startDate=...&endDate=...
→ Registros do funcionário logado

GET /api/attendance/company?employeeId=...&type=...&startDate=...&endDate=...
→ Registros da empresa (admin)
```

### Reports

```http
GET /api/reports/dashboard
→ { totalEmployees, present, absent, onTime, late, onBreak, ... }

# Exportações
GET /api/reports/timesheet/:employeeId/pdf?month=YYYY-MM
→ Download PDF do espelho de ponto

GET /api/reports/timesheet/:employeeId/excel?month=YYYY-MM
→ Download Excel do espelho de ponto

GET /api/reports/attendance-log/excel?startDate=...&endDate=...
→ Download Excel de todos os registros de ponto no período
```

### Audit

```http
GET /api/audit/logs?page=1&pageSize=50
→ Lista de logs de auditoria
```

### Billing (Asaas / Super Admin)

```http
# Endpoints da empresa (sobre a própria assinatura)
GET /api/billing/subscription
→ Dados da assinatura atual (plano, status, datas)

POST /api/billing/subscribe
Body: { planId, cpfCnpj }
→ Cria customer no Asaas + subscription

POST /api/billing/cancel
→ Cancela assinatura

# Webhook do Asaas (público, validado por HMAC)
POST /api/billing/webhook/asaas
Headers: asaas-access-token: <hmac-sha256>
Body: { event, payment?, subscription? }
→ Processa eventos: PAYMENT_RECEIVED, PAYMENT_OVERDUE, SUBSCRIPTION_*

# Endpoints do Super Admin
GET /api/super-admin/dashboard
→ Métricas: total de empresas, MRR, assinaturas ativas, etc

GET /api/super-admin/tenants?status=&search=
→ Lista de todas as empresas

POST /api/super-admin/tenants
Body: { name, slug, cnpj?, planId, adminEmail, adminName, adminPassword }
→ Cria empresa + admin + trial

PATCH /api/super-admin/tenants/:id/block
Body: { reason }
→ Bloqueia empresa (suspende subscription + bloqueia acesso)

PATCH /api/super-admin/tenants/:id/unblock
→ Desbloqueia empresa

GET /api/super-admin/audit?page=&pageSize=
→ Auditoria cross-tenant

# Planos
GET /api/plans
→ Lista de planos ativos
```

> **Configuração do Asaas:**
> 1. Criar conta em https://www.asaas.com
> 2. Gerar API Key (sandbox ou produção)
> 3. Configurar webhook: `https://api.kairosponto.com.br/api/billing/webhook/asaas`
> 4. Copiar webhook token para `ASAAS_WEBHOOK_SECRET` no .env

### Biometric (reconhecimento facial)

```http
POST /api/biometric/register
Body: {
  samples: [{ embedding: number[128], modelVersion, quality, size }, ...],  // 1-10 amostras
  liveness: { confidence, checks: { faceDetected, singleFace, movementDetected, timing } },
  deviceId
}
→ Cadastra/atualiza biometria do funcionário logado

POST /api/biometric/register/:employeeId
→ Admin cadastra biometria de outro funcionário

POST /api/biometric/verify
Body: { embedding: { embedding, modelVersion, quality, size }, liveness, deviceId }
→ { matched, distance, confidence, threshold }

GET /api/biometric/me/status
→ { hasBiometric: boolean }

DELETE /api/biometric/me
→ Remove biometria do funcionário logado

DELETE /api/biometric/:employeeId
→ Admin remove biometria de funcionário
```

> Fluxo esperado:
> 1. Funcionário acessa `/perfil` → cadastra com 3 fotos
> 2. App envia 3 embeddings + liveness
> 3. Backend faz média, criptografa (AES-256-GCM) e salva
> 4. No registro de ponto, app envia 1 embedding ao vivo
> 5. Backend descriptografa, compara, retorna matched/distance/confidence

### Corrections (correção de ponto)

```http
POST /api/corrections
Body: { date, type, requestedTime, reason }
→ Cria solicitação de correção

GET /api/corrections/my
→ Minhas solicitações

GET /api/corrections?status=PENDING
→ Solicitações da empresa (admin)

PATCH /api/corrections/:id/review
Body: { status: "APPROVED" | "REJECTED", reviewNotes? }
→ Aprova/rejeita. Se aprovado, cria registro corrigido automaticamente.
```

### Timesheet (espelho de ponto / banco de horas)

```http
GET /api/timesheet/me?month=YYYY-MM
→ Espelho de ponto do funcionário logado

GET /api/timesheet/employee/:employeeId?month=YYYY-MM
→ Espelho de ponto de um funcionário (admin)

GET /api/timesheet/company?month=YYYY-MM
→ Relatório consolidado da empresa (todos funcionários)

POST /api/timesheet/recalculate/me
→ Recalcula meu banco de horas

POST /api/timesheet/recalculate/:employeeId
→ Recalcula bank hours de um funcionário

POST /api/timesheet/recalculate-all
→ Recalcula bank hours de toda empresa (job noturno)
```

Resposta do `getTimesheet`:

```json
{
  "employee": { "id": "...", "name": "João Silva" },
  "schedule": { "id": "...", "name": "Comercial - Segunda a Sexta" },
  "bankHours": { "balanceMinutes": 45 },
  "period": {
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "days": [{
      "date": "2026-08-03",
      "expectedMinutes": 480,
      "workedMinutes": 480,
      "breakMinutes": 60,
      "lateMinutes": 0,
      "earlyExitMinutes": 0,
      "overtimeMinutes": 0,
      "debitMinutes": 0,
      "balanceMinutes": 0,
      "status": "WORKED",
      "punches": [...]
    }],
    "totals": {
      "expectedMinutes": 10080,
      "workedMinutes": 10140,
      "overtimeMinutes": 60,
      "debitMinutes": 0,
      "balanceMinutes": 60,
      "daysWorked": 21,
      "daysAbsent": 0,
      "daysRest": 10
    }
  }
}
```

## Respostas de erro

Padrão:

```json
{
  "statusCode": 400,
  "error": "BadRequest",
  "message": "Mensagem amigável",
  "details": { ... },
  "timestamp": "2026-08-20T15:00:00.000Z",
  "path": "/api/employees"
}
```

Erros comuns:

- `400` — validação falhou
- `401` — não autenticado
- `403` — sem permissão / fora de geocerca
- `404` — não encontrado
- `409` — conflito (duplicado)
- `429` — rate limit
- `500` — erro interno (mensagem genérica ao client)

## Idempotência

`POST /attendance/register` aceita `clientEventId` (UUID). Se o mesmo ID for enviado 2x, a segunda chamada retorna o registro já criado sem inserir duplicado. Isso garante segurança em cenários offline onde o app pode sincronizar 2 vezes.
