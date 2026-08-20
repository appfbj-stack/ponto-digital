/**
 * Testes de integração do fluxo facial end-to-end (sem servidor).
 * Simula o ciclo: gerar embedding → criptografar → salvar → descriptografar → comparar.
 */

import { describe, it, expect } from 'vitest';
import { LocalFaceProvider } from './providers/local';
import { encrypt, decrypt } from '@kairos/utils';
import type { EmbeddingPayload } from './types';

const TEST_KEY = 'dGVzdC1iaW8tMzItYnl0ZXMtZm9yLXRlc3RzMTIzNDU2';

function makeEmbedding(seed: number): EmbeddingPayload {
  const embedding = new Array(128).fill(0).map((_, i) => Math.sin((i + seed) / 10));
  // Normaliza
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  const normalized = embedding.map((v) => v / norm);
  return {
    embedding: normalized,
    modelVersion: 'test-v1',
    quality: 0.9,
    size: 128,
  };
}

describe('Face recognition end-to-end', () => {
  const provider = new LocalFaceProvider({ provider: 'face-api-js', similarityThreshold: 0.5 });

  it('ciclo completo: criptografa → descriptografa → compara igual', async () => {
    const original = makeEmbedding(1);

    // Criptografa (simula o que o service faz)
    const encrypted = encrypt(JSON.stringify(original.embedding), TEST_KEY);

    // Simula o que o service faz ao verificar
    const decrypted = JSON.parse(decrypt(encrypted, TEST_KEY));
    const stored: EmbeddingPayload = {
      ...original,
      embedding: decrypted,
    };

    const result = await provider.verify(stored, original);
    expect(result.matched).toBe(true);
    expect(result.distance).toBe(0);
  });

  it('embeddings muito diferentes → não match', async () => {
    const a = makeEmbedding(1);
    const b = makeEmbedding(1000);
    const result = await provider.verify(a, b);
    expect(result.matched).toBe(false);
  });

  it('embeddings similares (mesma seed + pequeno ruído) → match', async () => {
    const a = makeEmbedding(1);
    const b = makeEmbedding(1);
    // Adiciona ruído pequeno
    b.embedding = b.embedding.map((v, i) => v + (Math.random() - 0.5) * 0.05);

    const result = await provider.verify(a, b);
    // Com threshold 0.5, deve dar match mesmo com ruído
    expect(result.matched).toBe(true);
  });

  it('rosto diferente completamente → distância alta, não match', async () => {
    const stored = makeEmbedding(1);
    const live: EmbeddingPayload = {
      embedding: new Array(128).fill(0.5),
      modelVersion: 'test-v1',
      quality: 0.9,
      size: 128,
    };

    const result = await provider.verify(stored, live);
    expect(result.matched).toBe(false);
    expect(result.distance).toBeGreaterThan(0.5);
  });
});
