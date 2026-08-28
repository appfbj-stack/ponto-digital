/**
 * Gera um ID único (UUID v4 sem traços, ideal para client_event_id).
 */
export declare function generateId(): string;
/**
 * Gera um UUID v4 padrão.
 */
export declare function generateUuid(): string;
/**
 * Hash SHA-256 de uma string (hex).
 * Usar para gerar fingerprints (ex: device_id a partir de dados do device).
 */
export declare function sha256(input: string): string;
export declare function encrypt(plaintext: string, keyBase64: string): string;
export declare function decrypt(ciphertextBase64: string, keyBase64: string): string;
/**
 * Mascara dados sensíveis para logs.
 * Ex: "123.456.789-00" → "***.***.789-**"
 */
export declare function maskCpf(cpf: string): string;
/**
 * Mascara email para logs.
 * Ex: "joao.silva@empresa.com" → "j***@empresa.com"
 */
export declare function maskEmail(email: string): string;
//# sourceMappingURL=crypto.d.ts.map