'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('joao@demo.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Falha no login');
        return;
      }
      const data = await res.json();
      localStorage.setItem('kairos_access_token', data.tokens.accessToken);
      localStorage.setItem('kairos_refresh_token', data.tokens.refreshToken);
      localStorage.setItem('kairos_user', JSON.stringify(data.user));
      router.push('/');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Kairos Ponto</h1>
          <p className="text-sm text-muted-foreground">App do Funcionário</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">Senha</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base" />
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={loading}
          className="h-12 w-full rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Demo: joao@demo.com / demo123
        </p>
      </form>
    </main>
  );
}
