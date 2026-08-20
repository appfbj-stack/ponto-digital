'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'VACATION' | 'LEAVE';
  position?: string;
  department?: { id: string; name: string };
  schedule?: { id: string; name: string };
}

const STATUS_LABELS: Record<Employee['status'], string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  VACATION: 'Férias',
  LEAVE: 'Afastado',
};

const STATUS_COLORS: Record<Employee['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  VACATION: 'bg-blue-100 text-blue-800',
  LEAVE: 'bg-yellow-100 text-yellow-800',
};

export default function FuncionariosPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadEmployees(token);
  }, [router]);

  async function loadEmployees(token: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);

    try {
      const res = await fetch(`${API_URL}/api/employees?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (token) loadEmployees(token);
  }, [search, statusFilter]);

  async function toggleStatus(emp: Employee) {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Alterar status de ${emp.name} para ${STATUS_LABELS[newStatus]}?`)) return;

    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/employees/${emp.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadEmployees(token);
      }
    } catch {
      // silencioso
    }
  }

  return (
    <main className="container py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">Funcionários</h1>
        </div>
        <button
          onClick={() => router.push('/funcionarios/novo')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Novo
        </button>
      </header>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nome, CPF, email ou matrícula..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">Todos</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
          <option value="VACATION">Férias</option>
          <option value="LEAVE">Afastados</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Carregando...</p>
      ) : employees.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhum funcionário encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">CPF</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Departamento</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{emp.name}</td>
                  <td className="p-3 font-mono text-xs">{emp.cpf}</td>
                  <td className="p-3 text-xs">{emp.email}</td>
                  <td className="p-3 text-xs">{emp.department?.name || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[emp.status]}`}>
                      {STATUS_LABELS[emp.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/funcionarios/${emp.id}/espelho`}
                        className="rounded border px-2 py-1 text-xs hover:bg-accent"
                      >
                        Espelho
                      </Link>
                      <button
                        onClick={() => toggleStatus(emp)}
                        className={`rounded border px-2 py-1 text-xs ${
                          emp.status === 'ACTIVE'
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {emp.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">{employees.length} funcionário(s)</p>
    </main>
  );
}
