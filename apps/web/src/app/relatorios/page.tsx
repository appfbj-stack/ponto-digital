'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Employee {
  id: string;
  name: string;
  cpf: string;
}

export default function RelatoriosPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${API_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setEmployees(d))
      .catch(() => {});
  }, [router]);

  function downloadTimesheet(employeeId: string, format: 'pdf' | 'excel') {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    // Como o endpoint requer Bearer token, abrimos via fetch e baixamos o blob
    fetch(`${API_URL}/api/reports/timesheet/${employeeId}/${format}?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `espelho-${month}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <main className="container py-8">
      <header className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600">
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-gray-600">Exportar espelho de ponto e logs</p>
      </header>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Espelho de Ponto por Funcionário</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Funcionário *</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            >
              <option value="">Selecione...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.cpf})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Mês</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded-md border border-input px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => selectedEmployee && downloadTimesheet(selectedEmployee, 'pdf')}
            disabled={!selectedEmployee}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            📄 Baixar PDF
          </button>
          <button
            onClick={() => selectedEmployee && downloadTimesheet(selectedEmployee, 'excel')}
            disabled={!selectedEmployee}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            📊 Baixar Excel
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Log de Registros de Ponto</h2>
        <p className="mb-4 text-sm text-gray-600">
          Lista completa de todos os registros de ponto no período.
        </p>
        <a
          href={`${API_URL}/api/reports/attendance-log/excel`}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white"
        >
          📊 Baixar Excel (mês atual)
        </a>
      </section>

      <section className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Relatório Consolidado (em breve)</h2>
        <p className="text-sm text-gray-600">
          Total de horas extras, atrasos e banco de horas de toda a empresa em um único relatório.
          Disponível no endpoint <code className="rounded bg-gray-100 px-2 py-0.5">GET /api/timesheet/company</code>.
        </p>
      </section>
    </main>
  );
}
