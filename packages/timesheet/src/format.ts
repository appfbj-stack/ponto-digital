/**
 * Formatadores para horas/minutos.
 */

const MS_PER_MINUTE = 60_000;

/**
 * Formata minutos em "Xh Ymin".
 * Aceita minutos negativos.
 */
export function formatMinutesAsHM(minutes: number): string {
  if (minutes === 0) return '0h';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = minutes < 0 ? '-' : '+';
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

/**
 * Formata em "HH:MM" (sempre positivo, usado pra horas trabalhadas).
 */
export function formatMinutesAsClock(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formata saldo com indicador visual (verde se positivo, vermelho se negativo).
 */
export function formatBalanceWithSign(minutes: number): {
  text: string;
  isPositive: boolean;
  isNeutral: boolean;
} {
  const isPositive = minutes > 0;
  const isNeutral = minutes === 0;
  return {
    text: formatMinutesAsHM(minutes),
    isPositive,
    isNeutral,
  };
}

/**
 * Formata um timestamp em "HH:MM" no timezone local.
 */
export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
