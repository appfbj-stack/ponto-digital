import { z } from 'zod';

/**
 * Schema de validação das variáveis de ambiente.
 * Falha rápido se faltar algo crítico ou se algum valor for inválido.
 */
const envSchema = z.object({
  // Geral
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),

  // API
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_URL: z.string().url(),
  CORS_ORIGINS: z.string().default(''),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Frontend URLs
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_EMPLOYEE_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPER_ADMIN_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Kairos Ponto'),
  NEXT_PUBLIC_PWA_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // Face recognition
  FACE_PROVIDER: z.enum(['face-api-js', 'aws', 'azure', 'mock']).default('face-api-js'),
  FACE_API_KEY: z.string().optional(),
  FACE_API_ENDPOINT: z.string().optional(),
  FACE_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),

  // Biometria
  BIOMETRIC_ENCRYPTION_KEY: z.string().min(32, 'BIOMETRIC_ENCRYPTION_KEY deve ter no mínimo 32 caracteres'),

  // Asaas
  ASAAS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_SECRET: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Rate limiting
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida e retorna as variáveis de ambiente tipadas.
 * Lança erro descritivo se algo estiver inválido.
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(
      `\n\n❌ Variáveis de ambiente inválidas:\n${errors}\n\n` +
        `Verifique o arquivo .env (use .env.example como referência).\n`,
    );
  }

  return parsed.data;
}

/**
 * Helper: retorna lista de origens permitidas no CORS
 */
export function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS;
  if (!origins) return [];
  return origins.split(',').map((o) => o.trim()).filter(Boolean);
}
