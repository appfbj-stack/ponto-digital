'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Department {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

export default function NovoFuncionarioPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ generatedPassword?: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    registration: '',
    position: '',
    departmentId: '',
    scheduleId: '',
    admissionDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    Promise.all([
      fetch(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/schedules`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/locations`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([deps, scheds, locs]) => {
      setDepartments(deps);
      setSchedules(scheds);
      setLocations(locs);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || undefined,
          scheduleId: form.scheduleId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Erro ao criar funcionário.');
        return;
      }

      const data = await res.json();
      setSuccess({
        generatedPassword: data.generatedPassword,
      });
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="container py-8">
        <div className="rounded-lg border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-green-600">✓ Funcionário criado!</h1>
          {success.generatedPassword && (
            <div className="mt-6 rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-900">
                Senha temporária gerada:
                <br />
                <code className="mt-2 block font-mono text-lg font-bold">{success.generatedPassword}</code>
              </p>
              <p className="mt-2 text-xs text-yellow-800">
                ⚠️ Anote e envie ao funcionário por canal seguro. Ele deverá trocar no primeiro acesso.
              </p>
            </div>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => router.push('/funcionarios')}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Voltar à lista
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setForm({
                  name: '',
                  cpf: '',
                  email: '',
                  phone: '',
                  registration: '',
                  position: '',
                  departmentId: '',
                  scheduleId: '',
                  admissionDate: new Date().toISOString().split('T')[0],
                });
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Criar outro
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <header className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-600">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold">Novo Funcionário</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium">Nome completo *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">CPF *</label>
            <input
              type="text"
              required
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Matrícula</label>
            <input
              type="text"
              value={form.registration}
              onChange={(e) => setForm({ ...form, registration: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Telefone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Cargo</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data de admissão</label>
            <input
              type="date"
              value={form.admissionDate}
              onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Departamento</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            >
              <option value="">Selecione...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Jornada</label>
            <select
              value={form.scheduleId}
              onChange={(e) => setForm({ ...form, scheduleId: e.target.value })}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            >
              <option value="">Selecione...</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar funcionário'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border px-6 py-2"
          >
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}
