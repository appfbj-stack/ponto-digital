/**
 * Provider MOCK — usado em dev/test.
 * Não chama API real, retorna IDs fake.
 * NÃO usar em produção.
 */

import { BillingProvider } from '../provider';
import type {
  CustomerData,
  AsaasCustomer,
  SubscriptionData,
  AsaasSubscription,
  PaymentData,
  AsaasPayment,
  WebhookEvent,
  BillingConfig,
} from '../types';

let counter = 0;
const id = (prefix: string) => `${prefix}_mock_${Date.now()}_${++counter}`;

export class MockBillingProvider implements BillingProvider {
  readonly name = 'mock';
  private customers = new Map<string, AsaasCustomer>();
  private subscriptions = new Map<string, AsaasSubscription>();
  private payments = new Map<string, AsaasPayment>();

  constructor(_config: BillingConfig) {}

  async upsertCustomer(data: CustomerData): Promise<AsaasCustomer> {
    const cpfCnpj = data.cpfCnpj.replace(/\D/g, '');
    const existing = Array.from(this.customers.values()).find((c) => c.cpfCnpj === cpfCnpj);
    if (existing) {
      existing.name = data.name;
      existing.email = data.email;
      return existing;
    }
    const customer: AsaasCustomer = {
      id: id('cus'),
      name: data.name,
      email: data.email,
      cpfCnpj,
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async createSubscription(data: SubscriptionData): Promise<AsaasSubscription> {
    const sub: AsaasSubscription = {
      id: id('sub'),
      customer: data.customerId,
      value: data.planValue,
      cycle: data.cycle,
      status: 'ACTIVE',
      nextDueDate: data.nextDueDate,
    };
    this.subscriptions.set(sub.id, sub);
    return sub;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) sub.status = 'INACTIVE';
  }

  async createPayment(data: PaymentData): Promise<AsaasPayment> {
    const payment: AsaasPayment = {
      id: id('pay'),
      customer: data.customerId,
      subscription: data.subscriptionId,
      value: data.value,
      netValue: data.value,
      status: 'PENDING',
      dueDate: data.dueDate,
      billingType: 'UNDEFINED',
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  verifyWebhookSignature(_rawBody: string, _signature: string): boolean {
    return true;
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    return JSON.parse(rawBody);
  }
}
