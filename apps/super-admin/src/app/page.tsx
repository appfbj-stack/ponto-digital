import Link from 'next/link';

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Kairos Ponto</h1>
      <p className="text-muted-foreground">Painel Super Admin da plataforma</p>
      <Link
        href="/login"
        className="inline-flex h-11 items-center rounded-md bg-primary px-8 text-primary-foreground"
      >
        Entrar
      </Link>
    </main>
  );
}
