'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service Worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Falha ao registrar SW:', err);
      });

    // Listener pra mensagens do SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_ATTENDANCE') {
        // O app vai processar via useOfflineSync
        window.dispatchEvent(new CustomEvent('kairos:sync-attendance'));
      }
    });
  }, []);

  return null;
}
