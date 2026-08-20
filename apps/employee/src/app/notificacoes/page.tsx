'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  MISSED_PUNCH: '⏰',
  LATE: '⚠️',
  CORRECTION_APPROVED: '✅',
  CORRECTION_REJECTED: '❌',
  BANK_HOURS_UPDATED: '📊',
  DEVICE_REVOKED: '📱',
  GENERIC: '🔔',
};

const TYPE_COLORS: Record<string, string> = {
  CORRECTION_APPROVED: 'border-l-4 border-green-500',
  CORRECTION_REJECTED: 'border-l-4 border-red-500',
  LATE: 'border-l-4 border-yellow-500',
  MISSED_PUNCH: 'border-l-4 border-orange-500',
  BANK_HOURS_UPDATED: 'border-l-4 border-blue-500',
};

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;
    setLoading(true);
    try {
      const url = filter ? `${API_URL}/api/notifications/my?unread=true` : `${API_URL}/api/notifications/my`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) { router.push('/login'); return; }
    load(token);
  }, [router, load]);

  async function markRead(id: string) {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      load(token);
    } catch {}
  }

  async function markAllRead() {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/notifications/my/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      load(token);
    } catch {}
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => router.back()} className="text-sm">
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Notificações</h1>
        <button
          onClick={markAllRead}
          className="text-xs text-blue-600"
        >
          Marcar lidas
        </button>
      </header>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-md px-3 py-1 text-sm ${
            !filter ? 'bg-primary text-primary-foreground' : 'border bg-white'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`rounded-md px-3 py-1 text-sm ${
            filter ? 'bg-primary text-primary-foreground' : 'border bg-white'
          }`}
        >
          Não lidas
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Carregando...</p>
      ) : notifications.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma notificação.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`block w-full rounded-lg border bg-white p-3 text-left ${
                n.read ? 'opacity-60' : ''
              } ${TYPE_COLORS[n.type] || ''}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{n.title}</p>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{n.body}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(n.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
