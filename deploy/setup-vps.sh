#!/usr/bin/env bash
# ===================================================================
# KAIROS PONTO — Setup automatizado para VPS
# ===================================================================
# Rode no VPS, na pasta onde estão docker-compose.prod.yml e .env.production
#
# Uso:
#   chmod +x setup-vps.sh
#   ./setup-vps.sh
#
# O que ele faz:
#   1. Verifica pré-requisitos (docker, docker compose, postgres)
#   2. Gera secrets (JWT, BIOMETRIC_ENCRYPTION_KEY) se faltarem
#   3. Cria database kairos_ponto no Postgres
#   4. Sobe os containers
#   5. Roda migrations do Prisma
#   6. Roda seed (opcional, pergunta antes)
#   7. Mostra URLs prontas
# ===================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ----- 1. Pré-requisitos -----
echo ""
echo "════════════════════════════════════════"
echo "  KAIROS PONTO — Setup VPS"
echo "════════════════════════════════════════"
echo ""

command -v docker >/dev/null 2>&1 || { err "Docker não instalado"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { err "Docker Compose não instalado"; exit 1; }
log "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
log "Docker Compose $(docker compose version --short)"

[ -f .env.production ] || { err ".env.production não encontrado neste diretório"; exit 1; }
log ".env.production presente"

# ----- 2. Gerar secrets faltantes -----
echo ""
echo "Gerando secrets faltantes..."

if grep -q "COLE_AQUI_64_HEX" .env.production; then
  JWT=$(openssl rand -hex 32)
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT|" .env.production
  log "JWT_SECRET gerado"
fi

if grep -q "COLE_AQUI_OUTRO_64_HEX" .env.production; then
  REFRESH=$(openssl rand -hex 32)
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$REFRESH|" .env.production
  log "JWT_REFRESH_SECRET gerado"
fi

if grep -q "COLE_AQUI_BASE64" .env.production; then
  BIO=$(openssl rand -base64 32)
  sed -i "s|BIOMETRIC_ENCRYPTION_KEY=.*|BIOMETRIC_ENCRYPTION_KEY=$BIO|" .env.production
  log "BIOMETRIC_ENCRYPTION_KEY gerado"
fi

# ----- 3. Criar database no Postgres -----
echo ""
read -p "Criar database 'kairos_ponto' no Postgres? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -z "$PGHOST" ]; then PGHOST="localhost"; fi
  if [ -z "$PGUSER" ]; then
    read -p "Postgres user (default: postgres): " PGU
    PGUSER=${PGU:-postgres}
  fi

  warn "Vou pedir a senha do Postgres..."
  export PGPASSWORD
  read -s -p "Senha do $PGUSER@$PGHOST: " PGPASSWORD
  echo ""

  DB_EXISTS=$(psql -h "$PGHOST" -U "$PGUSER" -tAc "SELECT 1 FROM pg_database WHERE datname='kairos_ponto'" 2>/dev/null || echo "")

  if [ "$DB_EXISTS" = "1" ]; then
    warn "Database 'kairos_ponto' já existe. Pulando."
  else
    psql -h "$PGHOST" -U "$PGUSER" -c "CREATE DATABASE kairos_ponto;" 2>&1 | grep -v "Password" || true
    log "Database 'kairos_ponto' criado"
  fi

  unset PGPASSWORD
fi

# ----- 4. Subir containers -----
echo ""
log "Subindo containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

log "Aguardando API inicializar (60s)..."
sleep 60

# ----- 5. Migrations Prisma -----
echo ""
read -p "Rodar migrations do Prisma? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log "Rodando migrations..."
  docker exec -it kairos-api npx prisma migrate deploy
  log "Migrations aplicadas"
fi

# ----- 6. Seed -----
echo ""
read -p "Rodar seed (cria empresa demo + funcionarios)? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log "Rodando seed..."
  docker exec -it kairos-api npx prisma db seed
  log "Seed concluído. Credenciais demo:"
  echo "  super@demo.com / demo123 (super admin)"
  echo "  admin@demo.com / demo123 (admin empresa)"
  echo "  joao@demo.com  / demo123 (funcionário)"
fi

# ----- 7. Resumo -----
echo ""
echo "════════════════════════════════════════"
echo "  ${GREEN}KAIROS PONTO NO AR!${NC}"
echo "════════════════════════════════════════"
echo ""
echo "  API:          https://api.kairosponto.com.br"
echo "  Admin Web:    https://app.kairosponto.com.br"
echo "  PWA:          https://ponto.kairosponto.com.br"
echo "  Super Admin:  https://super.kairosponto.com.br"
echo ""
echo "  Comandos úteis:"
echo "    docker compose -f docker-compose.prod.yml logs -f"
echo "    docker compose -f docker-compose.prod.yml ps"
echo "    docker compose -f docker-compose.prod.yml restart api"
echo ""
