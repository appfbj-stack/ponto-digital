'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Department {
  id: string;
  name: string;
  description?: string;
  _count?: { employees: number };
}

export default function DepartamentosPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    load(token);
  }, [router]);

  async function load(token: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDepartments(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', description: '' });
    setShowForm(true);
  }

  function openEdit(d: Department) {
    setEditing(d);
    setForm({ name: d.name, description: d.description || '' });
    setShowForm(true);
  }

  async function save() {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    const url = editing ? `${API_URL}/api/departments/${editing.id}` : `${API_URL}/api/departments`;
    try {
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        load(token);
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
          <h1 className="text-2xl font-bold">Departamentos</h1>
        </div>
        <button
          onClick={openNew}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + Novo
        </button>
      </header>

      {loading ? (
        <p>Carregando...</p>
      ) : departments.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhum departamento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold">{d.name}</h3>
              {d.description && <p className="mt-1 text-xs text-gray-600">{d.description}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {d._count?.employees || 0} funcionário(s)
              </p>
              <button
                onClick={() => openEdit(d)}
                className="mt-3 w-full rounded border px-2 py-1 text-xs hover:bg-accent"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              {editing ? 'Editar departamento' : 'Novo departamento'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border px-4 py-2"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
