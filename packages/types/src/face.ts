/**
 * Abstração de provedor de reconhecimento facial.
 * Permite trocar face-api.js (MVP local) por AWS Rekognition ou Azure Face
 * sem mexer no resto do sistema.
 */

export interface FaceDescriptor {
  /** Vetor de embedding facial (Float32Array serializado). */
  embedding: number[];
  /** Versão do modelo que gerou. */
  modelVersion: string;
  /** Qualidade da captura (0-1). */
  quality: number;
}

export interface FaceVerificationRequest {
  /** Embedding armazenada (criptografada no backend, descriptografada no provider). */
  storedEmbedding: number[];
  /** Captura atual ao vivo. */
  liveEmbedding: number[];
  /** Threshold de similaridade. */
  threshold: number;
}

export interface FaceVerificationResult {
  matched: boolean;
  distance: number;
  confidence: number;
}

export interface FaceProviderConfig {
  provider: 'face-api-js' | 'aws' | 'azure' | 'mock';
  apiKey?: string;
  endpoint?: string;
  similarityThreshold: number;
}

/**
 * Interface que todo provedor de reconhecimento facial deve implementar.
 * Trocar provedor = implementar essa interface e registrar no DI container.
 */
export interface FaceRecognitionProvider {
  /** Nome do provider. */
  readonly name: string;

  /** Inicializa o provider (carrega modelos, conecta em APIs, etc). */
  initialize(): Promise<void>;

  /** Verifica se há um rosto detectável na imagem. */
  detectFace(imageData: ImageData | Blob | string): Promise<boolean>;

  /** Gera embedding facial a partir de uma imagem ao vivo. */
  generateEmbedding(imageData: ImageData | Blob | string): Promise<FaceDescriptor>;

  /** Compara duas embeddings. */
  verify(request: FaceVerificationRequest): Promise<FaceVerificationResult>;

  /** Verifica liveness (challenge de movimento). */
  checkLiveness(challengeFrames: Array<ImageData | Blob | string>): Promise<{
    passed: boolean;
    confidence: number;
  }>;
}
