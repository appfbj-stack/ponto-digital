'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Location {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
}

export default function LocaisPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<Partial<Location>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch(`${API_URL}/api/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLocations(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', address: '', latitude: -23.561414, longitude: -46.655881, radiusMeters: 150, active: true });
    setShowForm(true);
  }

  function openEdit(loc: Location) {
    setEditing(loc);
    setForm({ ...loc });
    setShowForm(true);
  }

  async function save() {
    setError(null);
    setSubmitting(true);
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const url = editing
        ? `${API_URL}/api/locations/${editing.id}`
        : `${API_URL}/api/locations`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radiusMeters: Number(form.radiusMeters),
          active: form.active ?? true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Erro ao salvar');
        return;
      }
      setShowForm(false);
      load(token);
    } catch {
      setError('Não foi possível conectar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">Locais de Trabalho</h1>
          <p className="text-sm text-gray-600">Geocerca para registro de ponto</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + Novo Local
        </button>
      </header>

      {loading ? (
        <p>Carregando...</p>
      ) : locations.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhum local cadastrado. Crie o primeiro para começar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{loc.name}</h3>
                  {loc.address && <p className="text-xs text-gray-600">{loc.address}</p>}
                </div>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${
                    loc.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {loc.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>📍 {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</p>
                <p>📏 Raio: {loc.radiusMeters}m</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEdit(loc)}
                  className="flex-1 rounded border px-2 py-1 text-xs hover:bg-accent"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              {editing ? 'Editar local' : 'Novo local'}
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
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Endereço</label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.latitude || ''}
                    onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-input px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.longitude || ''}
                    onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-input px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Raio (metros) *</label>
                <input
                  type="number"
                  required
                  value={form.radiusMeters || ''}
                  onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-input px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recomendado: 100-150m escritório, 300m obra
                </p>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border px-4 py-2"
                >
                  Cancelar
                </button>
              </div>

              <p className="text-xs text-gray-500">
                💡 Dica: no Google Maps, clique com botão direito no local → "Coordenadas" pra pegar lat/lng
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
