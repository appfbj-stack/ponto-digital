'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScanFace, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Email ou senha incorretos');
        return;
      }

      const data = await res.json();
      localStorage.setItem('kairos_access_token', data.tokens.accessToken);
      localStorage.setItem('kairos_refresh_token', data.tokens.refreshToken);
      localStorage.setItem('kairos_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado esquerdo - branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.3),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.25),transparent_50%)]"></div>

        <Link href="/" className="relative z-10 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
            <ScanFace className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Kairos Ponto</span>
        </Link>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight">
            Controle de jornada com{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              biometria facial
            </span>
          </h1>
          <p className="mt-4 max-w-md text-slate-300">
            Plataforma completa de ponto eletrônico com reconhecimento
            facial, geolocalização, banco de horas e relatórios.
          </p>

          <div className="mt-12 space-y-4">
            {[
              'Anti-fraude por liveness detection',
              'Geocerca por local de trabalho',
              'Espelho de ponto em PDF e Excel',
              'Multi-tenant com auditoria LGPD',
            ].map((b) => (
              <div key={b} className="flex items-center gap-3 text-sm text-slate-200">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg
                    className="h-3.5 w-3.5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} Kairos Ponto. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado direito - form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
              <ScanFace className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-brand-gradient">Kairos Ponto</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">Entrar no painel</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use suas credenciais de administrador da empresa
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@empresa.com"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-brand-focus"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-brand-focus"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in-up">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient h-11 w-full text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="rounded-lg border border-dashed bg-slate-50 p-3 text-center text-xs text-muted-foreground">
              <strong className="font-semibold text-foreground">Demo:</strong>{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-foreground">
                admin@demo.com
              </code>{' '}
              /{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-foreground">
                demo123
              </code>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
