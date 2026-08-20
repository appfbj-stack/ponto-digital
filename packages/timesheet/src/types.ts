/**
 * Tipos do motor de cálculo de horas.
 */

export type AttendanceType = 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';

/**
 * Horário previsto de um dia da jornada.
 * HH:MM em string ("08:00", "17:00").
 */
export interface DaySchedule {
  entry?: string;
  breakStart?: string;
  breakEnd?: string;
  exit?: string;
}

/**
 * Jornada semanal completa.
 * Cada chave é o dia da semana em inglês.
 */
export type WeeklySchedule = {
  monday?: DaySchedule | null;
  tuesday?: DaySchedule | null;
  wednesday?: DaySchedule | null;
  thursday?: DaySchedule | null;
  friday?: DaySchedule | null;
  saturday?: DaySchedule | null;
  sunday?: DaySchedule | null;
};

/**
 * Registro de ponto (entrada do banco).
 */
export interface PunchRecord {
  type: AttendanceType;
  /** ISO 8601 string */
  timestamp: string;
}

/**
 * Resultado do cálculo de UM dia.
 */
export interface DailyResult {
  date: string; // YYYY-MM-DD
  expectedMinutes: number; // 0 se folga
  workedMinutes: number; // 0 se falta
  breakMinutes: number; // tempo de intervalo
  lateMinutes: number; // atraso na entrada
  earlyExitMinutes: number; // saída antecipada
  overtimeMinutes: number; // horas extras
  debitMinutes: number; // débitos (atraso + saída antecipada)
  balanceMinutes: number; // worked - expected (positivo = crédito, negativo = débito)
  status: 'WORKED' | 'ABSENT' | 'REST_DAY' | 'HOLIDAY' | 'PARTIAL';
  punches: PunchRecord[];
}

/**
 * Resultado do cálculo de um PERÍODO (mês, semana, etc).
 */
export interface PeriodResult {
  startDate: string;
  endDate: string;
  days: DailyResult[];
  totals: {
    expectedMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    debitMinutes: number;
    balanceMinutes: number;
    daysWorked: number;
    daysAbsent: number;
    daysRest: number;
  };
}
