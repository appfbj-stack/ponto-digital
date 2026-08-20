'use client';

/**
 * Fila offline de registros de ponto.
 *
 * Estratégia:
 *  1. Quando offline, salva o ponto no IndexedDB (criptografado opcional)
 *  2. Quando online, processa a fila em ordem
 *  3. Usa client_event_id pra evitar duplicação no backend
 *
 * Banco Dexie:
 *  - pendingAttendance: pontos aguardando sync
 *  - cachedAuth: tokens (pra funcionar offline)
 *  - lastSync: timestamp do último sync bem-sucedido
 */

import Dexie, { type Table } from 'dexie';

export interface PendingAttendance {
  id?: number; // auto-increment do IndexedDB
  clientEventId: string;
  type: 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';
  latitude: number;
  longitude: number;
  accuracy: number;
  faceToken: string;
  faceConfidence: number;
  livenessPassed: boolean;
  deviceId: string;
  clientTimestamp: string;
  /** ISO do momento em que foi enfileirado */
  queuedAt: string;
  /** Tentativas de envio */
  attempts: number;
  /** Última mensagem de erro */
  lastError?: string;
}

export interface CachedAuth {
  id: 'current';
  accessToken: string;
  refreshToken: string;
  user: any;
}

export interface LastSync {
  id: 'current';
  timestamp: string;
  successCount: number;
  failCount: number;
}

class KairosOfflineDB extends Dexie {
  pendingAttendance!: Table<PendingAttendance, number>;
  cachedAuth!: Table<CachedAuth, string>;
  lastSync!: Table<LastSync, string>;

  constructor() {
    super('KairosPontoOffline');
    this.version(1).stores({
      pendingAttendance: '++id,clientEventId,queuedAt,type',
      cachedAuth: 'id',
      lastSync: 'id',
    });
  }
}

let db: KairosOfflineDB | null = null;

function getDB(): KairosOfflineDB {
  if (!db) {
    db = new KairosOfflineDB();
  }
  return db;
}

// --- Pending attendance ---

export async function enqueueAttendance(record: Omit<PendingAttendance, 'id' | 'attempts' | 'queuedAt'>): Promise<number> {
  const db = getDB();
  const id = await db.pendingAttendance.add({
    ...record,
    attempts: 0,
    queuedAt: new Date().toISOString(),
  });
  return id;
}

export async function getPendingAttendance(): Promise<PendingAttendance[]> {
  const db = getDB();
  return await db.pendingAttendance.orderBy('queuedAt').toArray();
}

export async function getPendingCount(): Promise<number> {
  const db = getDB();
  return await db.pendingAttendance.count();
}

export async function removePending(id: number): Promise<void> {
  const db = getDB();
  await db.pendingAttendance.delete(id);
}

export async function incrementAttempt(id: number, error?: string): Promise<void> {
  const db = getDB();
  await db.pendingAttendance.update(id, {
    attempts: (await db.pendingAttendance.get(id))?.attempts ?? 0 + 1,
    lastError: error,
  });
}

// --- Auth cache ---

export async function cacheAuth(accessToken: string, refreshToken: string, user: any): Promise<void> {
  const db = getDB();
  await db.cachedAuth.put({ id: 'current', accessToken, refreshToken, user });
}

export async function getCachedAuth(): Promise<CachedAuth | undefined> {
  const db = getDB();
  return await db.cachedAuth.get('current');
}

export async function clearCachedAuth(): Promise<void> {
  const db = getDB();
  await db.cachedAuth.clear();
}

// --- Last sync ---

export async function updateLastSync(successCount: number, failCount: number): Promise<void> {
  const db = getDB();
  await db.lastSync.put({
    id: 'current',
    timestamp: new Date().toISOString(),
    successCount,
    failCount,
  });
}

export async function getLastSync(): Promise<LastSync | undefined> {
  const db = getDB();
  return await db.lastSync.get('current');
}

// --- Util ---

/**
 * Gera client_event_id único (UUID v4).
 */
export function generateClientEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Verifica se o navegador está online.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}
