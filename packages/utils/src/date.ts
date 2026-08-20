import { format, parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data no timezone da empresa.
 * Padrão BR: "20/08/2026 08:42"
 */
export function formatDateTimeInZone(date: Date | string, timezone = 'America/Sao_Paulo'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatTz(d, "dd/MM/yyyy HH:mm:ss", { timeZone: timezone, locale: ptBR });
}

/**
 * Formata data curta no timezone da empresa.
 */
export function formatDateInZone(date: Date | string, timezone = 'America/Sao_Paulo'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatTz(d, 'dd/MM/yyyy', { timeZone: timezone, locale: ptBR });
}

/**
 * Formata apenas hora no timezone da empresa.
 */
export function formatTimeInZone(date: Date | string, timezone = 'America/Sao_Paulo'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatTz(d, 'HH:mm:ss', { timeZone: timezone, locale: ptBR });
}

/**
 * Converte data local (no timezone da empresa) para UTC.
 * Use antes de salvar no banco.
 */
export function toUtcFromZone(localDate: Date | string, timezone: string): Date {
  const d = typeof localDate === 'string' ? parseISO(localDate) : localDate;
  return fromZonedTime(d, timezone);
}

/**
 * Converte UTC para o horário local de exibição.
 */
export function fromUtcToZone(utcDate: Date | string, timezone: string): Date {
  const d = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return toZonedTime(d, timezone);
}

/**
 * Calcula diferença em minutos entre duas datas.
 */
export function minutesBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return differenceInMinutes(e, s);
}

/**
 * Calcula diferença em segundos entre duas datas.
 */
export function secondsBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return differenceInSeconds(e, s);
}

/**
 * Formata minutos em "Xh Ymin".
 * Ex: 461 → "7h 41min"
 */
export function formatMinutesAsHM(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = minutes < 0 ? '-' : '';
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

/**
 * Formata minutos em "Xh Ymin Zs" (com segundos).
 */
export function formatMinutesAsHMS(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? '-' : '';
  if (h === 0 && m === 0) return `${sign}${s}s`;
  if (h === 0) return `${sign}${m}min ${s}s`;
  return `${sign}${h}h ${m}min ${s}s`;
}

/**
 * Retorna a data atual em UTC.
 * Usar sempre isso em vez de new Date() puro quando precisar
 * de uma referência consistente para auditoria.
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Retorna início do dia no timezone da empresa, em UTC.
 */
export function startOfDayInZone(date: Date, timezone: string): Date {
  const local = fromUtcToZone(date, timezone);
  local.setHours(0, 0, 0, 0);
  return toUtcFromZone(local, timezone);
}

/**
 * Retorna fim do dia no timezone da empresa, em UTC.
 */
export function endOfDayInZone(date: Date, timezone: string): Date {
  const local = fromUtcToZone(date, timezone);
  local.setHours(23, 59, 59, 999);
  return toUtcFromZone(local, timezone);
}

/**
 * Lista os dias de um mês no timezone da empresa.
 */
export function listDaysOfMonth(year: number, month: number, timezone = 'America/Sao_Paulo'): string[] {
  const days: string[] = [];
  const totalDays = new Date(year, month, 0).getDate();
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    days.push(formatDateInZone(date, timezone));
  }
  return days;
}

/**
 * Re-export do format do date-fns pra ficar disponível.
 */
export { format };
