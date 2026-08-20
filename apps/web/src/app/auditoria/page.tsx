'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  oldValue?: any;
  newValue?: any;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-700',
  ATTENDANCE_REGISTER: 'bg-blue-100 text-blue-800',
  ATTENDANCE_CORRECTION_REQUEST: 'bg-yellow-100 text-yellow-800',
  ATTENDANCE_CORRECTION_APPROVE: 'bg-green-100 text-green-800',
  ATTENDANCE_CORRECTION_REJECT: 'bg-red-100 text-red-800',
  BIOMETRIC_REGISTER: 'bg-cyan-100 text-cyan-800',
  BIOMETRIC_UPDATE: 'bg-cyan-100 text-cyan-800',
  BIOMETRIC_DELETE: 'bg-red-100 text-red-800',
};

export default function AuditoriaPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    load(token);
  }, [router, page, actionFilter]);

  async function load(token: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/audit/logs?page=${page}&pageSize=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotal(data.meta.total);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <main className="container py-8">
      <header className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-sm text-gray-600">
          {total} registro(s) • Logs são read-only — não podem ser apagados
        </p>
      </header>

      <select
        value={actionFilter}
        onChange={(e) => {
          setActionFilter(e.target.value);
          setPage(1);
        }}
        className="mb-4 rounded-md border border-input px-3 py-2 text-sm"
      >
        <option value="">Todas as ações</option>
        <option value="LOGIN">Login</option>
        <option value="CREATE">Criação</option>
        <option value="UPDATE">Atualização</option>
        <option value="DELETE">Exclusão</option>
        <option value="ATTENDANCE_REGISTER">Registro de ponto</option>
        <option value="ATTENDANCE_CORRECTION_REQUEST">Solicitação de correção</option>
        <option value="ATTENDANCE_CORRECTION_APPROVE">Correção aprovada</option>
        <option value="ATTENDANCE_CORRECTION_REJECT">Correção rejeitada</option>
        <option value="BIOMETRIC_REGISTER">Cadastro biométrico</option>
      </select>

      {loading ? (
        <p>Carregando...</p>
      ) : logs.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhum log encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="p-3 text-left">Data/Hora</th>
                <th className="p-3 text-left">Ação</th>
                <th className="p-3 text-left">Entidade</th>
                <th className="p-3 text-left">IP</th>
                <th className="p-3 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {log.entity}
                    {log.entityId && (
                      <span className="ml-1 text-gray-500">#{log.entityId.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-600">{log.ip || '—'}</td>
                  <td className="p-3 text-xs">
                    {log.newValue && (
                      <details>
                        <summary className="cursor-pointer text-blue-600">ver</summary>
                        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                          {JSON.stringify(log.newValue, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="text-sm">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Próxima →
          </button>
        </div>
      )}
    </main>
  );
}
