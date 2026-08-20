# Banco de Dados

## Conexão

O Kairos Ponto se conecta ao **PostgreSQL central existente** do VPS. Não há serviço de banco dentro do projeto.

```
DATABASE_URL=postgresql://usuario:senha@host:5432/kairos_ponto
```

## Schema (16 tabelas principais)

```
tenants                  → Empresas (multi-tenant)
plans                    → Planos da plataforma
subscriptions            → Assinatura de cada tenant
licenses                 → Features habilitadas por tenant
users                    → Contas (admin, gestor, funcionário, super)
refresh_tokens           → Tokens de refresh
employees                → Funcionários vinculados a um tenant
departments              → Departamentos
work_locations           → Locais de trabalho (geocerca)
employee_locations       → N:N funcionário ↔ local
work_schedules           → Jornadas de trabalho
schedule_assignments     → Histórico de atribuições
attendance_records       → Registros de ponto
attendance_corrections   → Solicitações de correção
bank_hours               → Saldo de banco de horas
facial_biometrics        → Embedding facial (criptografada)
devices                  → Dispositivos autorizados
notifications            → Notificações
audit_logs               → Trilha de auditoria
```

## Multi-tenant

Toda tabela de negócio possui `tenant_id`. Toda query no backend filtra por `tenant_id` extraído do JWT do usuário autenticado.

```sql
-- ✓ Correto
SELECT * FROM employees WHERE tenant_id = $current_tenant;

-- ✗ ERRADO (vazamento)
SELECT * FROM employees;
```

### Proteção em camadas

1. **Auth Guard** — extrai `tenantId` do JWT
2. **@TenantId decorator** — injeta em todos os controllers
3. **Service layer** — sempre recebe `tenantId` como parâmetro
4. **Prisma queries** — sempre com `where: { tenantId }`
5. **Testes automatizados** — validam que Tenant A não vê dados do Tenant B

## Índices otimizados

```sql
attendance_records(tenant_id, employee_id, timestamp)
attendance_records(tenant_id, type, timestamp)
attendance_records(client_event_id) UNIQUE
employees(tenant_id, cpf) UNIQUE
employees(tenant_id, email) UNIQUE
users(tenant_id, email) UNIQUE
```

## Migrations

```bash
# Criar migration após alterar schema
pnpm --filter @kairos/database exec prisma migrate dev --name descricao

# Aplicar em produção
pnpm --filter @kairos/database exec prisma migrate deploy
```

## Backup

```bash
# Backup
pg_dump -U kairos_user -h localhost kairos_ponto > backup.sql

# Restore
psql -U kairos_user -h localhost kairos_ponto < backup.sql
```

## Auditoria

Tabela `audit_logs` registra **toda** alteração importante:

- LOGIN / LOGOUT
- CREATE / UPDATE / DELETE
- ATTENDANCE_REGISTER
- ATTENDANCE_CORRECTION_REQUEST / APPROVE / REJECT
- SCHEDULE_CHANGE
- LOCATION_CHANGE
- EMPLOYEE_CHANGE
- SETTINGS_CHANGE
- DEVICE_REVOKE
- BIOMETRIC_REGISTER / UPDATE / DELETE
- PLAN_CHANGE
- TENANT_BLOCK / UNBLOCK / SUSPEND

Logs **nunca são apagados** pela interface normal. Apenas expostos como read-only via API.
