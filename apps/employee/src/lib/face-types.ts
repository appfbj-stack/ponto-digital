/**
 * Tipos minimalistas do face-api.js.
 * Evita precisar importar a lib só pra tipar.
 */

export interface FaceApiModule {
  nets: {
    tinyFaceDetector: { loadFromUri(uri: string): Promise<void> };
    faceLandmark68Net: { loadFromUri(uri: string): Promise<void> };
    faceRecognitionNet: { loadFromUri(uri: string): Promise<void> };
    faceExpressionNet: { loadFromUri(uri: string): Promise<void> };
  };
  TinyFaceDetectorOptions: new (params: { inputSize?: number; scoreThreshold?: number }) => unknown;
  detectSingleFace: (
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    options?: unknown,
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<FaceDetection | null>;
    };
  };
  matchDimensions: (canvas: HTMLCanvasElement, width: number, height: number) => void;
}

export interface FaceDetection {
  detection: {
    box: { x: number; y: number; width: number; height: number };
    score: number;
  };
  landmarks?: { positions: Array<{ x: number; y: number }> };
  descriptor: Float32Array;
}
