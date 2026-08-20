import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">Kairos Ponto</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Painel administrativo da empresa
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Entrar
        </Link>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Etapa 1 — Auth, Multi-tenant e Base de Funcionários
      </p>
    </main>
  );
}
