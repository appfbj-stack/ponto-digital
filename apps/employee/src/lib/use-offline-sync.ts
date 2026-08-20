'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  enqueueAttendance,
  getPendingAttendance,
  removePending,
  getPendingCount,
  incrementAttempt,
  updateLastSync,
  isOnline,
  type PendingAttendance,
} from './offline-queue';

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';
const MAX_ATTEMPTS = 5;

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'error';

export interface OfflineSyncState {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface OfflineSyncActions {
  /** Enfileira um ponto pra envio posterior */
  enqueue: (record: Omit<PendingAttendance, 'id' | 'attempts' | 'queuedAt'>) => Promise<number>;
  /** Tenta sincronizar a fila agora */
  syncNow: () => Promise<SyncStatus>;
  /** Limpa erros (reseta tentativas) */
  resetFailures: () => Promise<void>;
}

/**
 * Hook que gerencia fila offline e sincronização automática.
 *
 * - Detecta online/offline
 * - Tenta sync automático quando volta online
 * - Expõe funções pra enfileirar e forçar sync
 */
export function useOfflineSync(): [OfflineSyncState, OfflineSyncActions] {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Setup inicial e listeners
  useEffect(() => {
    setOnline(isOnline());
    refreshPendingCount();

    const handleOnline = () => {
      setOnline(true);
      // Auto-sync quando volta online
      syncNow();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPendingCount]);

  const syncNow = useCallback(async (): Promise<SyncStatus> => {
    if (!isOnline()) {
      return 'error';
    }

    setSyncing(true);
    setLastError(null);

    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      setSyncing(false);
      setLastError('Sem token de autenticação');
      return 'error';
    }

    const pending = await getPendingAttendance();
    if (pending.length === 0) {
      setSyncing(false);
      setLastSyncAt(new Date().toISOString());
      return 'success';
    }

    let success = 0;
    let fail = 0;

    for (const item of pending) {
      if (item.id === undefined) continue;
      if (item.attempts >= MAX_ATTEMPTS) {
        fail++;
        continue;
      }

      try {
        const res = await fetch(`${API_URL}/api/attendance/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: item.type,
            latitude: item.latitude,
            longitude: item.longitude,
            accuracy: item.accuracy,
            faceToken: item.faceToken,
            faceConfidence: item.faceConfidence,
            livenessPassed: item.livenessPassed,
            deviceId: item.deviceId,
            clientTimestamp: item.clientTimestamp,
            clientEventId: item.clientEventId,
          }),
        });

        if (res.ok) {
          // Sucesso — remove da fila
          await removePending(item.id);
          success++;
        } else {
          // Erro 4xx (exceto 401) — descarta (não vai conseguir)
          if (res.status >= 400 && res.status < 500 && res.status !== 401) {
            await removePending(item.id);
            fail++;
          } else {
            // 5xx ou 401 — tenta de novo depois
            await incrementAttempt(item.id, `HTTP ${res.status}`);
            fail++;
          }
        }
      } catch (err) {
        // Erro de rede — tenta de novo
        await incrementAttempt(item.id, err instanceof Error ? err.message : 'network');
        fail++;
      }
    }

    await updateLastSync(success, fail);
    setLastSyncAt(new Date().toISOString());
    setSyncing(false);
    await refreshPendingCount();

    if (fail === 0) return 'success';
    if (success === 0) {
      setLastError('Falha ao sincronizar todos os pontos pendentes');
      return 'error';
    }
    return 'partial';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPendingCount]);

  // Auto-sync periódico (a cada 30s quando online)
  useEffect(() => {
    if (!online) return;
    const interval = setInterval(() => {
      if (pendingCount > 0 && !syncing) {
        syncNow();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [online, pendingCount, syncing, syncNow]);

  const enqueue = useCallback(
    async (record: Omit<PendingAttendance, 'id' | 'attempts' | 'queuedAt'>) => {
      const id = await enqueueAttendance(record);
      await refreshPendingCount();
      // Tenta sync imediato se online
      if (isOnline()) {
        syncNow();
      }
      return id;
    },
    [refreshPendingCount, syncNow],
  );

  const resetFailures = useCallback(async () => {
    // TODO: resetar attempts de todos
    await refreshPendingCount();
  }, [refreshPendingCount]);

  return [
    { online, pendingCount, syncing, lastSyncAt, lastError },
    { enqueue, syncNow, resetFailures },
  ];
}
