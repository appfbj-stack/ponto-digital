'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL || 'http://localhost:3001';

interface Plan {
  id: string;
  name: string;
  tier: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  maxEmployees: number;
  maxLocations: number;
  features: any;
  trialDays: number;
  active: boolean;
  _count?: { subscriptions: number };
}

export default function PlanosPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) { router.push('/login'); return; }
    fetch(`${API_URL}/api/plans`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-white">
      <header className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400">← Dashboard</Link>
        <h1 className="text-2xl font-bold">💳 Planos</h1>
        <p className="text-sm text-gray-400">Planos disponíveis na plataforma</p>
      </header>

      {loading ? <p>Carregando...</p> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <span className="rounded bg-blue-900 px-2 py-0.5 text-xs text-blue-200">
                  {p.tier}
                </span>
              </div>
              {p.description && <p className="mt-1 text-sm text-gray-400">{p.description}</p>}
              <p className="mt-3 text-3xl font-bold text-yellow-400">
                R$ {Number(p.priceMonthly).toFixed(2)}
                <span className="text-sm text-gray-400">/mês</span>
              </p>
              {p.priceYearly && (
                <p className="text-xs text-gray-500">
                  ou R$ {Number(p.priceYearly).toFixed(2)}/ano
                </p>
              )}
              <ul className="mt-4 space-y-1 text-sm text-gray-300">
                <li>👥 Até {p.maxEmployees} funcionários</li>
                <li>📍 Até {p.maxLocations} locais</li>
                <li>📅 {p.trialDays} dias de trial</li>
                {p.features?.facial && <li>🤖 Reconhecimento facial</li>}
                {p.features?.pdf && <li>📄 Relatórios PDF</li>}
                {p.features?.offline && <li>📡 Modo offline</li>}
                {p.features?.api && <li>🔌 Acesso API</li>}
                {p.features?.sso && <li>🔐 SSO</li>}
              </ul>
              {p._count && (
                <p className="mt-3 text-xs text-gray-500">
                  {p._count.subscriptions} assinatura(s) ativa(s)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
