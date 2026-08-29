'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  MapPin,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  ShieldCheck,
  LogOut,
  ScanFace,
} from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/registros', label: 'Registros de Ponto', icon: ClipboardList },
  { href: '/jornadas', label: 'Jornadas', icon: Clock },
  { href: '/locais', label: 'Locais de Trabalho', icon: MapPin },
  { href: '/departamentos', label: 'Departamentos', icon: Building2 },
  { href: '/correcoes', label: 'Correções', icon: CalendarDays },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { href: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('kairos_user');
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  function logout() {
    localStorage.removeItem('kairos_access_token');
    localStorage.removeItem('kairos_refresh_token');
    localStorage.removeItem('kairos_user');
    router.push('/login');
  }

  // Páginas sem sidebar
  if (pathname === '/' || pathname === '/login') {
    return <>{null}</>;
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
            <ScanFace className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-brand-gradient">Kairos Ponto</span>
        </Link>
        <button
          onClick={logout}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="kairos-sidebar flex grow flex-col overflow-y-auto border-r px-4 py-6">
          <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-brand">
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white">Kairos Ponto</div>
              <div className="text-xs text-slate-400">Ponto Digital Facial</div>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`kairos-sidebar-item ${active ? 'active' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-2 text-xs text-slate-400">Logado como</div>
            <div className="truncate text-sm font-medium text-white">
              {user?.name || user?.email || 'Usuário'}
            </div>
            <div className="truncate text-xs text-slate-400">
              {user?.email}
            </div>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
