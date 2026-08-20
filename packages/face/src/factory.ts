/**
 * Factory de FaceProvider (server-side).
 * Escolhe implementação baseado no FACE_PROVIDER env.
 *
 * provider=mock      → aceita tudo (dev/test)
 * provider=face-api-js → comparação local de embeddings (MVP, produção leve)
 * provider=aws/azure → provider externo (não implementado ainda)
 */

import type { FaceProvider } from './provider';
import type { FaceProviderConfig } from './types';
import { LocalFaceProvider } from './providers/local';
import { MockFaceProvider } from './providers/mock';

export function createFaceProvider(config: FaceProviderConfig): FaceProvider {
  switch (config.provider) {
    case 'mock':
      return new MockFaceProvider(config);

    case 'face-api-js':
      return new LocalFaceProvider(config);

    case 'aws':
    case 'azure':
      throw new Error(
        `Provider "${config.provider}" não implementado. ` +
          `Crie providers/aws.ts e providers/azure.ts quando for migrar.`,
      );

    default:
      throw new Error(`Provider desconhecido: ${config.provider as string}`);
  }
}
