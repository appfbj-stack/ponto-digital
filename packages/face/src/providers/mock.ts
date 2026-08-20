/**
 * Provider MOCK — usado em dev/test.
 * SEMPRE aceita qualquer embedding, com confidence alta.
 * Não usar em produção.
 */

import type { FaceProvider } from '../provider';
import type { EmbeddingPayload, LivenessResult, VerificationResult, FaceProviderConfig } from '../types';

export class MockFaceProvider implements FaceProvider {
  readonly name = 'mock';

  constructor(_config: FaceProviderConfig) {}

  async initialize(): Promise<void> {}

  async verify(_stored: EmbeddingPayload, _live: EmbeddingPayload): Promise<VerificationResult> {
    return { matched: true, distance: 0.0, confidence: 1.0 };
  }

  validateEmbedding(embedding: number[]): { valid: boolean; reason?: string } {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return { valid: false, reason: 'Empty embedding' };
    }
    return { valid: true };
  }

  async validateLiveness(_liveness: LivenessResult): Promise<{ valid: boolean; reason?: string }> {
    return { valid: true };
  }
}
