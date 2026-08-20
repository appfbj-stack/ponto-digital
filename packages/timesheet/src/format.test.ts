import { describe, it, expect } from 'vitest';
import { formatMinutesAsHM, formatMinutesAsClock, formatBalanceWithSign, formatTimeShort } from './format';

describe('formatMinutesAsHM', () => {
  it('zero → "0h"', () => {
    expect(formatMinutesAsHM(0)).toBe('0h');
  });
  it('apenas minutos', () => {
    expect(formatMinutesAsHM(45)).toBe('+45min');
  });
  it('apenas horas cheias', () => {
    expect(formatMinutesAsHM(60)).toBe('+1h');
  });
  it('horas e minutos positivos', () => {
    expect(formatMinutesAsHM(461)).toBe('+7h 41min');
  });
  it('negativos (débito)', () => {
    expect(formatMinutesAsHM(-45)).toBe('-45min');
    expect(formatMinutesAsHM(-90)).toBe('-1h 30min');
  });
});

describe('formatMinutesAsClock', () => {
  it('formato HH:MM', () => {
    expect(formatMinutesAsClock(0)).toBe('00:00');
    expect(formatMinutesAsClock(60)).toBe('01:00');
    expect(formatMinutesAsClock(90)).toBe('01:30');
    expect(formatMinutesAsClock(480)).toBe('08:00');
    expect(formatMinutesAsClock(540)).toBe('09:00');
  });
  it('aceita mais de 24h', () => {
    expect(formatMinutesAsClock(1500)).toBe('25:00');
  });
});

describe('formatBalanceWithSign', () => {
  it('positivo', () => {
    const r = formatBalanceWithSign(45);
    expect(r.isPositive).toBe(true);
    expect(r.isNeutral).toBe(false);
    expect(r.text).toBe('+45min');
  });
  it('neutro', () => {
    const r = formatBalanceWithSign(0);
    expect(r.isPositive).toBe(false);
    expect(r.isNeutral).toBe(true);
    expect(r.text).toBe('0h');
  });
  it('negativo', () => {
    const r = formatBalanceWithSign(-90);
    expect(r.isPositive).toBe(false);
    expect(r.isNeutral).toBe(false);
    expect(r.text).toBe('-1h 30min');
  });
});

describe('formatTimeShort', () => {
  it('formata ISO em HH:MM', () => {
    expect(formatTimeShort('2026-08-20T08:42:00Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});
