import { Controller, Post, Headers, Body, HttpCode, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';

/**
 * Webhook do Asaas.
 *
 * Configurar no painel Asaas: https://app.asaas.com/webhook
 * URL: https://api.kairosponto.com.br/api/billing/webhook/asaas
 * Eventos: PAYMENT_RECEIVED, PAYMENT_OVERDUE, SUBSCRIPTION_*
 *
 * IMPORTANTE: este endpoint é PÚBLICO (sem JWT).
 * Validação é feita via assinatura HMAC no header `asaas-access-token`.
 */
@ApiTags('billing-webhook')
@Controller('billing/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('asaas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook do Asaas (público, validado por HMAC)' })
  async handleAsaas(
    @Headers('asaas-access-token') signature: string,
    @Body() body: any,
  ) {
    this.logger.log(`Webhook Asaas recebido: ${body?.event}`);

    try {
      // Validar assinatura
      const provider = (this.billingService as any).provider;
      const rawBody = JSON.stringify(body);
      if (signature && !provider.verifyWebhookSignature(rawBody, signature)) {
        throw new BadRequestException('Assinatura do webhook inválida');
      }

      // Processar
      await this.billingService.handleWebhook(body);
      return { received: true };
    } catch (err) {
      this.logger.error(`Erro no webhook: ${err}`);
      throw err;
    }
  }
}
