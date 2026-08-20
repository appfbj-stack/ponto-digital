'use client';

/**
 * Componente de validação facial para registro de ponto.
 * Captura embedding ao vivo e envia junto com a requisição de ponto.
 */

import { useEffect } from 'react';
import { useFaceCapture, type EmbeddingData, type LivenessData } from '@/lib/use-face-capture';

interface FaceVerifyProps {
  onCapture: (data: { embedding: EmbeddingData; liveness: LivenessData; faceToken: string }) => void;
  onCancel?: () => void;
  autoStart?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

export function FaceVerify({ onCapture, onCancel, autoStart = true }: FaceVerifyProps) {
  const [state, actions] = useFaceCapture({ mode: 'verify' });

  useEffect(() => {
    if (autoStart) {
      actions.start();
    }
    return () => actions.stop();
  }, [actions, autoStart]);

  async function handleVerify() {
    const result = await actions.capture();
    if (!result) return;

    // Cria o faceToken (JSON com embedding + liveness) que vai pro backend
    const faceToken = JSON.stringify({
      embedding: result.embedding,
      liveness: result.liveness,
    });

    onCapture({
      embedding: result.embedding,
      liveness: result.liveness,
      faceToken,
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-900">
        <video
          ref={state.videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {state.faceBox && state.videoRef.current && (
          <div
            className="pointer-events-none absolute rounded-full border-4 border-blue-500"
            style={{
              transform: 'scaleX(-1)',
              left: `${(state.faceBox.x / state.videoRef.current.videoWidth) * 100}%`,
              top: `${(state.faceBox.y / state.videoRef.current.videoHeight) * 100}%`,
              width: `${(state.faceBox.width / state.videoRef.current.videoWidth) * 100}%`,
              height: `${(state.faceBox.height / state.videoRef.current.videoHeight) * 100}%`,
            }}
          />
        )}

        {state.status === 'loading-model' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
            Carregando...
          </div>
        )}

        {state.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 p-4 text-sm text-white">
            {state.error}
          </div>
        )}
      </div>

      {state.error && state.status !== 'error' && (
        <p className="text-center text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleVerify}
          disabled={!state.faceDetected || state.status !== 'detecting'}
          className="h-12 flex-1 rounded-lg bg-blue-600 font-medium text-white disabled:opacity-40"
        >
          {state.faceDetected ? 'Validar Rosto' : 'Aguardando rosto...'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="h-12 rounded-lg border px-4"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
