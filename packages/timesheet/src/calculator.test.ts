import { describe, it, expect } from 'vitest';
import { calculateDay, calculatePeriod } from './calculator';
import type { DaySchedule, WeeklySchedule, PunchRecord } from './types';

describe('calculateDay', () => {
  // Jornada padrão: 08-12, 13-17 = 8h
  const standardSchedule: DaySchedule = {
    entry: '08:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    exit: '17:00',
  };

  it('folga (sem jornada) → status REST_DAY', () => {
    const result = calculateDay({
      date: new Date('2026-08-22'), // sábado
      schedule: null,
      punches: [],
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.status).toBe('REST_DAY');
    expect(result.workedMinutes).toBe(0);
    expect(result.expectedMinutes).toBe(0);
    expect(result.balanceMinutes).toBe(0);
  });

  it('falta (jornada definida, sem punches) → status ABSENT', () => {
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches: [],
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.status).toBe('ABSENT');
    expect(result.workedMinutes).toBe(0);
    expect(result.expectedMinutes).toBe(480); // 8h
    expect(result.balanceMinutes).toBe(-480);
  });

  it('dia normal completo (entrou 08:00, saiu 17:00) → 8h', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:00:00' },
      { type: 'BREAK_START', timestamp: '2026-08-20T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-20T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T17:00:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.status).toBe('WORKED');
    expect(result.workedMinutes).toBe(480);
    expect(result.expectedMinutes).toBe(480);
    expect(result.balanceMinutes).toBe(0);
    expect(result.lateMinutes).toBe(0);
    expect(result.earlyExitMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
  });

  it('atraso de 15 min (entrou 08:15, tolerância 10) → late 5min', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:15:00' },
      { type: 'BREAK_START', timestamp: '2026-08-20T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-20T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T17:00:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.lateMinutes).toBe(5);
    expect(result.workedMinutes).toBe(475); // 15min a menos
  });

  it('atraso dentro da tolerância (entrou 08:05, tolerância 10) → late 0', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:05:00' },
      { type: 'BREAK_START', timestamp: '2026-08-20T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-20T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T17:00:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.lateMinutes).toBe(0);
  });

  it('hora extra (entrou 08:00, saiu 18:00) → overtime 60min', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:00:00' },
      { type: 'BREAK_START', timestamp: '2026-08-20T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-20T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T18:00:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.overtimeMinutes).toBe(60);
    expect(result.workedMinutes).toBe(540);
    expect(result.balanceMinutes).toBe(60);
  });

  it('saída antecipada (saiu 16:50, tolerância 10) → early 0', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:00:00' },
      { type: 'BREAK_START', timestamp: '2026-08-20T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-20T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T16:50:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.earlyExitMinutes).toBe(0);
  });

  it('saída antecipada (saiu 16:30, tolerância 10) → early 20', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:00:00' },
      { type: 'BREAK_START', timestamp: '2026-08-20T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-20T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T16:30:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.earlyExitMinutes).toBe(20);
  });

  it('parcial (apenas entrada e saída, sem intervalo)', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T11:00:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    });
    expect(result.workedMinutes).toBe(180);
    expect(result.earlyExitMinutes).toBe(360); // saiu 11, esperado 17 = 6h
    expect(result.status).toBe('PARTIAL');
  });

  it('feriado com punches → status HOLIDAY', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-20T08:00:00' },
      { type: 'EXIT', timestamp: '2026-08-20T17:00:00' },
    ];
    const result = calculateDay({
      date: new Date('2026-08-20'),
      schedule: standardSchedule,
      punches,
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
      isHoliday: true,
    });
    expect(result.status).toBe('HOLIDAY');
  });
});

