import { describe, it, expect } from 'vitest';
import { formatMinutesAsHM, formatMinutesAsHMS, minutesBetween } from './date';
import { distanceInMeters, isWithinRadius, isValidLatLng } from './geo';
import { encrypt, decrypt, generateId, generateUuid, maskCpf, maskEmail } from './crypto';

describe('date helpers', () => {
  it('formatMinutesAsHM formata corretamente', () => {
    expect(formatMinutesAsHM(0)).toBe('0min');
    expect(formatMinutesAsHM(60)).toBe('1h');
    expect(formatMinutesAsHM(45)).toBe('45min');
    expect(formatMinutesAsHM(461)).toBe('7h 41min');
    expect(formatMinutesAsHM(-45)).toBe('-45min');
  });

  it('formatMinutesAsHMS inclui segundos', () => {
    expect(formatMinutesAsHMS(3661)).toBe('1h 1min 1s');
    expect(formatMinutesAsHMS(45)).toBe('45s');
  });

  it('minutesBetween calcula diferença', () => {
    const a = new Date('2026-08-20T08:00:00Z');
    const b = new Date('2026-08-20T17:00:00Z');
    expect(minutesBetween(a, b)).toBe(540);
  });
});

describe('geo helpers', () => {
  it('distanceInMeters calcula distância entre dois pontos próximos', () => {
    const paulista = { latitude: -23.561414, longitude: -46.655881 };
    const ibirapuera = { latitude: -23.587416, longitude: -46.657634 };
    const dist = distanceInMeters(paulista, ibirapuera);
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(3500);
  });

  it('isWithinRadius retorna true dentro do raio', () => {
    const center = { latitude: -23.561414, longitude: -46.655881 };
    const near = { latitude: -23.5615, longitude: -46.6559 };
    expect(isWithinRadius(near, center, 100)).toBe(true);
  });

  it('isWithinRadius retorna false fora do raio', () => {
    const center = { latitude: -23.561414, longitude: -46.655881 };
    const far = { latitude: -23.650000, longitude: -46.700000 };
    expect(isWithinRadius(far, center, 100)).toBe(false);
  });

  it('isValidLatLng valida coordenadas', () => {
    expect(isValidLatLng(-23.5, -46.6)).toBe(true);
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, 181)).toBe(false);
    expect(isValidLatLng(NaN, 0)).toBe(false);
  });
});

describe('crypto helpers', () => {
  const TEST_KEY = 'a'.repeat(43) + '==';

  it('encrypt e decrypt são reversíveis', () => {
    const plaintext = 'dado sensível de teste';
    const ciphertext = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(ciphertext, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypt gera ciphertexts diferentes para o mesmo input (iv random)', () => {
    const plaintext = 'mesmo input';
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('generateId gera IDs únicos', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('generateUuid gera UUIDs válidos', () => {
    const uuid = generateUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('maskCpf mascara CPF corretamente', () => {
    expect(maskCpf('123.456.789-00')).toBe('***.***.789-**');
    expect(maskCpf('12345678900')).toBe('***.***.789-**');
  });

  it('maskEmail mascara email corretamente', () => {
    expect(maskEmail('joao.silva@empresa.com')).toBe('j***@empresa.com');
  });
});
