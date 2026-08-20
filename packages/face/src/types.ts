/**
 * Tipos do reconhecimento facial server-side.
 * Complementa os tipos em @kairos/types/face (que são client-side).
 */

export interface EmbeddingPayload {
  /** Vetor de embedding (Float32Array serializado em array de números). */
  embedding: number[];
  /** Versão do modelo que gerou (pra reprocessar se modelo mudar). */
  modelVersion: string;
  /** Qualidade da captura (0-1). */
  quality: number;
  /** Tamanho do vetor (sanity check). */
  size: number;
}

export interface LivenessResult {
  /** Se o liveness check passou. */
  passed: boolean;
  /** Confiança (0-1). */
  confidence: number;
  /** Detalhes do que foi checado. */
  checks: {
    faceDetected: boolean;
    singleFace: boolean;
    movementDetected: boolean;
    timing: number; // ms
  };
}

export interface VerificationResult {
  matched: boolean;
  distance: number;
  confidence: number;
}

export interface FaceProviderConfig {
  /** Provedor ativo. */
  provider: 'face-api-js' | 'mock' | 'aws' | 'azure';
  /** Threshold mínimo de similaridade pra considerar match (0-1, default 0.6). */
  similarityThreshold: number;
  /** Path dos modelos face-api.js servidos. */
  modelBasePath?: string;
  /** API key pra provedores externos. */
  apiKey?: string;
  /** Endpoint pra provedores externos. */
  endpoint?: string;
}
