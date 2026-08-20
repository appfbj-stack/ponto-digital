'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Correction {
  id: string;
  employee: { id: string; name: string };
  date: string;
  type: string;
  requestedTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewNotes?: string;
}

const TYPE_LABELS: Record<string, string> = {
  ENTRY: 'Entrada',
  BREAK_START: 'Início Intervalo',
  BREAK_END: 'Retorno Intervalo',
  EXIT: 'Saída',
  OVERTIME: 'Hora Extra',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function CorrecoesPage() {
  const router = useRouter();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadCorrections(token);
  }, [router, filter]);

  async function loadCorrections(token: string) {
    setLoading(true);
    try {
      const url = filter ? `${API_URL}/api/corrections?status=${filter}` : `${API_URL}/api/corrections`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCorrections(data);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  async function review(id: string, status: 'APPROVED' | 'REJECTED') {
    if (status === 'REJECTED' && !reviewNotes.trim()) {
      alert('Informe o motivo da rejeição.');
      return;
    }

    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/corrections/${id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (res.ok) {
        setReviewing(null);
        setReviewNotes('');
        loadCorrections(token);
      }
    } catch {
      // silencioso
    }
  }

  return (
    <main className="container py-8">
      <header className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold">Correções de Ponto</h1>
        <p className="text-sm text-gray-600">Solicitações dos funcionários</p>
      </header>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1 text-sm ${
              filter === s ? 'bg-primary text-primary-foreground' : 'border bg-white hover:bg-accent'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : corrections.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhuma solicitação {filter && STATUS_LABELS[filter] && `${STATUS_LABELS[filter].toLowerCase()}`}.
        </p>
      ) : (
        <div className="space-y-3">
          {corrections.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.employee.name}</p>
                  <p className="text-xs text-gray-600">
                    Solicitada em {new Date(c.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[c.status]}`}
                >
                  {STATUS_LABELS[c.status]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-600">Data</p>
                  <p className="font-medium">
                    {new Date(c.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Tipo</p>
                  <p className="font-medium">{TYPE_LABELS[c.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Horário solicitado</p>
                  <p className="font-mono font-medium">
                    {new Date(c.requestedTime).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-gray-600">Justificativa</p>
                <p className="mt-1 text-sm italic">"{c.reason}"</p>
              </div>

              {c.reviewNotes && (
                <div className="mt-3 rounded-md bg-gray-50 p-2">
                  <p className="text-xs text-gray-600">Parecer do administrador</p>
                  <p className="mt-1 text-sm">{c.reviewNotes}</p>
                </div>
              )}

              {c.status === 'PENDING' && (
                <div className="mt-3 flex gap-2">
                  {reviewing === c.id ? (
                    <>
                      <input
                        type="text"
                        placeholder="Notas (obrigatório pra rejeitar)"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="flex-1 rounded-md border border-input px-3 py-1 text-sm"
                      />
                      <button
                        onClick={() => review(c.id, 'APPROVED')}
                        className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white"
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        onClick={() => review(c.id, 'REJECTED')}
                        className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white"
                      >
                        ✗ Rejeitar
                      </button>
                      <button
                        onClick={() => {
                          setReviewing(null);
                          setReviewNotes('');
                        }}
                        className="rounded-md border px-3 py-1 text-sm"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setReviewing(c.id)}
                      className="rounded-md border bg-white px-3 py-1 text-sm font-medium hover:bg-accent"
                    >
                      Analisar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
