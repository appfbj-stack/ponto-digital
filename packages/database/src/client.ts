import { PrismaClient } from '@prisma/client';

/**
 * Singleton do PrismaClient.
 * Em dev, evita criar múltiplas conexões por hot-reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper: desconecta de forma limpa (usar em testes).
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
