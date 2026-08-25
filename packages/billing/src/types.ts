/**
 * Tipos para integração com gateways de pagamento.
 * Começamos com Asaas (Brasil), estrutura permite trocar.
 */

export type BillingProviderName = 'asaas' | 'stripe' | 'mock';

export type BillingEnvironment = 'sandbox' | 'production';

export interface BillingConfig {
  provider: BillingProviderName;
  environment: BillingEnvironment;
  apiKey: string;
  webhookSecret?: string;
}

export interface CustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  externalRef: string; // nosso tenantId
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export interface SubscriptionData {
  customerId: string;
  planValue: number;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  nextDueDate: string; // YYYY-MM-DD
  description?: string;
  externalRef: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'OVERDUE';
  nextDueDate: string;
}

export interface PaymentData {
  customerId: string;
  subscriptionId?: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalRef?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue: number;
  status:
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED'
    | 'CANCELED';
  dueDate: string;
  paymentDate?: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

export type WebhookEventType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_DELETED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_INACTIVATED'
  | 'SUBSCRIPTION_DELETED';

export interface WebhookEvent {
  event: WebhookEventType;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
  customer?: AsaasCustomer;
}
