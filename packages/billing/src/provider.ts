/**
 * Interface de provedor de billing.
 * Implementações: AsaasProvider, MockProvider (dev), futuro: StripeProvider.
 */

import type {
  CustomerData,
  AsaasCustomer,
  SubscriptionData,
  AsaasSubscription,
  PaymentData,
  AsaasPayment,
  WebhookEvent,
} from './types';

export interface BillingProvider {
  readonly name: string;

  /** Cria ou atualiza cliente no gateway */
  upsertCustomer(data: CustomerData): Promise<AsaasCustomer>;

  /** Cria assinatura recorrente */
  createSubscription(data: SubscriptionData): Promise<AsaasSubscription>;

  /** Cancela assinatura */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /** Cria uma cobrança avulsa (opcional) */
  createPayment(data: PaymentData): Promise<AsaasPayment>;

  /** Verifica assinatura do webhook (HMAC) */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  /** Parseia payload do webhook */
  parseWebhookEvent(rawBody: string): WebhookEvent;
}

export class BillingError extends Error {
  constructor(message: string, public readonly code: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'BillingError';
  }
}
