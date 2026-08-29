'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserX,
  Coffee,
  Clock,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  RefreshCw,
  Plus,
  Building2,
  MapPin,
  CalendarDays,
  FileBarChart,
  ShieldCheck,
  ScanFace,
} from 'lucide-react';

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

const stats = [
  { key: 'totalEmployees', label: 'Funcionários', icon: Users, color: 'indigo' },
  { key: 'present', label: 'Presentes hoje', icon: UserCheck, color: 'emerald' },
  { key: 'absent', label: 'Ausentes', icon: UserX, color: 'rose' },
  { key: 'onTime', label: 'Pontuais', icon: Clock, color: 'cyan' },
  { key: 'late', label: 'Atrasados', icon: AlertTriangle, color: 'amber' },
  { key: 'onBreak', label: 'Em intervalo', icon: Coffee, color: 'violet' },
  { key: 'overtime', label: 'Hora extra (h)', icon: TrendingUp, color: 'fuchsia' },
  { key: 'todayRecordsCount', label: 'Registros hoje', icon: ClipboardList, color: 'sky' },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', ring: 'ring-fuchsia-100' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
};

const ICON_BG: Record<string, string> = {
  indigo: 'bg-indigo-50',
  emerald: 'bg-emerald-50',
  rose: 'bg-rose-50',
  cyan: 'bg-cyan-50',
  amber: 'bg-amber-50',
  violet: 'bg-violet-50',
  fuchsia: 'bg-fuchsia-50',
  sky: 'bg-sky-50',
};
const ICON_TEXT: Record<string, string> = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  cyan: 'text-cyan-600',
  amber: 'text-amber-600',
  violet: 'text-violet-600',
  fuchsia: 'text-fuchsia-600',
  sky: 'text-sky-600',
};
const ICON_RING: Record<string, string> = {
  indigo: 'ring-indigo-100',
  emerald: 'ring-emerald-100',
  rose: 'ring-rose-100',
  cyan: 'ring-cyan-100',
  amber: 'ring-amber-100',
  violet: 'ring-violet-100',
  fuchsia: 'ring-fuchsia-100',
  sky: 'ring-sky-100',
};

const quickLinks = [
  { href: '/funcionarios', icon: Users, label: 'Funcionários', desc: 'Lista completa', color: 'indigo' },
  { href: '/funcionarios/novo', icon: Plus, label: 'Novo funcionário', desc: 'Cadastrar', color: 'emerald' },
  { href: '/departamentos', icon: Building2, label: 'Departamentos', desc: 'Organização', color: 'cyan' },
  { href: '/locais', icon: MapPin, label: 'Locais de trabalho', desc: 'Geocerca', color: 'amber' },
  { href: '/jornadas', icon: Clock, label: 'Jornadas', desc: 'Escalas', color: 'violet' },
  { href: '/correcoes', icon: CalendarDays, label: 'Correções', desc: 'Aprovar', color: 'rose' },
  { href: '/registros', icon: ClipboardList, label: 'Registros', desc: 'Histórico', color: 'sky' },
  { href: '/relatorios', icon: FileBarChart, label: 'Relatórios', desc: 'PDF/Excel', color: 'fuchsia' },
  { href: '/auditoria', icon: ShieldCheck, label: 'Auditoria', desc: 'Logs LGPD', color: 'indigo' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    const token = localStorage.getItem('kairos_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${apiUrl}/api/reports/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('kairos_access_token');
        router.push('/login');
        return;
      }
      const d = await res.json();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  return (
    <div className="space-y-8 pt-14 lg:pt-0">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold text-indigo-700">
            <ScanFace className="h-3.5 w-3.5" />
            Painel de controle
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo do dia · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="btn-ghost border bg-card text-sm shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border bg-card"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map(({ key, label, icon: Icon, color }) => {
            const value = (data as any)?.[key] ?? 0;
            return (
              <div
                key={key}
                className="card-hover group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ICON_BG[color]} ${ICON_TEXT[color]} ring-1 ${ICON_RING[color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight">{value}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
                </div>
                <div className={`absolute -bottom-4 -right-4 h-20 w-20 rounded-full ${ICON_BG[color]} opacity-0 transition-opacity group-hover:opacity-60`}></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick links */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold">Acesso rápido</h2>
            <p className="text-sm text-muted-foreground">
              Vá direto para o módulo que precisa gerenciar
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {quickLinks.map(({ href, icon: Icon, label, desc, color }) => {
            return (
              <Link
                key={href}
                href={href}
                className="card-hover group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${ICON_BG[color]} ${ICON_TEXT[color]} ring-1 ${ICON_RING[color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{label}</div>
                  <div className="truncate text-xs text-muted-foreground">{desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
