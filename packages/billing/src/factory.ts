/**
 * Factory de BillingProvider baseado no env.
 */

import type { BillingProvider } from './provider';
import { AsaasProvider } from './providers/asaas';
import { MockBillingProvider } from './providers/mock';
import type { BillingConfig, BillingProviderName } from './types';

export function createBillingProvider(config: BillingConfig): BillingProvider {
  switch (config.provider) {
    case 'asaas':
      return new AsaasProvider(config);
    case 'mock':
      return new MockBillingProvider(config);
    case 'stripe':
      throw new Error('Stripe provider não implementado ainda. Use "asaas" ou "mock".');
    default:
      throw new Error(`Provider desconhecido: ${config.provider as BillingProviderName}`);
  }
}
