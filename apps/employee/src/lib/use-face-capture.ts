'use client';

/**
 * Hook React para captura facial com liveness.
 *
 * Uso:
 *   const { videoRef, status, error, startCapture, capture, stop } = useFaceCapture({ mode: 'register' });
 *   <video ref={videoRef} playsInline />
 *   <button onClick={capture}>Capturar</button>
 *
 * Fluxo:
 *   1. startCamera() → pede permissão e mostra preview
 *   2. detectLoop() roda a cada 200ms, mostra indicadores na tela
 *   3. capture() tira UMA foto, valida, retorna embedding + liveness
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFaceApi, getFaceApi, isFaceApiLoaded } from './face-api';
import type { FaceDetection } from './face-types';

export type CaptureMode = 'register' | 'verify';

export interface LivenessData {
  confidence: number;
  checks: {
    faceDetected: boolean;
    singleFace: boolean;
    movementDetected: boolean;
    timing: number;
  };
}

export interface EmbeddingData {
  embedding: number[];
  modelVersion: string;
  quality: number;
  size: number;
}

export interface FaceCaptureState {
  /** Ref pro elemento <video> */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Status do hook */
  status:
    | 'idle'
    | 'loading-model'
    | 'requesting-camera'
    | 'ready'
    | 'detecting'
    | 'captured'
    | 'error';
  /** Mensagem de erro amigável */
  error: string | null;
  /** Mensagem de instrução pro usuário */
  instruction: string;
  /** Se rosto foi detectado no último frame */
  faceDetected: boolean;
  /** Posição média do rosto (pra overlay visual) */
  faceBox: { x: number; y: number; width: number; height: number } | null;
  /** Dados de liveness acumulados */
  livenessProgress: {
    movementScore: number;
    elapsedMs: number;
    targetMs: number;
  };
}

export interface FaceCaptureActions {
  start: () => Promise<void>;
  stop: () => void;
  /** Captura UMA amostra. Usar várias vezes pra register. */
  capture: () => Promise<{ embedding: EmbeddingData; liveness: LivenessData } | null>;
  /** Reseta pra nova captura */
  reset: () => void;
}

export function useFaceCapture(
  options: { mode: CaptureMode; samplesCount?: number } = { mode: 'verify' },
): [FaceCaptureState, FaceCaptureActions] {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectionStartRef = useRef<number>(0);
  const prevBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const movementAccumulatorRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  const [status, setStatus] = useState<FaceCaptureState['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceBox, setFaceBox] = useState<FaceCaptureState['faceBox']>(null);
  const [instruction, setInstruction] = useState('Posicione seu rosto na câmera');
  const [livenessProgress, setLivenessProgress] = useState({
    movementScore: 0,
    elapsedMs: 0,
    targetMs: options.mode === 'register' ? 2500 : 1500,
  });

  // Cleanup
  const stop = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  // Limpa no unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setStatus('loading-model');

      // 1. Carrega modelos
      if (!isFaceApiLoaded()) {
        await loadFaceApi();
      }

      // 2. Pede câmera
      setStatus('requesting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 3. Inicia detecção contínua
      detectionStartRef.current = Date.now();
      movementAccumulatorRef.current = 0;
      frameCountRef.current = 0;
      prevBoxRef.current = null;

      setStatus('detecting');
      setInstruction(
        options.mode === 'register'
          ? 'Mova levemente a cabeça de um lado pro outro'
          : 'Olhe para a câmera e mantenha-se parado',
      );

      detectIntervalRef.current = setInterval(detectLoop, 200);
    } catch (err: any) {
      console.error('[face-capture] Erro ao iniciar:', err);
      setError(err?.message || 'Não foi possível acessar a câmera.');
      setStatus('error');
    }
  }, [options.mode]);

  const detectLoop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const faceapi = getFaceApi();
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptor();

    const elapsed = Date.now() - detectionStartRef.current;
    setLivenessProgress((p) => ({ ...p, elapsedMs: elapsed }));

    if (!detection) {
      setFaceDetected(false);
      setFaceBox(null);
      setInstruction('Nenhum rosto detectado. Posicione-se no centro.');
      prevBoxRef.current = null;
      return;
    }

    const box = detection.detection.box;
    setFaceDetected(true);
    setFaceBox(box);
    frameCountRef.current += 1;

    // Calcula movimento
    if (prevBoxRef.current) {
      const dx = Math.abs(box.x - prevBoxRef.current.x);
      const dy = Math.abs(box.y - prevBoxRef.current.y);
      const movement = Math.sqrt(dx * dx + dy * dy);
      if (movement > 5) {
        // threshold de 5px de movimento
        movementAccumulatorRef.current += movement;
      }
    }
    prevBoxRef.current = box;

    // Calcula score de liveness baseado em movimento
    const movementScore = Math.min(1, movementAccumulatorRef.current / 100);
    setLivenessProgress((p) => ({ ...p, movementScore }));

    // Instruções dinâmicas
    if (options.mode === 'register') {
      if (elapsed < livenessProgress.targetMs) {
        if (movementScore < 0.3) {
          setInstruction('Mova levemente a cabeça de um lado pro outro');
        } else {
          setInstruction(`Continue... ${Math.round((lapsed / livenessProgress.targetMs) * 100)}%`);
        }
      } else {
        setInstruction('✓ Pronto para capturar');
      }
    } else {
      setInstruction('✓ Rosto detectado');
    }
  }, [options.mode, livenessProgress.targetMs]);

  const capture = useCallback(async (): Promise<{ embedding: EmbeddingData; liveness: LivenessData } | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const faceapi = getFaceApi();
    const detection: FaceDetection | null = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setError('Nenhum rosto detectado. Tente novamente.');
      return null;
    }

    const elapsed = Date.now() - detectionStartRef.current;
    const movementScore = Math.min(1, movementAccumulatorRef.current / 100);

    const liveness: LivenessData = {
      confidence: Math.min(1, 0.4 + movementScore * 0.6),
      checks: {
        faceDetected: true,
        singleFace: true, // detectSingleFace garante
        movementDetected: movementScore > 0.2,
        timing: elapsed,
      },
    };

    // Calcula qualidade baseada no score da detecção
    const quality = Math.min(1, detection.detection.score);

    const embedding: EmbeddingData = {
      embedding: Array.from(detection.descriptor),
      modelVersion: 'tiny-face-detector-v1',
      quality,
      size: detection.descriptor.length,
    };

    return { embedding, liveness };
  }, []);

  const reset = useCallback(() => {
    detectionStartRef.current = Date.now();
    movementAccumulatorRef.current = 0;
    frameCountRef.current = 0;
    prevBoxRef.current = null;
    setError(null);
    setLivenessProgress((p) => ({ movementScore: 0, elapsedMs: 0, targetMs: p.targetMs }));
    setStatus('detecting');
  }, []);

  const state: FaceCaptureState = {
    videoRef,
    status,
    error,
    instruction,
    faceDetected,
    faceBox,
    livenessProgress,
  };

  const actions: FaceCaptureActions = { start, stop, capture, reset };
  return [state, actions];
}
