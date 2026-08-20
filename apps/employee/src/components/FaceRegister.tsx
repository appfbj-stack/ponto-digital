'use client';

/**
 * Componente de cadastro de biometria facial.
 * Captura 3-5 amostras e envia pro backend.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFaceCapture, type EmbeddingData, type LivenessData } from '@/lib/use-face-capture';

const TOTAL_SAMPLES = 3;
const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

interface Sample {
  embedding: EmbeddingData;
  liveness: LivenessData;
}

export function FaceRegister({ onComplete, onCancel }: { onComplete?: () => void; onCancel?: () => void }) {
  const router = useRouter();
  const [state, actions] = useFaceCapture({ mode: 'register' });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    actions.start();
    return () => actions.stop();
  }, [actions]);

  async function handleCapture() {
    setError(null);
    const result = await actions.capture();
    if (!result) {
      setError('Não foi possível capturar. Tente novamente.');
      return;
    }

    // Valida liveness mínimo
    if (!result.liveness.checks.movementDetected) {
      setError('Não detectamos movimento. Vire a cabeça de um lado pro outro e tente novamente.');
      return;
    }

    setSamples((prev) => [...prev, result]);

    if (samples.length + 1 >= TOTAL_SAMPLES) {
      // Última amostra — envia pro backend
      await submitBiometric([...samples, result]);
    } else {
      // Reseta pra próxima captura
      setTimeout(() => actions.reset(), 500);
    }
  }

  async function submitBiometric(allSamples: Sample[]) {
    setSubmitting(true);
    setError(null);

    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      setError('Sessão expirada. Faça login novamente.');
      return;
    }

    try {
      const deviceId = 'web-' + (navigator.userAgent.length % 100000);
      const res = await fetch(`${API_URL}/api/biometric/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          samples: allSamples.map((s) => s.embedding),
          liveness: allSamples[allSamples.length - 1]!.liveness,
          deviceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Erro ao cadastrar biometria.');
        return;
      }

      onComplete?.();
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Cadastrar Biometria</h1>
          <p className="mt-1 text-sm text-gray-600">
            {samples.length < TOTAL_SAMPLES
              ? `Amostra ${samples.length + 1} de ${TOTAL_SAMPLES}`
              : 'Enviando...'}
          </p>
        </div>

        {/* Preview da câmera */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-900">
          <video
            ref={state.videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Overlay com box do rosto */}
          {state.faceBox && state.videoRef.current && (
            <div
              className="pointer-events-none absolute rounded-lg border-4 border-green-500"
              style={{
                transform: 'scaleX(-1)',
                left: `${(state.faceBox.x / state.videoRef.current.videoWidth) * 100}%`,
                top: `${(state.faceBox.y / state.videoRef.current.videoHeight) * 100}%`,
                width: `${(state.faceBox.width / state.videoRef.current.videoWidth) * 100}%`,
                height: `${(state.faceBox.height / state.videoRef.current.videoHeight) * 100}%`,
              }}
            />
          )}

          {/* Indicador de movimento */}
          {state.status === 'detecting' && (
            <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-3 py-2 text-xs text-white">
              <div className="flex items-center justify-between">
                <span>{state.instruction}</span>
                <span>{Math.round(state.livenessProgress.movementScore * 100)}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${state.livenessProgress.movementScore * 100}%` }}
                />
              </div>
            </div>
          )}

          {state.status === 'loading-model' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              Carregando modelos de IA...
            </div>
          )}

          {state.status === 'requesting-camera' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              Aguardando permissão da câmera...
            </div>
          )}
        </div>

        {/* Indicador de progresso de amostras */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full ${
                i < samples.length ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCapture}
            disabled={
              !state.faceDetected ||
              submitting ||
              samples.length >= TOTAL_SAMPLES ||
              state.livenessProgress.movementScore < 0.3
            }
            className="h-12 flex-1 rounded-lg bg-blue-600 font-medium text-white disabled:opacity-40"
          >
            {submitting
              ? 'Enviando...'
              : samples.length >= TOTAL_SAMPLES
                ? '✓ Cadastrado'
                : 'Capturar'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="h-12 rounded-lg border border-gray-300 px-4 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          {state.faceDetected
            ? '✓ Rosto detectado. Vire a cabeça até a barra encher.'
            : 'Posicione seu rosto no centro da câmera'}
        </p>
      </div>
    </div>
  );
}
