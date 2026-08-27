'use client';

/**
 * Cliente de reconhecimento facial usando face-api.js.
 * Carrega modelos sob demanda e expõe API simples.
 *
 * Modelos: ~6-10MB. Servidos de /models/ (cacheados pelo Service Worker).
 */

import type { FaceApiModule } from './face-types';

let faceapi: FaceApiModule | null = null;
let modelsLoaded = false;
let loadPromise: Promise<FaceApiModule> | null = null;

const MODEL_URL = '/models';
const REQUIRED_MODELS = [
  'tinyFaceDetector',
  'faceLandmark68Net',
  'faceRecognitionNet',
  'faceExpressionNet',
] as const;

export async function loadFaceApi(): Promise<FaceApiModule> {
  if (faceapi && modelsLoaded) return faceapi;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Import dinâmico (não inclui no bundle principal)
    const mod: any = await import('face-api.js');
    faceapi = (mod.default ?? mod) as FaceApiModule;

    // Carrega modelos em paralelo
    await Promise.all(
      REQUIRED_MODELS.map((model) =>
        faceapi!.nets[model].loadFromUri(MODEL_URL),
      ),
    );
    modelsLoaded = true;
    return faceapi!;
  })();

  return loadPromise;
}

export function isFaceApiLoaded(): boolean {
  return modelsLoaded;
}

export function getFaceApi(): FaceApiModule {
  if (!faceapi || !modelsLoaded) {
    throw new Error('Face-api não carregou ainda. Chame loadFaceApi() primeiro.');
  }
  return faceapi;
}
