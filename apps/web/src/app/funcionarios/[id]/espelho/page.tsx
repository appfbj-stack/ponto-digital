'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DayResult {
  date: string;
  expectedMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  balanceMinutes: number;
  status: string;
}

interface PeriodResult {
  startDate: string;
  endDate: string;
  days: DayResult[];
  totals: {
    expectedMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    debitMinutes: number;
    balanceMinutes: number;
    daysWorked: number;
    daysAbsent: number;
    daysRest: number;
  };
}

interface TimesheetResponse {
  employee: { id: string; name: string };
  period: PeriodResult;
  bankHours: { balanceMinutes: number };
  schedule: { id: string; name: string } | null;
}

function formatHM(min: number): string {
  if (min === 0) return '0h';
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

function formatClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function EspelhoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<TimesheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    setLoading(true);
    fetch(`${API_URL}/api/timesheet/employee/${id}?month=${monthStr}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, month, router]);

  return (
    <main className="container py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-600">
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold">Espelho de Ponto</h1>
          {data && <p className="text-sm text-gray-600">{data.employee.name}</p>}
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Imprimir
        </button>
      </header>

      {/* Navegação de mês */}
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
        <p>Carregando...</p>
      ) : data ? (
        <>
          {/* Cards de totais */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-600">Saldo Acumulado</p>
              <p
                className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                  data.bankHours.balanceMinutes > 0
                    ? 'text-green-600'
                    : data.bankHours.balanceMinutes < 0
                      ? 'text-red-600'
                      : 'text-gray-700'
                }`}
              >
                {formatHM(data.bankHours.balanceMinutes)}
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-600">Previsto (mês)</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                {formatClock(data.period.totals.expectedMinutes)}
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-600">Trabalhado (mês)</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                {formatClock(data.period.totals.workedMinutes)}
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs text-gray-600">Saldo (mês)</p>
              <p
                className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                  data.period.totals.balanceMinutes > 0
                    ? 'text-green-600'
                    : data.period.totals.balanceMinutes < 0
                      ? 'text-red-600'
                      : 'text-gray-700'
                }`}
              >
                {formatHM(data.period.totals.balanceMinutes)}
              </p>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-right">Previsto</th>
                  <th className="p-3 text-right">Trabalhado</th>
                  <th className="p-3 text-right">Atraso</th>
                  <th className="p-3 text-right">H. Extra</th>
                  <th className="p-3 text-right">Saldo</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.period.days
                  .filter((d) => d.status !== 'REST_DAY')
                  .map((day) => (
                    <tr key={day.date} className="border-b hover:bg-gray-50">
                      <td className="p-3">{formatDateBR(day.date)}</td>
                      <td className="p-3 text-right font-mono">
                        {day.expectedMinutes > 0 ? formatClock(day.expectedMinutes) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {day.workedMinutes > 0 ? formatClock(day.workedMinutes) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-red-600">
                        {day.lateMinutes > 0 ? `${day.lateMinutes}min` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-600">
                        {day.overtimeMinutes > 0 ? `${day.overtimeMinutes}min` : '—'}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-semibold ${
                          day.balanceMinutes > 0
                            ? 'text-green-600'
                            : day.balanceMinutes < 0
                              ? 'text-red-600'
                              : ''
                        }`}
                      >
                        {day.balanceMinutes !== 0 ? formatHM(day.balanceMinutes) : '—'}
                      </td>
                      <td className="p-3 text-center text-xs">
                        <span
                          className={`inline-block rounded px-2 py-0.5 ${
                            day.status === 'WORKED'
                              ? 'bg-green-100 text-green-800'
                              : day.status === 'PARTIAL'
                                ? 'bg-yellow-100 text-yellow-800'
                                : day.status === 'ABSENT'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {day.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="border-t-2 bg-gray-50 font-semibold">
                <tr>
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-right font-mono">
                    {formatClock(data.period.totals.expectedMinutes)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatClock(data.period.totals.workedMinutes)}
                  </td>
                  <td className="p-3 text-right font-mono text-red-600">
                    {data.period.totals.debitMinutes}min
                  </td>
                  <td className="p-3 text-right font-mono text-blue-600">
                    {data.period.totals.overtimeMinutes}min
                  </td>
                  <td
                    className={`p-3 text-right font-mono ${
                      data.period.totals.balanceMinutes > 0
                        ? 'text-green-600'
                        : data.period.totals.balanceMinutes < 0
                          ? 'text-red-600'
                          : ''
                    }`}
                  >
                    {formatHM(data.period.totals.balanceMinutes)}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {data.period.totals.daysWorked}/{data.period.totals.daysWorked + data.period.totals.daysAbsent}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : (
        <p>Sem dados para o período.</p>
      )}
    </main>
  );
}
