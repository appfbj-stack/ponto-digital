# Manual do Funcionário

## Instalação do app

### No celular (Android ou iPhone)

1. Abra o link `https://ponto.kairosponto.com.br` no navegador (Chrome ou Safari)
2. Toque em "Adicionar à tela inicial" (ou no menu do navegador)
3. O ícone do Kairos Ponto aparecerá na sua tela
4. Abra o app pela primeira vez

### No computador

Acesse `https://ponto.kairosponto.com.br` no Chrome ou Edge.

## Login

1. Abra o app
2. Digite seu email e senha
3. Toque em "Entrar"

> **Primeiro acesso:** use a senha temporária enviada pelo seu administrador e troque imediatamente em "Perfil" → "Trocar senha".

## Cadastrando a biometria (primeira vez)

1. Abra o app e faça login
2. Vá em **Perfil** (menu inferior)
3. Toque em **Cadastrar biometria**
4. Permita acesso à câmera (popup do navegador)
5. Posicione seu rosto no centro — você verá um retângulo verde ao redor
6. **Vire a cabeça lentamente de um lado pro outro** (garante que é pessoa real, não foto)
7. Quando a barra de progresso encher (~2-3s), toque em **Capturar**
8. Repita 3 vezes
9. Você verá "✓ Biometria cadastrada"

> 💡 Faça em ambiente bem iluminado, sem óculos escuros ou máscara.

## Registrando o ponto

1. Abra o app
2. Permita acesso à **localização** (pergunta na primeira vez)
3. Toque no botão grande **REGISTRAR PONTO**
4. O app vai:
   - Verificar sua localização
   - Pedir pra você posicionar o rosto na câmera (validação facial)
   - Enviar o registro para o servidor
5. Pronto! Você verá a confirmação: ✓ "Ponto registrado: Entrada"

O sistema registra automaticamente o **tipo de ponto** baseado no último:

| Último | Próximo |
|--------|---------|
| (nenhum) | Entrada |
| Entrada | Início Intervalo |
| Início Intervalo | Retorno |
| Retorno | Saída |
| Saída | Hora extra |

## Quando o registro é bloqueado

Você verá mensagens amigáveis em vez de erros técnicos:

- **"Você está fora do local autorizado"** — você está além do raio permitido do local de trabalho cadastrado. Aproxime-se.
- **"Validação facial não concluída"** — o sistema não conseguiu confirmar seu rosto. Repita o processo.
- **"Liveness não confirmado"** — o sistema precisa de uma foto ao vivo (não foto de foto). Olhe pra câmera em ambiente iluminado.
- **"Precisão da localização insuficiente"** — saia pra um local mais aberto (longe de paredes/Prédios).

## Sem internet?

O app detecta automaticamente. Você pode:

1. Tentar registrar normalmente — o app salva localmente
2. Quando a internet voltar, o registro é sincronizado automaticamente
3. Você verá: "Sincronizando... ✓ Registro enviado"

## Solicitando correção

Esqueceu de registrar? Marque o ponto errado?

1. Vá em `Meu Ponto` → `Solicitar Correção`
2. Preencha:
   - Data
   - Tipo (entrada, intervalo, etc)
   - Horário correto
   - Justificativa
3. Envie

Seu administrador vai analisar e aprovar ou rejeitar. Você recebe notificação da decisão.

## Meu espelho de ponto

Em `Meu Ponto` você vê o calendário do mês com todos os seus registros, total trabalhado por dia e banco de horas acumulado.

## Banco de horas

Em `Banco de Horas` você vê:

- Horas previstas no mês
- Horas trabalhadas
- Saldo (positivo = crédito, negativo = débito)
- Próximas movimentações previstas

## Perfil

Em `Perfil` você pode:

- Trocar sua senha
- Atualizar email/telefone
- Cadastrar ou atualizar sua biometria facial
- Ver dispositivos conectados
- Sair

## Privacidade

Seus dados biométricos são criptografados e só você pode cadastrar/atualizar. A empresa **não tem acesso** à sua biometria bruta — apenas o sistema compara embeddings para confirmar que é você.

Você tem direito a:
- Saber quais dados a empresa tem sobre você
- Pedir correção
- Pedir exclusão (sujeito à política de retenção da empresa)

## Dúvidas

Fale com seu administrador ou RH.
