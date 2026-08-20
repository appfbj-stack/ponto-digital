# Guia de Deploy

## Arquitetura em produção

```
Internet
   │
   ▼
┌─────────────────┐
│   Cloudflare    │  (DNS + Proxy + SSL)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Traefik     │  (Reverse proxy + SSL)
└────────┬────────┘
         │
   ┌─────┼─────┬──────────┐
   ▼     ▼     ▼          ▼
  web  employee  super-admin  api
  (Next) (Next PWA) (Next)  (NestJS)
                              │
                              ▼
                    ┌──────────────────┐
                    │  PostgreSQL      │
                    │  CENTRAL (VPS)   │
                    │  kairos_ponto    │
                    └──────────────────┘
```

## 1. Pré-requisitos no VPS

- Docker + Docker Compose
- PostgreSQL central já rodando
- Domínio configurado no Cloudflare
- Traefik já configurado (recomendado)

## 2. Variáveis de produção

Edite o `.env` no VPS:

```env
NODE_ENV=production
DATABASE_URL=postgresql://kairos_user:SENHA_FORTE@127.0.0.1:5432/kairos_ponto

# Secrets (gere com openssl rand -base64 64)
JWT_SECRET=...
JWT_REFRESH_SECRET=...
BIOMETRIC_ENCRYPTION_KEY=...

# URLs de produção
API_URL=https://api.kairosponto.com.br
NEXT_PUBLIC_API_URL=https://api.kairosponto.com.br
NEXT_PUBLIC_EMPLOYEE_API_URL=https://api.kairosponto.com.br
NEXT_PUBLIC_SUPER_ADMIN_API_URL=https://api.kairosponto.com.br

CORS_ORIGINS=https://app.kairosponto.com.br,https://ponto.kairosponto.com.br,https://admin.kairosponto.com.br

# Asaas produção
ASAAS_ENV=production
ASAAS_API_KEY=...
ASAAS_WEBHOOK_SECRET=...

# SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@kairosponto.com.br
SMTP_PASS=...
SMTP_FROM=noreply@kairosponto.com.br
```

## 3. Subir com Dokploy ou Coolify

### Dokploy

1. Crie um novo "Project" no Dokploy
2. Conecte o repositório GitHub
3. Configure:
   - Build command: `docker compose -f docker/docker-compose.yml build`
   - Start command: `docker compose -f docker/docker-compose.yml up -d`
4. Adicione as variáveis de ambiente
5. Configure os domínios:
   - `app.kairosponto.com.br` → container `web`
   - `ponto.kairosponto.com.br` → container `employee`
   - `admin.kairosponto.com.br` → container `super-admin`
   - `api.kairosponto.com.br` → container `api`

### Coolify

1. Crie um novo "Resource" → "Docker Compose"
2. Cole o conteúdo de `docker/docker-compose.yml`
3. Configure as envs
4. Configure domínios + SSL via Let's Encrypt

## 4. Configurar Cloudflare

No painel do Cloudflare:

- **DNS:** Aponte os subdomínios para o IP do VPS (proxy ativado)
- **SSL/TLS:** Modo "Full (strict)"
- **Regras de página:** (opcional) Cache assets estáticos

## 5. Backup

Configure backup automático do banco `kairos_ponto`:

```bash
# Crontab diário às 3h
0 3 * * * pg_dump -U kairos_user -h localhost kairos_ponto | gzip > /backup/kairos_ponto_$(date +\%Y\%m\%d).sql.gz
```

## 6. Monitoramento

Sugestão: integre com:

- **Logs:** Loki + Grafana
- **Métricas:** Prometheus + Grafana
- **Erros:** Sentry
- **Uptime:** UptimeRobot

## 7. Checklist de deploy

- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` gerados (64+ chars)
- [ ] `BIOMETRIC_ENCRYPTION_KEY` gerado (32 bytes)
- [ ] `DATABASE_URL` aponta pro PostgreSQL central
- [ ] Senhas demo removidas/alteradas
- [ ] SSL ativo em todos os domínios
- [ ] Backup configurado
- [ ] Variáveis de produção preenchidas
- [ ] Asaas em modo `production` (não `sandbox`)
- [ ] SMTP funcionando
- [ ] Logs coletados
- [ ] Alertas configurados
