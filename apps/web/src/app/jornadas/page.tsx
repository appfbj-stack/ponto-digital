'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Schedule {
  id: string;
  name: string;
  scheduleType: string;
  description?: string;
  entryToleranceMinutes: number;
  exitToleranceMinutes: number;
  weeklyHours: Record<string, DayConfig | null>;
}

interface DayConfig {
  entry?: string;
  breakStart?: string;
  breakEnd?: string;
  exit?: string;
}

const DAY_KEYS: Array<{ key: keyof Schedule['weeklyHours']; label: string }> = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const SCHEDULE_TYPES: Record<string, string> = {
  FIVE_BY_TWO: '5x2',
  SIX_BY_ONE: '6x1',
  TWELVE_BY_THIRTY_SIX: '12x36',
  CUSTOM: 'Personalizada',
};

export default function JornadasPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Schedule> & { weeklyHours: Schedule['weeklyHours'] }>({
    name: '',
    scheduleType: 'FIVE_BY_TWO',
    entryToleranceMinutes: 10,
    exitToleranceMinutes: 10,
    weeklyHours: {
      monday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
      tuesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
      wednesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
      thursday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
      friday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
      saturday: null,
      sunday: null,
    },
  });

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
      const res = await fetch(`${API_URL}/api/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSchedules(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      scheduleType: 'FIVE_BY_TWO',
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
      weeklyHours: {
        monday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        tuesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        wednesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        thursday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        friday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        saturday: null,
        sunday: null,
      },
    });
    setShowForm(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setForm({
      name: s.name,
      scheduleType: s.scheduleType as any,
      entryToleranceMinutes: s.entryToleranceMinutes,
      exitToleranceMinutes: s.exitToleranceMinutes,
      weeklyHours: s.weeklyHours,
    });
    setShowForm(true);
  }

  async function save() {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const url = editing
        ? `${API_URL}/api/schedules/${editing.id}`
        : `${API_URL}/api/schedules`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          scheduleType: form.scheduleType,
          entryToleranceMinutes: form.entryToleranceMinutes,
          exitToleranceMinutes: form.exitToleranceMinutes,
          weeklyHours: form.weeklyHours,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        load(token);
      }
    } catch {
      // silencioso
    }
  }

  function toggleDay(day: keyof Schedule['weeklyHours']) {
    const current = form.weeklyHours[day];
    if (current === null || current === undefined) {
      setForm({
        ...form,
        weeklyHours: {
          ...form.weeklyHours,
          [day]: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        },
      });
    } else {
      setForm({
        ...form,
        weeklyHours: { ...form.weeklyHours, [day]: null },
      });
    }
  }

  function updateDay(day: keyof Schedule['weeklyHours'], field: keyof DayConfig, value: string) {
    const current = form.weeklyHours[day] || { entry: '', breakStart: '', breakEnd: '', exit: '' };
    setForm({
      ...form,
      weeklyHours: {
        ...form.weeklyHours,
        [day]: { ...current, [field]: value },
      },
    });
  }

  return (
    <main className="container py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-bold">Jornadas de Trabalho</h1>
        </div>
        <button
          onClick={openNew}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + Nova Jornada
        </button>
      </header>

      {loading ? (
        <p>Carregando...</p>
      ) : schedules.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-600">
          Nenhuma jornada cadastrada.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {schedules.map((s) => (
            <div key={s.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-gray-600">{SCHEDULE_TYPES[s.scheduleType] || s.scheduleType}</p>
                </div>
                <button
                  onClick={() => openEdit(s)}
                  className="rounded border px-2 py-1 text-xs hover:bg-accent"
                >
                  Editar
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Tolerância: {s.entryToleranceMinutes}min entrada / {s.exitToleranceMinutes}min saída
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              {editing ? 'Editar jornada' : 'Nova jornada'}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
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
                  <label className="text-sm font-medium">Tipo</label>
                  <select
                    value={form.scheduleType}
                    onChange={(e) => setForm({ ...form, scheduleType: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-input px-3 py-2"
                  >
                    {Object.entries(SCHEDULE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Toler. entrada (min)</label>
                    <input
                      type="number"
                      value={form.entryToleranceMinutes || 0}
                      onChange={(e) =>
                        setForm({ ...form, entryToleranceMinutes: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs">Toler. saída (min)</label>
                    <input
                      type="number"
                      value={form.exitToleranceMinutes || 0}
                      onChange={(e) =>
                        setForm({ ...form, exitToleranceMinutes: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-md border border-input px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Dias da semana</h3>
                <div className="space-y-2">
                  {DAY_KEYS.map(({ key, label }) => {
                    const day = form.weeklyHours[key];
                    const isOff = day === null;
                    return (
                      <div key={key} className="rounded-md border bg-gray-50 p-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">{label}</label>
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={!isOff}
                              onChange={() => toggleDay(key)}
                            />
                            Trabalha
                          </label>
                        </div>
                        {!isOff && (
                          <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                            <input
                              type="time"
                              placeholder="Entrada"
                              value={day?.entry || ''}
                              onChange={(e) => updateDay(key, 'entry', e.target.value)}
                              className="rounded border px-1 py-0.5"
                            />
                            <input
                              type="time"
                              placeholder="Intervalo"
                              value={day?.breakStart || ''}
                              onChange={(e) => updateDay(key, 'breakStart', e.target.value)}
                              className="rounded border px-1 py-0.5"
                            />
                            <input
                              type="time"
                              placeholder="Retorno"
                              value={day?.breakEnd || ''}
                              onChange={(e) => updateDay(key, 'breakEnd', e.target.value)}
                              className="rounded border px-1 py-0.5"
                            />
                            <input
                              type="time"
                              placeholder="Saída"
                              value={day?.exit || ''}
                              onChange={(e) => updateDay(key, 'exit', e.target.value)}
                              className="rounded border px-1 py-0.5"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
