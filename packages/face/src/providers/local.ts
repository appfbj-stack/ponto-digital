/**
 * Provider de comparação local de embeddings.
 *
 * O face-api.js roda no CLIENTE (gera embedding a partir da imagem).
 * No servidor, só precisamos comparar dois vetores com distância euclidiana.
 *
 * Esse provider é o "padrão" no MVP. Quando o cliente migrar pra AWS/Azure,
 * basta criar `aws.ts` e `azure.ts` implementando a mesma interface.
 */

import type { FaceProvider } from '../provider';
import { FaceProviderError } from '../provider';
import type { EmbeddingPayload, LivenessResult, VerificationResult, FaceProviderConfig } from '../types';

export class LocalFaceProvider implements FaceProvider {
  readonly name = 'local';
  private threshold: number;
  private expectedSize: number = 128; // face-api.js produz 128-dim por padrão

  constructor(config: FaceProviderConfig) {
    this.threshold = config.similarityThreshold;
  }

  async initialize(): Promise<void> {
    // Nada pra inicializar — comparação é pura matemática
  }

  async verify(stored: EmbeddingPayload, live: EmbeddingPayload): Promise<VerificationResult> {
    if (stored.embedding.length !== live.embedding.length) {
      throw new FaceProviderError(
        `Embedding size mismatch: stored=${stored.embedding.length}, live=${live.embedding.length}`,
        'SIZE_MISMATCH',
      );
    }

    const distance = this.euclideanDistance(stored.embedding, live.embedding);
    // Converte distância em similaridade (0-1): menor distância = maior similaridade
    // Heurística comum: limiar ~0.6 = match
    const confidence = Math.max(0, 1 - distance);
    const matched = distance <= this.threshold;

    return { matched, distance, confidence };
  }

  validateEmbedding(embedding: number[]): { valid: boolean; reason?: string } {
    if (!Array.isArray(embedding)) {
      return { valid: false, reason: 'Embedding must be an array' };
    }
    if (embedding.length === 0) {
      return { valid: false, reason: 'Embedding is empty' };
    }
    if (embedding.length !== this.expectedSize) {
      return {
        valid: false,
        reason: `Embedding has unexpected size: ${embedding.length} (expected ${this.expectedSize})`,
      };
    }
    for (let i = 0; i < embedding.length; i++) {
      const v = embedding[i];
      if (typeof v !== 'number' || !Number.isFinite(v) || Number.isNaN(v)) {
        return { valid: false, reason: `Invalid value at index ${i}` };
      }
      if (Math.abs(v) > 10) {
        // Embeddings normalizados devem estar em range [-1, 1] ou próximo
        return { valid: false, reason: `Out of range value at index ${i}: ${v}` };
      }
    }
    return { valid: true };
  }

  async validateLiveness(liveness: LivenessResult): Promise<{ valid: boolean; reason?: string }> {
    if (!liveness.checks.faceDetected) {
      return { valid: false, reason: 'No face detected' };
    }
    if (!liveness.checks.singleFace) {
      return { valid: false, reason: 'Multiple faces detected' };
    }
    if (!liveness.checks.movementDetected) {
      return { valid: false, reason: 'No movement detected (possible static image/spoof)' };
    }
    if (liveness.confidence < 0.5) {
      return { valid: false, reason: `Liveness confidence too low: ${liveness.confidence}` };
    }
    if (liveness.checks.timing < 500) {
      return { valid: false, reason: 'Liveness check too fast (likely automated)' };
    }
    if (liveness.checks.timing > 30000) {
      return { valid: false, reason: 'Liveness check took too long' };
    }
    return { valid: true };
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
