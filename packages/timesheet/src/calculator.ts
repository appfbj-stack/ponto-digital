/**
 * Motor de cálculo de horas trabalhadas, extras, atrasos e banco de horas.
 *
 * Responsabilidades:
 *  - Receber registros de ponto (punches) + jornada semanal
 *  - Calcular horas trabalhadas, previstas, extras, débitos
 *  - Aplicar tolerância configurável
 *  - Detectar folgas, faltas, dias parciais
 *
 * NÃO depende de banco de dados ou framework — pura função.
 */

import type {
  AttendanceType,
  DaySchedule,
  DailyResult,
  PeriodResult,
  PunchRecord,
  WeeklySchedule,
} from './types';

const MS_PER_MINUTE = 60_000;

interface DailyConfig {
  date: Date;
  schedule: DaySchedule | null | undefined;
  punches: PunchRecord[];
  entryToleranceMinutes: number;
  exitToleranceMinutes: number;
  /** Se o dia é considerado feriado (não desconta falta) */
  isHoliday?: boolean;
}

/**
 * Calcula o resultado de UM dia.
 */
export function calculateDay(config: DailyConfig): DailyResult {
  const { date, schedule, punches, entryToleranceMinutes, exitToleranceMinutes, isHoliday } = config;
  const dateStr = formatDate(date);

  // Sem jornada → folga (ou dia não útil)
  if (!schedule || !schedule.entry || !schedule.exit) {
    return {
      date: dateStr,
      expectedMinutes: 0,
      workedMinutes: 0,
      breakMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      debitMinutes: 0,
      balanceMinutes: 0,
      status: 'REST_DAY',
      punches,
    };
  }

  // Calcula minutos esperados (descontando intervalo)
  const expectedMinutes = calculateExpectedMinutes(schedule);

  // Filtra punches do dia (timezone-aware seria ideal, mas simplificado)
  const dayPunches = punches.filter((p) => isSameDay(parseISO(p.timestamp), date));
  dayPunches.sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());

  // Sem punches → falta (a menos que seja feriado)
  if (dayPunches.length === 0) {
    return {
      date: dateStr,
      expectedMinutes,
      workedMinutes: 0,
      breakMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      debitMinutes: 0,
      balanceMinutes: -expectedMinutes,
      status: isHoliday ? 'HOLIDAY' : 'ABSENT',
      punches: [],
    };
  }

  // Calcula minutos trabalhados (entrada → saída, descontando intervalo)
  const { workedMinutes, breakMinutes } = calculateWorkedMinutes(dayPunches, schedule);

  // Calcula atraso na entrada
  const lateMinutes = calculateLateMinutes(dayPunches, schedule, entryToleranceMinutes);

  // Calcula saída antecipada
  const earlyExitMinutes = calculateEarlyExitMinutes(dayPunches, schedule, exitToleranceMinutes);

  // Calcula hora extra (acima do esperado)
  const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);

  // Débitos = atraso + saída antecipada
  const debitMinutes = lateMinutes + earlyExitMinutes;

  // Saldo do dia = worked - expected (mas HE vai pro saldo, não como débito)
  const balanceMinutes = workedMinutes - expectedMinutes;

  // Status
  let status: DailyResult['status'];
  if (workedMinutes === 0) status = 'ABSENT';
  else if (workedMinutes < expectedMinutes * 0.5) status = 'PARTIAL';
  else status = 'WORKED';

  return {
    date: dateStr,
    expectedMinutes,
    workedMinutes,
    breakMinutes,
    lateMinutes,
    earlyExitMinutes,
    overtimeMinutes,
    debitMinutes,
    balanceMinutes,
    status,
    punches: dayPunches,
  };
}

/**
 * Calcula o resultado de um PERÍODO (mês, etc).
 */
export function calculatePeriod(
  startDate: Date,
  endDate: Date,
  weeklySchedule: WeeklySchedule,
  punches: PunchRecord[],
  config: {
    entryToleranceMinutes: number;
    exitToleranceMinutes: number;
    holidays?: Set<string>; // YYYY-MM-DD
  },
): PeriodResult {
  const days: DailyResult[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dayKey = getDayKey(cursor);
    const schedule = weeklySchedule[dayKey];
    const dateStr = formatDate(cursor);
    const isHoliday = config.holidays?.has(dateStr) || false;

    const dayResult = calculateDay({
      date: new Date(cursor),
      schedule,
      punches,
      entryToleranceMinutes: config.entryToleranceMinutes,
      exitToleranceMinutes: config.exitToleranceMinutes,
      isHoliday,
    });

    days.push(dayResult);
    cursor.setDate(cursor.getDate() + 1);
  }

  // Totais
  const totals = days.reduce(
    (acc, day) => ({
      expectedMinutes: acc.expectedMinutes + day.expectedMinutes,
      workedMinutes: acc.workedMinutes + day.workedMinutes,
      overtimeMinutes: acc.overtimeMinutes + day.overtimeMinutes,
      debitMinutes: acc.debitMinutes + day.debitMinutes,
      balanceMinutes: acc.balanceMinutes + day.balanceMinutes,
      daysWorked: acc.daysWorked + (day.status === 'WORKED' || day.status === 'PARTIAL' ? 1 : 0),
      daysAbsent: acc.daysAbsent + (day.status === 'ABSENT' ? 1 : 0),
      daysRest: acc.daysRest + (day.status === 'REST_DAY' || day.status === 'HOLIDAY' ? 1 : 0),
    }),
    {
      expectedMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      debitMinutes: 0,
      balanceMinutes: 0,
      daysWorked: 0,
      daysAbsent: 0,
      daysRest: 0,
    },
  );

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    days,
    totals,
  };
}

