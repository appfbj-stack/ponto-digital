/**
 * Provider Asaas.
 *
 * Docs: https://docs.asaas.com/reference
 * Sandbox: https://sandbox.asaas.com/api/v3
 * Produção: https://api.asaas.com/v3
 *
 * IMPORTANTE: este provider usa fetch nativo do Node 18+.
 */

import * as crypto from 'node:crypto';
import { BillingProvider, BillingError } from '../provider';
import type {
  BillingConfig,
  CustomerData,
  AsaasCustomer,
  SubscriptionData,
  AsaasSubscription,
  PaymentData,
  AsaasPayment,
  WebhookEvent,
} from '../types';

export class AsaasProvider implements BillingProvider {
  readonly name = 'asaas';
  private baseUrl: string;
  private apiKey: string;
  private webhookSecret?: string;

  constructor(config: BillingConfig) {
    if (!config.apiKey) {
      throw new BillingError('ASAAS_API_KEY não configurada', 'MISSING_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/v3';
  }

  async upsertCustomer(data: CustomerData): Promise<AsaasCustomer> {
    // Tenta buscar primeiro
    const cpfCnpj = data.cpfCnpj.replace(/\D/g, '');
    const found = await this.request<{ data: AsaasCustomer[] }>(
      'GET',
      `/customers?cpfCnpj=${cpfCnpj}`,
    );

    if (found.data && found.data.length > 0) {
      const existing = found.data[0]!;
      // Atualiza
      return await this.request<AsaasCustomer>('PUT', `/customers/${existing.id}`, {
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
    }

    return await this.request<AsaasCustomer>('POST', '/customers', {
      name: data.name,
      email: data.email,
      cpfCnpj,
      phone: data.phone,
      externalReference: data.externalRef,
    });
  }

  async createSubscription(data: SubscriptionData): Promise<AsaasSubscription> {
    return await this.request<AsaasSubscription>('POST', '/subscriptions', {
      customer: data.customerId,
      billingType: 'UNDEFINED', // permite cliente escolher no checkout
      value: data.planValue,
      cycle: data.cycle,
      nextDueDate: data.nextDueDate,
      description: data.description,
      externalReference: data.externalRef,
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request('DELETE', `/subscriptions/${subscriptionId}`);
  }

  async createPayment(data: PaymentData): Promise<AsaasPayment> {
    return await this.request<AsaasPayment>('POST', '/payments', {
      customer: data.customerId,
      subscription: data.subscriptionId,
      billingType: 'UNDEFINED',
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalRef,
    });
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      // Em dev, sem secret configurado, aceita
      return true;
    }
    // Asaas usa HMAC-SHA256 do body com o access token
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new BillingError('Webhook payload inválido', 'INVALID_WEBHOOK');
    }
  }

  // --- private ---

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
        'User-Agent': 'KairosPonto/0.1.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new BillingError(
        errorBody.errors?.[0]?.description || `HTTP ${res.status}`,
        errorBody.errors?.[0]?.code || 'HTTP_ERROR',
        res.status,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}
