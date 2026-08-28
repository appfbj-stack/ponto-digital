import { format } from 'date-fns';
/**
 * Formata data no timezone da empresa.
 * Padrão BR: "20/08/2026 08:42"
 */
export declare function formatDateTimeInZone(date: Date | string, timezone?: string): string;
/**
 * Formata data curta no timezone da empresa.
 */
export declare function formatDateInZone(date: Date | string, timezone?: string): string;
/**
 * Formata apenas hora no timezone da empresa.
 */
export declare function formatTimeInZone(date: Date | string, timezone?: string): string;
/**
 * Converte data local (no timezone da empresa) para UTC.
 * Use antes de salvar no banco.
 */
export declare function toUtcFromZone(localDate: Date | string, timezone: string): Date;
/**
 * Converte UTC para o horário local de exibição.
 */
export declare function fromUtcToZone(utcDate: Date | string, timezone: string): Date;
/**
 * Calcula diferença em minutos entre duas datas.
 */
export declare function minutesBetween(start: Date | string, end: Date | string): number;
/**
 * Calcula diferença em segundos entre duas datas.
 */
export declare function secondsBetween(start: Date | string, end: Date | string): number;
/**
 * Formata minutos em "Xh Ymin".
 * Ex: 461 → "7h 41min"
 */
export declare function formatMinutesAsHM(minutes: number): string;
/**
 * Formata minutos em "Xh Ymin Zs" (com segundos).
 */
export declare function formatMinutesAsHMS(totalSeconds: number): string;
/**
 * Retorna a data atual em UTC.
 * Usar sempre isso em vez de new Date() puro quando precisar
 * de uma referência consistente para auditoria.
 */
export declare function nowUtc(): Date;
/**
 * Retorna início do dia no timezone da empresa, em UTC.
 */
export declare function startOfDayInZone(date: Date, timezone: string): Date;
/**
 * Retorna fim do dia no timezone da empresa, em UTC.
 */
export declare function endOfDayInZone(date: Date, timezone: string): Date;
/**
 * Lista os dias de um mês no timezone da empresa.
 */
export declare function listDaysOfMonth(year: number, month: number, timezone?: string): string[];
/**
 * Re-export do format do date-fns pra ficar disponível.
 */
export { format };
//# sourceMappingURL=date.d.ts.map