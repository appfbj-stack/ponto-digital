'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL || 'http://localhost:3001';

interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  trialDays: number;
}

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    cnpj: '',
    planId: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${API_URL}/api/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setPlans(d);
        if (d.length > 0) setForm((f) => ({ ...f, planId: d[0].id }));
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/super-admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Erro ao criar empresa');
        return;
      }
      router.push('/empresas');
    } catch {
      setError('Não foi possível conectar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-white">
      <header className="mb-6">
        <Link href="/empresas" className="text-sm text-gray-400">← Empresas</Link>
        <h1 className="text-2xl font-bold">Nova Empresa</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6 max-w-2xl">
        <h2 className="text-lg font-semibold">Dados da Empresa</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-300">Nome *</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Slug *</label>
            <input
              type="text" required value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="empresa-demo"
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">CNPJ</label>
            <input
              type="text" value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Plano *</label>
            <select
              required value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
            >
              <option value="">Selecione...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (R$ {p.priceMonthly}/mês, {p.trialDays}d trial)
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="text-lg font-semibold pt-4 border-t border-gray-700">Admin Inicial</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm text-gray-300">Nome do Admin *</label>
            <input
              type="text" required value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Email *</label>
            <input
              type="email" required value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Senha *</label>
            <input
              type="text" required value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
            />
          </div>
        </div>

        {error && <p className="rounded-md bg-red-900/50 px-3 py-2 text-sm text-red-200">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit" disabled={submitting}
            className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar empresa + admin + trial'}
          </button>
          <Link href="/empresas" className="rounded-md border border-gray-600 px-6 py-2">
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
