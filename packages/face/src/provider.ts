/**
 * Server-side face provider abstraction.
 * Compara embeddings (criptografadas no banco) sem precisar da imagem original.
 *
 * Provider mock: usado em dev/test. Faz comparação determinística.
 * Provider face-api-js server: não roda no Node, então o client gera o embedding
 *   e o server só compara dois vetores (distância euclidiana).
 * Provider aws/azure: chama API externa passando embedding ou imagem.
 */

import type { EmbeddingPayload, LivenessResult, VerificationResult, FaceProviderConfig } from './types';

export interface FaceProvider {
  readonly name: string;
  initialize(): Promise<void>;

  /**
   * Verifica se duas embeddings são da mesma pessoa.
   * Recebe APENAS os vetores (já descriptografados), nunca a imagem.
   */
  verify(stored: EmbeddingPayload, live: EmbeddingPayload): Promise<VerificationResult>;

  /**
   * Valida embedding recebida do client.
   * Sanity check: tamanho, range, não-NaN.
   */
  validateEmbedding(embedding: number[]): { valid: boolean; reason?: string };

  /**
   * Valida resultado de liveness reportado pelo client.
   * Em produção, podemos re-verificar server-side (ex: AWS liveness).
   */
  validateLiveness(liveness: LivenessResult): Promise<{ valid: boolean; reason?: string }>;
}

export class FaceProviderError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FaceProviderError';
  }
}