// =====================================================================
// Helpers internos
// =====================================================================

/**
 * Minutos esperados de uma jornada (descontando intervalo).
 */
function calculateExpectedMinutes(schedule: DaySchedule): number {
  if (!schedule.entry || !schedule.exit) return 0;

  const entry = parseTime(schedule.entry);
  const exit = parseTime(schedule.exit);
  const total = diffMinutes(entry, exit);

  let breakMin = 0;
  if (schedule.breakStart && schedule.breakEnd) {
    breakMin = diffMinutes(parseTime(schedule.breakStart), parseTime(schedule.breakEnd));
  }

  return Math.max(0, total - breakMin);
}

/**
 * Minutos trabalhados e minutos de intervalo, baseado nos punches.
 */
function calculateWorkedMinutes(
  punches: PunchRecord[],
  schedule: DaySchedule,
): { workedMinutes: number; breakMinutes: number } {
  let workedMinutes = 0;
  let breakMinutes = 0;

  let lastEntry: Date | null = null;
  let lastBreakStart: Date | null = null;

  for (const punch of punches) {
    const t = parseISO(punch.timestamp);

    if (punch.type === 'ENTRY') {
      lastEntry = t;
    } else if (punch.type === 'BREAK_START' && lastEntry) {
      // Soma tempo antes do intervalo
      workedMinutes += diffMinutes(lastEntry, t);
      lastBreakStart = t;
      lastEntry = null;
    } else if (punch.type === 'BREAK_END') {
      lastEntry = t;
      lastBreakStart = null;
    } else if (punch.type === 'EXIT' && lastEntry) {
      workedMinutes += diffMinutes(lastEntry, t);
      lastEntry = null;
    } else if (punch.type === 'OVERTIME' && !lastEntry) {
      // Hora extra isolada (sem entrada normal) — conta como trabalhado
      // mas é registrada à parte
    }
  }

  // Se ficou com lastEntry aberto (não registrou saída), conta até agora
  if (lastEntry) {
    const now = new Date();
    if (now > lastEntry) {
      workedMinutes += diffMinutes(lastEntry, now);
    }
  }

  // Calcula intervalo real
  for (let i = 0; i < punches.length; i++) {
    const p = punches[i]!;
    if (p.type === 'BREAK_START' && i + 1 < punches.length) {
      const next = punches[i + 1]!;
      if (next.type === 'BREAK_END') {
        breakMinutes += diffMinutes(parseISO(p.timestamp), parseISO(next.timestamp));
      }
    }
  }

  return { workedMinutes: Math.max(0, workedMinutes), breakMinutes: Math.max(0, breakMinutes) };
}

/**
 * Atraso na entrada (em minutos).
 * Tolerância subtraída. Se entrou antes, é 0.
 */
function calculateLateMinutes(
  punches: PunchRecord[],
  schedule: DaySchedule,
  toleranceMinutes: number,
): number {
  if (!schedule.entry) return 0;

  const entryPunch = punches.find((p) => p.type === 'ENTRY');
  if (!entryPunch) return 0;

  const expected = parseTime(schedule.entry);
  const actual = parseISO(entryPunch.timestamp);
  const expectedToday = new Date(actual);
  expectedToday.setHours(expected.getHours(), expected.getMinutes(), 0, 0);

  const diff = diffMinutes(expectedToday, actual);
  return Math.max(0, diff - toleranceMinutes);
}

/**
 * Saída antecipada (em minutos).
 * Tolerância subtraída. Se saiu depois, é 0.
 */
function calculateEarlyExitMinutes(
  punches: PunchRecord[],
  schedule: DaySchedule,
  toleranceMinutes: number,
): number {
  if (!schedule.exit) return 0;

  const exitPunch = punches.find((p) => p.type === 'EXIT');
  if (!exitPunch) return 0;

  const expected = parseTime(schedule.exit);
  const actual = parseISO(exitPunch.timestamp);
  const expectedToday = new Date(actual);
  expectedToday.setHours(expected.getHours(), expected.getMinutes(), 0, 0);

  const diff = diffMinutes(actual, expectedToday);
  return Math.max(0, diff - toleranceMinutes);
}

// --- date helpers ---

function parseISO(s: string): Date {
  return new Date(s);
}

function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_MINUTE);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDayKey(date: Date): keyof WeeklySchedule {
  const keys: (keyof WeeklySchedule)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return keys[date.getDay()]!;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
