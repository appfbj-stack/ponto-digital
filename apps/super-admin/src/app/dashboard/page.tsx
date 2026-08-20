'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL || 'http://localhost:3001';

interface PlatformDashboard {
  totalTenants: number;
  activeTenants: number;
  blockedTenants: number;
  totalUsers: number;
  totalEmployees: number;
  totalTodayRecords: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  overdueSubscriptions: number;
  newTenantsThisMonth: number;
  mrr: number;
  tenantGrowth: { month: string; count: number }[];
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<PlatformDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${API_URL}/api/super-admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.clear();
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  if (loading) {
    return <main className="min-h-screen bg-gray-900 p-8 text-white">Carregando...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">👑 Kairos Ponto — Plataforma</h1>
          <p className="text-sm text-gray-400">Painel Super Admin</p>
        </div>
        <button
          onClick={logout}
          className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          Sair
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Empresas Totais</p>
          <p className="mt-1 text-3xl font-bold">{data?.totalTenants ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Ativas</p>
          <p className="mt-1 text-3xl font-bold text-green-400">{data?.activeTenants ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Bloqueadas</p>
          <p className="mt-1 text-3xl font-bold text-red-400">{data?.blockedTenants ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Funcionários</p>
          <p className="mt-1 text-3xl font-bold">{data?.totalEmployees ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Pontos hoje</p>
          <p className="mt-1 text-3xl font-bold text-blue-400">{data?.totalTodayRecords ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">MRR</p>
          <p className="mt-1 text-2xl font-bold text-yellow-400">
            R$ {data?.mrr.toFixed(2) ?? '0.00'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Assinaturas Ativas</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{data?.activeSubscriptions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Em Trial</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">{data?.trialSubscriptions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Inadimplentes</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{data?.overdueSubscriptions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Novas (mês)</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">+{data?.newTenantsThisMonth ?? 0}</p>
        </div>
      </div>

      {/* Crescimento */}
      <section className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-4 text-lg font-semibold">Crescimento de Empresas (últimos 6 meses)</h2>
        <div className="flex items-end gap-2 h-32">
          {data?.tenantGrowth.map((g) => (
            <div key={g.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${Math.max(4, g.count * 20)}px` }}
              />
              <p className="mt-1 text-xs text-gray-400">{g.month.slice(5)}</p>
              <p className="text-xs font-bold">{g.count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Menu */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Gestão da Plataforma</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Link href="/empresas" className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:bg-gray-700">
            🏢 Empresas
          </Link>
          <Link href="/empresas/nova" className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:bg-gray-700">
            ➕ Nova Empresa
          </Link>
          <Link href="/planos" className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:bg-gray-700">
            💳 Planos
          </Link>
          <Link href="/assinaturas" className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:bg-gray-700">
            📋 Assinaturas
          </Link>
          <Link href="/logs" className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:bg-gray-700">
            🔍 Logs Globais
          </Link>
        </div>
      </section>
    </main>
  );
}
