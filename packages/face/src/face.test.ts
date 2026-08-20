import { describe, it, expect } from 'vitest';
import { LocalFaceProvider } from './providers/local';
import type { EmbeddingPayload, LivenessResult } from './types';

const makeEmbedding = (values: number[]): EmbeddingPayload => ({
  embedding: values,
  modelVersion: '1.0',
  quality: 0.9,
  size: values.length,
});

describe('LocalFaceProvider', () => {
  const provider = new LocalFaceProvider({ provider: 'face-api-js', similarityThreshold: 0.6 });

  it('verify retorna match quando embeddings são idênticas', async () => {
    const a = makeEmbedding(new Array(128).fill(0).map((_, i) => Math.sin(i / 10)));
    const b = makeEmbedding(new Array(128).fill(0).map((_, i) => Math.sin(i / 10)));
    const result = await provider.verify(a, b);
    expect(result.matched).toBe(true);
    expect(result.distance).toBe(0);
    expect(result.confidence).toBe(1);
  });

  it('verify retorna mismatch quando embeddings são muito diferentes', async () => {
    const a = makeEmbedding(new Array(128).fill(0.1));
    const b = makeEmbedding(new Array(128).fill(0.9));
    const result = await provider.verify(a, b);
    expect(result.matched).toBe(false);
    expect(result.distance).toBeGreaterThan(0.6);
  });

  it('verify lança erro se tamanhos diferentes', async () => {
    const a = makeEmbedding(new Array(64).fill(0.5));
    const b = makeEmbedding(new Array(128).fill(0.5));
    await expect(provider.verify(a, b)).rejects.toThrow(/size mismatch/i);
  });

  it('validateEmbedding aceita embedding válida', () => {
    const valid = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
    expect(provider.validateEmbedding(valid).valid).toBe(true);
  });

  it('validateEmbedding rejeita embedding vazia', () => {
    expect(provider.validateEmbedding([]).valid).toBe(false);
  });

  it('validateEmbedding rejeita tamanho incorreto', () => {
    expect(provider.validateEmbedding(new Array(64).fill(0)).valid).toBe(false);
  });

  it('validateEmbedding rejeita NaN', () => {
    const bad = new Array(128).fill(0);
    bad[10] = NaN;
    expect(provider.validateEmbedding(bad).valid).toBe(false);
  });

  it('validateEmbedding rejeita valores fora de range', () => {
    const bad = new Array(128).fill(0);
    bad[5] = 999;
    expect(provider.validateEmbedding(bad).valid).toBe(false);
  });

  describe('validateLiveness', () => {
    const goodLiveness: LivenessResult = {
      passed: true,
      confidence: 0.9,
      checks: { faceDetected: true, singleFace: true, movementDetected: true, timing: 2000 },
    };

    it('aceita liveness válido', async () => {
      const r = await provider.validateLiveness(goodLiveness);
      expect(r.valid).toBe(true);
    });

    it('rejeita sem face detectada', async () => {
      const r = await provider.validateLiveness({ ...goodLiveness, checks: { ...goodLiveness.checks, faceDetected: false } });
      expect(r.valid).toBe(false);
    });

    it('rejeita múltiplas faces', async () => {
      const r = await provider.validateLiveness({ ...goodLiveness, checks: { ...goodLiveness.checks, singleFace: false } });
      expect(r.valid).toBe(false);
    });

    it('rejeita sem movimento (suspeita de foto)', async () => {
      const r = await provider.validateLiveness({ ...goodLiveness, checks: { ...goodLiveness.checks, movementDetected: false } });
      expect(r.valid).toBe(false);
    });

    it('rejeita liveness muito rápido (possível automação)', async () => {
      const r = await provider.validateLiveness({ ...goodLiveness, checks: { ...goodLiveness.checks, timing: 100 } });
      expect(r.valid).toBe(false);
    });

    it('rejeita confiança baixa', async () => {
      const r = await provider.validateLiveness({ ...goodLiveness, confidence: 0.3 });
      expect(r.valid).toBe(false);
    });
  });
});
