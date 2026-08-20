'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaceRegister } from '@/components/FaceRegister';

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

interface User {
  id: string;
  name?: string;
  email: string;
  employeeId?: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    const userStr = localStorage.getItem('kairos_user');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
    fetchStatus(token);
  }, [router]);

  async function fetchStatus(token: string) {
    try {
      const res = await fetch(`${API_URL}/api/biometric/me/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHasBiometric(data.hasBiometric ?? false);
      }
    } catch {
      setHasBiometric(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Tem certeza que deseja remover sua biometria cadastrada?')) return;

    setRemoving(true);
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/biometric/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHasBiometric(false);
      }
    } catch {
      // silencioso
    } finally {
      setRemoving(false);
    }
  }

  if (showRegister) {
    return (
      <FaceRegister
        onComplete={() => {
          setShowRegister(false);
          setHasBiometric(true);
        }}
        onCancel={() => setShowRegister(false)}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground">
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Perfil</h1>
        <button
          onClick={() => {
            localStorage.clear();
            router.push('/login');
          }}
          className="text-sm text-red-600"
        >
          Sair
        </button>
      </header>

      <section className="space-y-3 rounded-2xl border bg-white p-6">
        <div>
          <p className="text-xs text-muted-foreground">Nome</p>
          <p className="font-medium">{user?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-bold">🔒 Biometria Facial</h2>

        {hasBiometric === null && <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>}

        {hasBiometric === true && (
          <>
            <p className="mt-2 text-sm text-success">✓ Biometria cadastrada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Você pode atualizar ou remover quando quiser.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowRegister(true)}
                className="h-10 flex-1 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
              >
                Atualizar
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="h-10 rounded-lg border border-red-300 px-4 text-sm text-red-600"
              >
                {removing ? '...' : 'Remover'}
              </button>
            </div>
          </>
        )}

        {hasBiometric === false && (
          <>
            <p className="mt-2 text-sm text-warning">⚠️ Sem biometria cadastrada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre seu rosto para validar o ponto com mais segurança.
            </p>
            <button
              onClick={() => setShowRegister(true)}
              className="mt-4 h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              Cadastrar biometria
            </button>
          </>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <button
          onClick={() => router.push('/meu-ponto')}
          className="h-12 w-full rounded-lg border bg-white text-sm font-medium"
        >
          📅 Meu Ponto
        </button>
        <button
          onClick={() => router.push('/solicitacoes')}
          className="h-12 w-full rounded-lg border bg-white text-sm font-medium"
        >
          ✏️ Solicitar Correção
        </button>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Seus dados biométricos são criptografados e privados. A empresa não tem acesso à sua biometria bruta.
      </p>
    </main>
  );
}
