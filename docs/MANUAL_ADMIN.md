# Manual do Administrador

## Acesso

1. Acesse o painel em `https://app.kairosponto.com.br`
2. Faça login com email e senha fornecidos pelo Super Admin
3. No primeiro acesso, altere sua senha

## Dashboard

O dashboard mostra em tempo (quase) real:

- **Funcionários** — total cadastrado
- **Ativos** — quantos estão ativos
- **Presentes** — quantos já fizeram entrada hoje
- **Ausentes** — ativos que ainda não fizeram entrada
- **Em intervalo** — quantos saíram pra intervalo mas não voltaram
- **Pontuais** — entraram dentro da tolerância
- **Atrasados** — entraram após a tolerância
- **Hora extra** — saíram após o horário previsto
- **Registros hoje** — total de marcações no dia

## Cadastros

### Funcionários

`Funcionários` → `Novo`

Preencha:
- Nome, CPF, email, telefone
- Matrícula, cargo
- Departamento, jornada, local
- Data de admissão
- Status inicial: ATIVO

> **Dica:** o sistema gera uma senha temporária automaticamente. Anote e envie ao funcionário por canal seguro. O funcionário deve trocar no primeiro acesso.

### Departamentos

`Departamentos` → `Novo`

Cadastre os setores da empresa (Administrativo, Produção, Vendas, etc).

### Locais de trabalho (geocerca)

`Locais` → `Novo`

Para cada local informe:
- Nome (ex: "Matriz", "Filial Centro", "Obra Sorocaba")
- Endereço
- Latitude e longitude (pegue no Google Maps)
- Raio permitido em metros (recomendado: 100-150m para escritório, 300m para obra)

Dica: para pegar lat/lng no Google Maps, clique com botão direito no ponto → "Coordenadas".

### Jornadas

`Jornadas` → `Nova`

Exemplo:
- Nome: "Comercial - Segunda a Sexta"
- Tipo: 5x2
- Tolerância de entrada: 10 min
- Tolerância de saída: 10 min
- Horários por dia:
  - Segunda: entrada 08:00, intervalo 12:00, retorno 13:00, saída 17:00
  - Terça: idem
  - ...
  - Sábado: (vazio)
  - Domingo: (vazio)

## Relatórios

`Relatórios` → escolha o tipo

- **Espelho de ponto** — por funcionário, por mês
- **Atrasos** — listagem de entradas fora da tolerância
- **Horas extras** — saídas após horário previsto
- **Banco de horas** — saldo acumulado
- **Ocorrências** — pontos com inconsistência (fora de raio, sem face, etc)

Exporte em PDF ou Excel.

## Correções de ponto

`Correções` → `Pendentes`

O funcionário pode solicitar uma correção (esqueceu de registrar, erro de marcação, etc). Você revisa e:

- **Aprova** — sistema cria o registro corrigido (mantém histórico)
- **Rejeita** — registra a justificativa

> Toda aprovação/rejeição gera log de auditoria.

## Configurações da empresa

`Configurações`

- Nome, CNPJ, logo
- Fuso horário
- Tolerância padrão
- Raio padrão
- Política de ponto:
  - **Bloquear** ponto fora do raio, ou
  - **Permitir** e gerar ocorrência
- Biometria obrigatória (recomendado)
- Notificações

## Auditoria

`Auditoria`

Logs de tudo que acontece no sistema. Você **não pode apagar** logs, apenas consultar.

## LGPD

Como administrador, é sua responsabilidade:

- Garantir consentimento dos funcionários para coleta de biometria
- Documentar a base legal do tratamento
- Atender solicitações de acesso, correção e eliminação de dados
- Configurar retenção adequada

> ⚠️ A validação jurídica do uso de biometria é responsabilidade do cliente. O sistema fornece os mecanismos técnicos; o enquadramento legal fica a cargo da empresa.

## Suporte

Em caso de problemas:

1. Verifique se o problema é de rede
2. Tente logout/login
3. Acesse `https://status.kairosponto.com.br` (se existir)
4. Contate o suporte
