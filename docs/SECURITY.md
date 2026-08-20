# Segurança & LGPD

## Princípios

1. **Defense in depth** — segurança em múltiplas camadas
2. **Least privilege** — cada role só tem o que precisa
3. **Audit by default** — tudo importante é logado
4. **Privacy by design** — dados sensíveis são protegidos desde o design

## Autenticação

- **Senha:** hash bcrypt (12 rounds)
- **Access token:** JWT (15min) com assinatura HMAC-SHA256
- **Refresh token:** random 48 bytes, armazenado como SHA-256 hash, com rotação
- **Revogação:** logout invalida o refresh token; troca de senha invalida todos
- **Rate limiting:** 100 req/min por IP (configurável)

## Multi-tenant

- Todo `tenant_id` é extraído do **JWT** (não do body/header, exceto para SUPER_ADMIN)
- Nenhuma query é executada sem `where: { tenantId }`
- Testes automatizados validam que Tenant A nunca acessa dados do Tenant B

## Autorização (RBAC)

4 roles:

| Role | Acesso |
|------|--------|
| `SUPER_ADMIN` | Plataforma toda |
| `COMPANY_ADMIN` | Somente sua empresa |
| `MANAGER` | Recursos delegados da empresa |
| `EMPLOYEE` | Apenas seus próprios dados + registro de ponto |

Verificação em toda rota:
1. JwtAuthGuard — autenticado?
2. RolesGuard — tem a role necessária?
3. TenantId decorator — pegou o tenant do JWT?
4. Service — filtra por tenantId

## Biometria facial

**Atenção:** biometria é **dado pessoal sensível** sob LGPD. A empresa cliente é responsável pela base legal (consentimento individual destacado, interesse legítimo, etc).

Proteções técnicas:
- **Nunca** enviamos a foto para o servidor
- Embedding gerada no client (face-api.js)
- Embedding criptografada em repouso (AES-256-GCM)
- Chave em variável de ambiente (`BIOMETRIC_ENCRYPTION_KEY`)
- Apenas comparação de embeddings, não reversão
- Logs de acesso registram tentativas
- Funcionário pode atualizar/remover

## Geolocalização

- Coletada **apenas no momento do registro** (não contínuo)
- Precisão avaliada (rejeitada se > 200m)
- Validação de raio server-side (cliente não é confiável)
- Logs de IP para auditoria

## LGPD — Direitos do titular

A empresa pode atender:

- **Acesso:** exportar todos os dados de um funcionário
- **Correção:** API permite atualizar dados
- **Eliminação:** conta pode ser desativada, dados anonimizados
- **Portabilidade:** export em JSON/CSV
- **Revogação de consentimento:** desativação da biometria

## Retenção

| Dado | Retenção |
|------|----------|
| Registros de ponto | 5 anos (CLT) |
| Logs de auditoria | 5 anos |
| Biometria | Enquanto vínculo + 90 dias |
| Localização | Apenas no registro (não histórico) |
| Notificações lidas | 90 dias |

## Vazamento entre tenants

Prevenido por:

1. `tenantId` em TODA tabela de negócio
2. `tenantId` extraído do JWT, não da request
3. `TenantId` decorator injeta automaticamente
4. Services recebem `tenantId` como parâmetro
5. Repositórios Prisma sempre com `where: { tenantId }`
6. Testes E2E validam isolamento

## HTTPS

- Obrigatório em produção
- Cloudflare + Traefik geram certificados automaticamente (Let's Encrypt)

## Senhas

- Mínimo 6 caracteres (recomenda-se 8+)
- Bcrypt com 12 rounds
- Senhas demo (`demo123`) devem ser trocadas
- Recomenda-se política de complexidade (maiúscula, número, símbolo)

## Recomendações operacionais

- Rotação de secrets a cada 90 dias
- Backup diário do banco
- Monitoramento de tentativas de login
- Alerta de empresas com muitas tentativas falhadas
- Revisão periódica de logs de auditoria

## O que **NÃO** fazer

- ❌ Colocar segredos no código
- ❌ Commitar `.env`
- ❌ Logar dados sensíveis (CPF, biometria)
- ❌ Confiar no frontend para segurança
- ❌ Confiar no horário do celular para auditoria
- ❌ Permitir que admin acesse biometria bruta
- ❌ Apagar audit logs pela interface
