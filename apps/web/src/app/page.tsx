import Link from 'next/link';
import {
  ScanFace,
  MapPin,
  Clock,
  BarChart3,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: ScanFace,
    title: 'Reconhecimento Facial',
    desc: 'Validação biométrica com liveness detection. Anti-fraude por prova de vida.',
  },
  {
    icon: MapPin,
    title: 'Geolocalização + Geocerca',
    desc: 'Funcionário só registra ponto dentro do raio autorizado do local de trabalho.',
  },
  {
    icon: Clock,
    title: 'Jornadas e Banco de Horas',
    desc: 'Escalas flexíveis, 12x36, banco de horas automático e espelho de ponto.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e PDF/Excel',
    desc: 'Espelho de ponto, ocorrências, horas extras. Exporta em PDF e Excel.',
  },
  {
    icon: Shield,
    title: 'LGPD e Auditoria',
    desc: 'Log de todas as ações. Multi-tenant com isolamento total por empresa.',
  },
  {
    icon: Smartphone,
    title: 'PWA Mobile-First',
    desc: 'Funcionário bate ponto pelo celular. Funciona offline e sincroniza depois.',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 2s', label: 'Tempo de registro' },
  { value: 'LGPD', label: 'Compliance' },
  { value: '24/7', label: 'Suporte' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <ScanFace className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">Kairos Ponto</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Entrar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.20),transparent_50%)]"></div>
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Reconhecimento facial + Geolocalização
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
                Ponto digital com{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  reconhecimento facial
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-300">
                Substitua o relógio de ponto por uma solução completa:
                biometria facial, geocerca, banco de horas automático, relatórios
                em PDF e Excel. Funciona no celular do funcionário.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="btn-gradient px-6 py-3 text-base"
                >
                  Acessar painel
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
                >
                  Ver recursos
                </a>
              </div>
              <div className="mt-10 grid max-w-md grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual mockup */}
            <div className="relative animate-fade-in-up">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 blur-3xl"></div>
              <div className="relative rounded-2xl border border-white/10 bg-slate-800/50 p-6 shadow-2xl backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="text-xs text-slate-400">painel.pontofacial.com.br</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 p-3">
                    <Users className="h-5 w-5 text-cyan-400" />
                    <div className="mt-2 text-xl font-bold text-white">142</div>
                    <div className="text-[10px] text-slate-400">Funcionários</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/20 p-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div className="mt-2 text-xl font-bold text-white">98.5%</div>
                    <div className="text-[10px] text-slate-400">Presença</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/20 p-3">
                    <Clock className="h-5 w-5 text-amber-400" />
                    <div className="mt-2 text-xl font-bold text-white">+18h</div>
                    <div className="text-[10px] text-slate-400">Banco</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {['08:02 - Carlos Souza', '08:15 - Maria Lima', '08:21 - João Silva', '08:30 - Ana Costa'].map((r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between rounded-md border border-white/5 bg-slate-900/50 px-3 py-2"
                    >
                      <span className="text-sm text-slate-300">{r.split(' - ')[1]}</span>
                      <span className="font-mono text-xs text-emerald-400">{r.split(' - ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold text-indigo-700">
              Recursos
            </div>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Tudo que sua empresa precisa
            </h2>
            <p className="mt-4 text-muted-foreground">
              Da biometria facial aos relatórios para a contabilidade. Sem complicação.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-brand"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient-soft text-indigo-600 transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Pronto para eliminar o ponto de papel?
          </h2>
          <p className="mt-4 text-slate-300">
            Acesse o painel e veja a plataforma em ação.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:scale-105"
          >
            Acessar painel agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <ScanFace className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-brand-gradient">Kairos Ponto</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Kairos Ponto. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
