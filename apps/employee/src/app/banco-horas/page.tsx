'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

interface DayResult {
  date: string;
  expectedMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  balanceMinutes: number;
  status: 'WORKED' | 'ABSENT' | 'REST_DAY' | 'HOLIDAY' | 'PARTIAL';
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

const STATUS_LABELS: Record<DayResult['status'], string> = {
  WORKED: 'Trabalhado',
  PARTIAL: 'Parcial',
  ABSENT: 'Falta',
  REST_DAY: 'Folga',
  HOLIDAY: 'Feriado',
};

const STATUS_COLORS: Record<DayResult['status'], string> = {
  WORKED: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  ABSENT: 'bg-red-100 text-red-800',
  REST_DAY: 'bg-gray-100 text-gray-600',
  HOLIDAY: 'bg-blue-100 text-blue-800',
};

export default function BancoHorasPage() {
  const router = useRouter();
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
    fetch(`${API_URL}/api/timesheet/me?month=${monthStr}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month, router]);

  const balance = data?.bankHours.balanceMinutes ?? 0;
  const balancePositive = balance > 0;
  const balanceNeutral = balance === 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => router.back()} className="text-sm">
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Banco de Horas</h1>
        <div className="w-12" />
      </header>

      {/* Card de saldo */}
      <section
        className={`rounded-2xl border p-6 ${
          balanceNeutral
            ? 'bg-gray-50'
            : balancePositive
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
        }`}
      >
        <p className="text-xs uppercase tracking-wide text-gray-600">Saldo Acumulado</p>
        <p
          className={`mt-2 font-mono text-4xl font-bold tabular-nums ${
            balanceNeutral
              ? 'text-gray-700'
              : balancePositive
                ? 'text-green-700'
                : 'text-red-700'
          }`}
        >
          {formatHM(balance)}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {balancePositive
            ? 'Você tem horas a favor'
            : balanceNeutral
              ? 'Saldo zerado'
              : 'Você tem horas a quitar'}
        </p>
        {data?.schedule && (
          <p className="mt-2 text-xs text-gray-500">Jornada: {data.schedule.name}</p>
        )}
      </section>

      {/* Navegação de mês */}
      <div className="mt-4 flex items-center justify-between rounded-lg border bg-white p-3">
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

      {/* Resumo do mês */}
      {data && (
        <section className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-600">Previsto</p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {formatClock(data.period.totals.expectedMinutes)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-600">Trabalhado</p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {formatClock(data.period.totals.workedMinutes)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-600">Hora extra</p>
            <p className="font-mono text-lg font-semibold text-blue-600 tabular-nums">
              {formatHM(data.period.totals.overtimeMinutes)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-600">Atrasos</p>
            <p className="font-mono text-lg font-semibold text-red-600 tabular-nums">
              {formatHM(data.period.totals.debitMinutes)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-600">Dias trabalhados</p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {data.period.totals.daysWorked}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-600">Faltas</p>
            <p className="font-mono text-lg font-semibold text-red-600 tabular-nums">
              {data.period.totals.daysAbsent}
            </p>
          </div>
        </section>
      )}

      {/* Lista de dias */}
      {loading ? (
        <p className="mt-6 text-center text-sm text-gray-600">Carregando...</p>
      ) : data?.period.days ? (
        <section className="mt-4 space-y-2">
          {data.period.days
            .filter((d) => d.status !== 'REST_DAY')
            .map((day) => (
              <div key={day.date} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{formatDateBR(day.date)}</p>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[day.status]}`}
                    >
                      {STATUS_LABELS[day.status]}
                    </span>
                  </div>
                  <div className="text-right">
                    {day.workedMinutes > 0 && (
                      <p className="font-mono text-sm tabular-nums">
                        {formatClock(day.workedMinutes)}
                      </p>
                    )}
                    {day.balanceMinutes !== 0 && (
                      <p
                        className={`font-mono text-xs tabular-nums ${
                          day.balanceMinutes > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatHM(day.balanceMinutes)}
                      </p>
                    )}
                  </div>
                </div>
                {day.lateMinutes > 0 && (
                  <p className="mt-1 text-xs text-red-600">⏰ Atraso: {day.lateMinutes}min</p>
                )}
                {day.overtimeMinutes > 0 && (
                  <p className="mt-1 text-xs text-blue-600">
                    ⏱️ Hora extra: {day.overtimeMinutes}min
                  </p>
                )}
              </div>
            ))}
        </section>
      ) : (
        <p className="mt-6 text-center text-sm text-gray-600">Sem dados para o mês.</p>
      )}

      <p className="mt-auto pt-8 pb-4 text-center text-xs text-gray-500">
        Atualizado em {new Date().toLocaleString('pt-BR')}
      </p>
    </main>
  );
}
