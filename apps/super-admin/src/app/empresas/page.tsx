'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL || 'http://localhost:3001';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  cnpj?: string;
  active: boolean;
  blockedAt?: string;
  blockedReason?: string;
  plan?: { name: string; tier: string };
  subscription?: { status: string; trialEndsAt?: string; currentPeriodEnd?: string };
  _count: { users: number; employees: number; workLocations: number };
}

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-orange-100 text-orange-800',
};

export default function EmpresasPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    load(token);
  }, [router, search, filter]);

  async function load(token: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (filter) params.append('status', filter);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTenants(await res.json());
    } catch {} finally { setLoading(false); }
  }

  async function toggleBlock(tenant: Tenant) {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;
    const newActive = !tenant.active;
    const action = newActive ? 'Desbloquear' : 'Bloquear';
    const reason = newActive ? '' : prompt(`Motivo do bloqueio?`) || '';
    if (!newActive && !reason) return;

    if (!confirm(`${action} empresa ${tenant.name}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/super-admin/tenants/${tenant.id}/${newActive ? 'unblock' : 'block'}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: newActive ? undefined : JSON.stringify({ reason }),
      });
      if (res.ok) load(token);
    } catch {}
  }

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-white">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-400">← Dashboard</Link>
          <h1 className="text-2xl font-bold">Empresas</h1>
        </div>
        <Link
          href="/empresas/nova"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova Empresa
        </Link>
      </header>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nome, slug ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
        >
          <option value="">Todas</option>
          <option value="active">Apenas ativas</option>
          <option value="blocked">Apenas bloqueadas</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : tenants.length === 0 ? (
        <p className="rounded-md border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">
          Nenhuma empresa encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Plano</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Usuários</th>
                <th className="p-3 text-center">Funcionários</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 font-mono text-xs text-gray-400">{t.slug}</td>
                  <td className="p-3 text-xs">{t.plan?.name || '—'}</td>
                  <td className="p-3 text-center">
                    {t.subscription && (
                      <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[t.subscription.status] || 'bg-gray-100'}`}>
                        {t.subscription.status}
                      </span>
                    )}
                    {t.blockedAt && (
                      <p className="mt-1 text-xs text-red-400">{t.blockedReason}</p>
                    )}
                  </td>
                  <td className="p-3 text-center text-xs">{t._count.users}</td>
                  <td className="p-3 text-center text-xs">{t._count.employees}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => toggleBlock(t)}
                      className={`rounded px-2 py-1 text-xs ${
                        t.active
                          ? 'border border-red-500 text-red-400 hover:bg-red-900'
                          : 'border border-green-500 text-green-400 hover:bg-green-900'
                      }`}
                    >
                      {t.active ? 'Bloquear' : 'Desbloquear'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
