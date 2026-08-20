'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('super@demo.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL || 'http://localhost:3001';
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
      if (data.user.role !== 'SUPER_ADMIN') {
        setError('Acesso restrito ao Super Admin');
        return;
      }
      localStorage.setItem('kairos_access_token', data.tokens.accessToken);
      localStorage.setItem('kairos_refresh_token', data.tokens.refreshToken);
      localStorage.setItem('kairos_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Kairos Ponto</h1>
          <p className="text-sm text-gray-400">👑 Super Admin</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300" htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full h-11 rounded-md border border-gray-600 bg-gray-700 px-3 text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300" htmlFor="password">Senha</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full h-11 rounded-md border border-gray-600 bg-gray-700 px-3 text-white" />
        </div>
        {error && <p className="rounded-md bg-red-900/50 px-3 py-2 text-sm text-red-200">{error}</p>}
        <button type="submit" disabled={loading}
          className="h-11 w-full rounded-md bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-xs text-gray-500">Demo: super@demo.com / demo123</p>
      </form>
    </main>
  );
}
