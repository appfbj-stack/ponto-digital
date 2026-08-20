'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL || 'http://localhost:3001';

interface Subscription {
  id: string;
  tenant: { id: string; name: string; slug: string };
  plan: { name: string; tier: string };
  status: 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELLED' | 'SUSPENDED';
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-orange-100 text-orange-800',
};

export default function AssinaturasPage() {
  const router = useRouter();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) { router.push('/login'); return; }
    fetch(`${API_URL}/api/super-admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(async (tenants) => {
        const allSubs: Subscription[] = [];
        for (const t of tenants) {
          if (t.subscription) {
            allSubs.push({
              id: t.subscription.id,
              tenant: { id: t.id, name: t.name, slug: t.slug },
              plan: t.plan,
              status: t.subscription.status,
              trialEndsAt: t.subscription.trialEndsAt,
              currentPeriodStart: t.subscription.currentPeriodStart,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
            });
          }
        }
        setSubs(allSubs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-white">
      <header className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400">← Dashboard</Link>
        <h1 className="text-2xl font-bold">📋 Assinaturas</h1>
        <p className="text-sm text-gray-400">Todas as assinaturas da plataforma</p>
      </header>

      {loading ? <p>Carregando...</p> : subs.length === 0 ? (
        <p className="rounded-md border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">
          Nenhuma assinatura.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="p-3 text-left">Empresa</th>
                <th className="p-3 text-left">Plano</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-left">Período / Trial</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="p-3">
                    <p className="font-medium">{s.tenant.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{s.tenant.slug}</p>
                  </td>
                  <td className="p-3 text-xs">{s.plan?.name || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[s.status] || 'bg-gray-100'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-400">
                    {s.status === 'TRIAL' && s.trialEndsAt && (
                      <>Trial até: {new Date(s.trialEndsAt).toLocaleDateString('pt-BR')}</>
                    )}
                    {s.currentPeriodEnd && s.status !== 'TRIAL' && (
                      <>Até: {new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')}</>
                    )}
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
