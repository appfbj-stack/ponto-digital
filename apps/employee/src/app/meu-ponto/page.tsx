'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

interface AttendanceRecord {
  id: string;
  type: 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';
  timestamp: string;
  inGeofence: boolean;
}

const TYPE_LABELS: Record<AttendanceRecord['type'], string> = {
  ENTRY: 'Entrada',
  BREAK_START: 'Intervalo',
  BREAK_END: 'Retorno',
  EXIT: 'Saída',
  OVERTIME: 'Hora extra',
};

export default function MeuPontoPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    async function load() {
      setLoading(true);
      const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
      const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

      try {
        const res = await fetch(
          `${API_URL}/api/attendance/my?startDate=${firstDay.toISOString()}&endDate=${lastDay.toISOString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setRecords(data);
        }
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [month, router]);

  // Agrupa por dia
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const day = new Date(r.timestamp).toLocaleDateString('pt-BR');
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }
  const days = Array.from(byDay.entries()).sort((a, b) => {
    const [ad, am, ay] = (a[0] ?? '').split('/').map(Number);
    const [bd, bm, by] = (b[0] ?? '').split('/').map(Number);
    return new Date(by ?? 0, (bm ?? 1) - 1, bd ?? 0).getTime() - new Date(ay ?? 0, (am ?? 1) - 1, ad ?? 0).getTime();
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => router.back()} className="text-sm">
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Meu Ponto</h1>
        <div className="w-12" />
      </header>

      <div className="mb-4 flex items-center justify-between rounded-lg border bg-white p-3">
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
          className="rounded-md p-2 hover:bg-accent"
        >
          ←
        </button>
        <span className="font-medium capitalize">
          {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
          className="rounded-md p-2 hover:bg-accent"
        >
          →
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Carregando...</p>
      ) : days.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum registro no mês.
        </p>
      ) : (
        <div className="space-y-2">
          {days.map(([day, recs]) => {
            const totalMinutes = calculateTotalMinutes(recs);
            return (
              <div key={day} className="rounded-lg border bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{day}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMinutes(totalMinutes)}
                  </p>
                </div>
                <ul className="space-y-1 text-sm">
                  {recs.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span className="text-muted-foreground">{TYPE_LABELS[r.type]}</span>
                      <span className="font-mono">
                        {new Date(r.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function calculateTotalMinutes(records: AttendanceRecord[]): number {
  // Encontra pares (entrada/saída) e soma
  let total = 0;
  let lastEntry: Date | null = null;
  let lastBreakStart: Date | null = null;

  for (const r of records) {
    const t = new Date(r.timestamp);
    if (r.type === 'ENTRY') lastEntry = t;
    if (r.type === 'BREAK_START' && lastEntry) {
      total += (t.getTime() - lastEntry.getTime()) / 60000;
      lastBreakStart = t;
      lastEntry = null;
    }
    if (r.type === 'BREAK_END') lastBreakStart = null;
    if (r.type === 'EXIT' && lastBreakStart) {
      total += (t.getTime() - lastBreakStart.getTime()) / 60000;
      lastBreakStart = null;
    } else if (r.type === 'EXIT' && lastEntry) {
      total += (t.getTime() - lastEntry.getTime()) / 60000;
      lastEntry = null;
    }
  }

  return Math.round(total);
}

function formatMinutes(min: number): string {
  if (min === 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
