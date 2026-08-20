'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

type AttendanceType = 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';

const TYPE_LABELS: Record<AttendanceType, string> = {
  ENTRY: 'Entrada',
  BREAK_START: 'Início do Intervalo',
  BREAK_END: 'Retorno do Intervalo',
  EXIT: 'Saída',
  OVERTIME: 'Hora Extra',
};

export default function SolicitacoesPage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<AttendanceType>('ENTRY');
  const [time, setTime] = useState('08:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadMyRequests(token);
  }, [router]);

  async function loadMyRequests(token: string) {
    try {
      // Por enquanto busca todos os registros do funcionário
      // (a rota /corrections/my entra na Etapa 4)
      const res = await fetch(`${API_URL}/api/attendance/my?startDate=2024-01-01&endDate=2030-12-31`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Não implementado, ignore
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!reason.trim()) {
      setError('Informe a justificativa.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const requestedTime = new Date(`${date}T${time}:00`);
      const res = await fetch(`${API_URL}/api/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: requestedTime.toISOString(),
          type,
          requestedTime: requestedTime.toISOString(),
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Erro ao enviar solicitação.');
        return;
      }

      setSuccess(true);
      setReason('');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => router.back()} className="text-sm">
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Correção de Ponto</h1>
        <div className="w-12" />
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6">
        <p className="text-sm text-muted-foreground">
          Esqueceu de registrar? Marque errado? Solicite a correção abaixo.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-11 w-full rounded-md border bg-white px-3"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AttendanceType)}
            className="h-11 w-full rounded-md border bg-white px-3"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Horário correto</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="h-11 w-full rounded-md border bg-white px-3"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Justificativa</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Ex: Esqueci de registrar a saída às 17h"
            className="w-full rounded-md border bg-white p-3"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ Solicitação enviada! Aguarde análise do administrador.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-lg bg-primary font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Enviar solicitação'}
        </button>
      </form>
    </main>
  );
}
