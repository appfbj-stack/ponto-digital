'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AttendanceRecord {
  id: string;
  employee: { id: string; name: string; cpf: string };
  type: 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';
  status: string;
  timestamp: string;
  inGeofence: boolean;
  faceValidated: boolean;
  location?: { id: string; name: string };
}

const TYPE_LABELS: Record<string, string> = {
  ENTRY: 'Entrada',
  BREAK_START: 'Início Intervalo',
  BREAK_END: 'Retorno Intervalo',
  EXIT: 'Saída',
  OVERTIME: 'Hora Extra',
};

const TYPE_COLORS: Record<string, string> = {
  ENTRY: 'bg-blue-100 text-blue-800',
  BREAK_START: 'bg-yellow-100 text-yellow-800',
  BREAK_END: 'bg-green-100 text-green-800',
  EXIT: 'bg-purple-100 text-purple-800',
  OVERTIME: 'bg-orange-100 text-orange-800',
};

export default function RegistrosPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    const start = new Date(`${dateFilter}T00:00:00`);
    const end = new Date(`${dateFilter}T23:59:59`);
    const params = new URLSearchParams({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    if (typeFilter) params.append('type', typeFilter);

    try {
      const res = await fetch(`${API_URL}/api/attendance/company?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [dateFilter, typeFilter]);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    load();
  }, [router, load]);

  // Auto-refresh a cada 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  return (
    <main className="container py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">Registros de Ponto</h1>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`rounded-md px-3 py-1 text-xs ${
            autoRefresh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {autoRefresh ? '🟢 Auto-refresh ON' : '⚪ Pausado'}
        </button>
      </header>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-md border border-input px-3 py-2 text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-input px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-accent"
        >
          🔄 Atualizar
        </button>
        <a
          href={`${API_URL}/api/reports/attendance-log/excel?startDate=${dateFilter}&endDate=${dateFilter}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-accent"
        >
          📥 Exportar Excel
        </a>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : records.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhum registro para esta data.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="p-3 text-left">Horário</th>
                <th className="p-3 text-left">Funcionário</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-center">Local</th>
                <th className="p-3 text-center">Geofence</th>
                <th className="p-3 text-center">Face</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">
                    {new Date(r.timestamp).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{r.employee.name}</p>
                    <p className="text-xs text-gray-500">{r.employee.cpf}</p>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${TYPE_COLORS[r.type]}`}>
                      {TYPE_LABELS[r.type]}
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs">{r.location?.name || '—'}</td>
                  <td className="p-3 text-center">
                    {r.inGeofence ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">⚠</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {r.faceValidated ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        {records.length} registro(s) • Atualizado às {new Date().toLocaleTimeString('pt-BR')}
      </p>
    </main>
  );
}
