'use client';

import { useOfflineSync } from '@/lib/use-offline-sync';

export function OfflineIndicator() {
  const [state, actions] = useOfflineSync();

  if (state.online && state.pendingCount === 0) {
    return null; // Não mostra nada se tudo OK
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-xs font-medium ${
        state.online
          ? state.pendingCount > 0
            ? 'bg-blue-500 text-white'
            : 'bg-green-500 text-white'
          : 'bg-orange-500 text-white'
      }`}
    >
      {state.syncing ? (
        <>⏳ Sincronizando {state.pendingCount} ponto(s)...</>
      ) : !state.online ? (
        <>📡 Offline — {state.pendingCount} ponto(s) na fila</>
      ) : state.pendingCount > 0 ? (
        <>🔄 {state.pendingCount} ponto(s) aguardando sync</>
      ) : null}

      {!state.syncing && state.pendingCount > 0 && state.online && (
        <button
          onClick={() => actions.syncNow()}
          className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30"
        >
          Sincronizar agora
        </button>
      )}
    </div>
  );
}
