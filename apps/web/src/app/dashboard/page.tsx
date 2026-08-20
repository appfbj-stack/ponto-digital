'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import Link from 'next/link';

interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  present: number;
  absent: number;
  onTime: number;
  late: number;
  onBreak: number;
  overtime: number;
  todayRecordsCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/reports/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('kairos_access_token');
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
    return (
      <main className="container py-8">
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Painel Administrativo</p>
        </div>
        <button
          onClick={logout}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Sair
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funcionários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.totalEmployees ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {data?.activeEmployees ?? 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Presentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{data?.present ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ausentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{data?.absent ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em intervalo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{data?.onBreak ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pontuais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{data?.onTime ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{data?.late ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hora extra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.overtime ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registros hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.todayRecordsCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Gestão</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Link
            href="/funcionarios"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            👥 Funcionários
          </Link>
          <Link
            href="/funcionarios/novo"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            ➕ Novo Funcionário
          </Link>
          <Link
            href="/departamentos"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            🏢 Departamentos
          </Link>
          <Link
            href="/locais"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            📍 Locais
          </Link>
          <Link
            href="/jornadas"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            ⏰ Jornadas
          </Link>
          <Link
            href="/correcoes"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            ✏️ Correções
          </Link>
          <Link
            href="/registros"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            📋 Registros
          </Link>
          <Link
            href="/relatorios"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            📊 Relatórios
          </Link>
          <Link
            href="/auditoria"
            className="rounded-lg border bg-white p-4 text-sm font-medium hover:bg-accent"
          >
            🔍 Auditoria
          </Link>
        </div>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        ✅ Etapas 1, 3, 4 e 5 entregues
      </p>
    </main>
  );
}
