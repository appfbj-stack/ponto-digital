import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * Gera um ID único (UUID v4 sem traços, ideal para client_event_id).
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Gera um UUID v4 padrão.
 */
export function generateUuid(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Hash SHA-256 de uma string (hex).
 * Usar para gerar fingerprints (ex: device_id a partir de dados do device).
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Criptografia AES-256-GCM.
 * Usada para armazenar embeddings faciais no banco.
 *
 * Formato do output: base64(iv || authTag || encrypted)
 *  - iv: 12 bytes
 *  - authTag: 16 bytes
 *  - encrypted: variável
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('Chave de criptografia deve ter 32 bytes (256 bits) após decode base64.');
  }
  return key;
}

export function encrypt(plaintext: string, keyBase64: string): string {
  const key = getKey(keyBase64);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(ciphertextBase64: string, keyBase64: string): string {
  const key = getKey(keyBase64);
  const data = Buffer.from(ciphertextBase64, 'base64');

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Ciphertext inválido.');
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * Mascara dados sensíveis para logs.
 * Ex: "123.456.789-00" → "***.***.789-**"
 */
export function maskCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***';
  return `***.***.${clean.slice(6, 9)}-**`;
}

/**
 * Mascara email para logs.
 * Ex: "joao.silva@empresa.com" → "j***@empresa.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}