describe('calculatePeriod', () => {
  const weeklySchedule: WeeklySchedule = {
    monday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
    tuesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
    wednesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
    thursday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
    friday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
    saturday: null,
    sunday: null,
  };

  it('mês de agosto 2026 (21 dias úteis)', () => {
    // Funcionário trabalhou segunda a sexta, sem falta
    const punches: PunchRecord[] = [];
    // Gera punches para todos os dias úteis de agosto/2026
    const workdays = [
      { day: 3, type: 'normal' }, // seg
      { day: 4, type: 'normal' },
      { day: 5, type: 'normal' },
      { day: 6, type: 'normal' },
      { day: 7, type: 'normal' },
      { day: 10, type: 'normal' },
      { day: 11, type: 'normal' },
      { day: 12, type: 'normal' },
      { day: 13, type: 'normal' },
      { day: 14, type: 'normal' },
      { day: 17, type: 'normal' },
      { day: 18, type: 'normal' },
      { day: 19, type: 'normal' },
      { day: 20, type: 'normal' },
      { day: 21, type: 'normal' },
      { day: 24, type: 'normal' },
      { day: 25, type: 'normal' },
      { day: 26, type: 'normal' },
      { day: 27, type: 'normal' },
      { day: 28, type: 'normal' },
      { day: 31, type: 'normal' },
    ];
    for (const wd of workdays) {
      const day = String(wd.day).padStart(2, '0');
      punches.push(
        { type: 'ENTRY', timestamp: `2026-08-${day}T08:00:00` },
        { type: 'BREAK_START', timestamp: `2026-08-${day}T12:00:00` },
        { type: 'BREAK_END', timestamp: `2026-08-${day}T13:00:00` },
        { type: 'EXIT', timestamp: `2026-08-${day}T17:00:00` },
      );
    }

    const result = calculatePeriod(
      new Date('2026-08-01'),
      new Date('2026-08-31'),
      weeklySchedule,
      punches,
      { entryToleranceMinutes: 10, exitToleranceMinutes: 10 },
    );

    // Esperado: 21 dias × 8h = 168h = 10080min
    expect(result.totals.expectedMinutes).toBe(10080);
    expect(result.totals.workedMinutes).toBe(10080);
    expect(result.totals.balanceMinutes).toBe(0);
    expect(result.totals.daysWorked).toBe(21);
    expect(result.totals.daysAbsent).toBe(0);
    expect(result.totals.daysRest).toBe(10); // 8 sábados + 2 domingos (ou similar)
  });

  it('saldo positivo com hora extra', () => {
    const punches: PunchRecord[] = [
      { type: 'ENTRY', timestamp: '2026-08-03T08:00:00' },
      { type: 'BREAK_START', timestamp: '2026-08-03T12:00:00' },
      { type: 'BREAK_END', timestamp: '2026-08-03T13:00:00' },
      { type: 'EXIT', timestamp: '2026-08-03T18:00:00' }, // 1h extra
    ];

    const result = calculatePeriod(
      new Date('2026-08-03'),
      new Date('2026-08-03'),
      weeklySchedule,
      punches,
      { entryToleranceMinutes: 10, exitToleranceMinutes: 10 },
    );

    expect(result.totals.overtimeMinutes).toBe(60);
    expect(result.totals.balanceMinutes).toBe(60);
  });

  it('saldo negativo com falta', () => {
    const result = calculatePeriod(
      new Date('2026-08-03'),
      new Date('2026-08-03'),
      weeklySchedule,
      [], // sem punches
      { entryToleranceMinutes: 10, exitToleranceMinutes: 10 },
    );

    expect(result.totals.workedMinutes).toBe(0);
    expect(result.totals.expectedMinutes).toBe(480);
    expect(result.totals.balanceMinutes).toBe(-480);
    expect(result.totals.daysAbsent).toBe(1);
  });

  it('mês inteiro faltou → daysAbsent = dias úteis', () => {
    const result = calculatePeriod(
      new Date('2026-08-01'),
      new Date('2026-08-31'),
      weeklySchedule,
      [],
      { entryToleranceMinutes: 10, exitToleranceMinutes: 10 },
    );

    expect(result.totals.daysAbsent).toBe(21);
    expect(result.totals.daysWorked).toBe(0);
    expect(result.totals.daysRest).toBe(10);
  });
});
