'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaceVerify } from '@/components/FaceVerify';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useOfflineSync } from '@/lib/use-offline-sync';
import { generateClientEventId } from '@/lib/offline-queue';

interface AttendanceRecord {
  id: string;
  type: 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';
  timestamp: string;
  inGeofence: boolean;
}

interface User {
  id: string;
  name?: string;
  email: string;
}

const TYPE_LABELS: Record<AttendanceRecord['type'], string> = {
  ENTRY: 'Entrada',
  BREAK_START: 'Intervalo',
  BREAK_END: 'Retorno',
  EXIT: 'Saída',
  OVERTIME: 'Hora extra',
};

const API_URL = process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || 'http://localhost:3001';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [syncState, syncActions] = useOfflineSync();
  const { enqueue: enqueueAttendance } = syncActions;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'ok' | 'denied'>('unknown');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auth + status biométrico
  useEffect(() => {
    const token = localStorage.getItem('kairos_access_token');
    const userStr = localStorage.getItem('kairos_user');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    const u = JSON.parse(userStr);
    setUser(u);

    // Verifica se tem biometria
    fetch(`${API_URL}/api/biometric/me/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setHasBiometric(d.hasBiometric ?? false))
      .catch(() => setHasBiometric(false));
  }, [router]);

  // Geolocalização
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus('ok');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const fetchToday = useCallback(async () => {
    const token = localStorage.getItem('kairos_access_token');
    if (!token) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const res = await fetch(
        `${API_URL}/api/attendance/my?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    if (user) fetchToday();
  }, [user, fetchToday]);

  // Determina próximo tipo automaticamente
  function getNextType(): AttendanceRecord['type'] {
    const today = records.filter((r) => new Date(r.timestamp).toDateString() === new Date().toDateString());
    const lastType = today[today.length - 1]?.type;
    if (!lastType) return 'ENTRY';
    if (lastType === 'ENTRY') return 'BREAK_START';
    if (lastType === 'BREAK_START') return 'BREAK_END';
    if (lastType === 'BREAK_END') return 'EXIT';
    return 'OVERTIME';
  }

  async function handleRegister() {
    if (!coords) {
      setError('Não foi possível obter sua localização. Verifique as permissões.');
      return;
    }

    // Se tem biometria cadastrada, mostra modal de validação facial
    if (hasBiometric) {
      setShowFaceModal(true);
      return;
    }

    // Se não tem biometria, registra sem (modo degradado)
    setError(null);
    if (
      !window.confirm(
        'Você ainda não cadastrou sua biometria facial. Deseja registrar o ponto sem validação? Recomendamos cadastrar para maior segurança.',
      )
    ) {
      return;
    }
    await submitAttendance(JSON.stringify({ embedding: [], liveness: { confidence: 0, checks: {} } }));
  }

  async function submitAttendance(faceToken: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('kairos_access_token');
    if (!token || !coords) {
      setLoading(false);
      return;
    }

    const nextType = getNextType();
    const clientEventId = generateClientEventId();
    const deviceId = 'web-' + (navigator.userAgent.length % 100000);

    // Se estiver offline, enfileira e mostra mensagem
    if (!navigator.onLine) {
      try {
        await enqueueAttendance({
          clientEventId,
          type: nextType,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy,
          faceToken,
          faceConfidence: 0.95,
          livenessPassed: true,
          deviceId,
          clientTimestamp: new Date().toISOString(),
        });
        setSuccess(`✓ Ponto ${TYPE_LABELS[nextType]} salvo offline. Será sincronizado quando voltar online.`);
        setShowFaceModal(false);
        fetchToday();
      } catch {
        setError('Não foi possível salvar o ponto offline.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Online: tenta enviar direto
    try {
      const res = await fetch(`${API_URL}/api/attendance/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: nextType,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy,
          faceToken,
          faceConfidence: 0.95,
          livenessPassed: true,
          deviceId,
          clientTimestamp: new Date().toISOString(),
          clientEventId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'OUT_OF_GEOFENCE') {
          setError('Você está fora do local autorizado para registro.');
        } else if (data.error === 'FACE_NOT_MATCHED') {
          setError('Rosto não reconhecido. Tente novamente.');
        } else {
          setError(data.message || 'Não foi possível registrar o ponto.');
        }
        setShowFaceModal(false);
        return;
      }

      setSuccess(`✓ Ponto registrado: ${TYPE_LABELS[nextType]}`);
      setShowFaceModal(false);
      fetchToday();
    } catch {
      // Erro de rede durante envio: enfileira
      try {
        await enqueueAttendance({
          clientEventId,
          type: nextType,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy,
          faceToken,
          faceConfidence: 0.95,
          livenessPassed: true,
          deviceId,
          clientTimestamp: new Date().toISOString(),
        });
        setSuccess(`✓ Ponto ${TYPE_LABELS[nextType]} salvo. Será sincronizado em breve.`);
        setShowFaceModal(false);
        fetchToday();
      } catch {
        setError('Não foi possível registrar o ponto.');
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  const todayRecords = records.filter(
    (r) => new Date(r.timestamp).toDateString() === new Date().toDateString(),
  );

  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR');

  return (
    <>
      <ServiceWorkerRegister />
      <OfflineIndicator />
      <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-lg font-bold">Kairos Ponto</h1>
        <button
          onClick={logout}
          className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          Sair
        </button>
      </header>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Olá, {user?.name?.split(' ')[0] || 'Funcionário'} 👋
        </p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{dateStr}</p>
        <p className="my-4 font-mono text-5xl font-bold tabular-nums">{timeStr}</p>

        <button
          onClick={handleRegister}
          disabled={loading || locationStatus === 'denied'}
          className="h-16 w-full rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg transition active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'REGISTRAR PONTO'}
        </button>

        {locationStatus === 'denied' && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Ative a localização para registrar o ponto.
          </p>
        )}
        {locationStatus === 'ok' && coords && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            📍 Localização ativa (precisão ±{Math.round(coords.accuracy)}m)
          </p>
        )}

        {hasBiometric === false && (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            ⚠️ Você ainda não cadastrou sua biometria. Vá em Perfil → Biometria.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Registros de hoje</h2>
        {todayRecords.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum registro ainda hoje.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayRecords.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-md border bg-card p-3 text-sm"
              >
                <span className="font-medium">{TYPE_LABELS[r.type]}</span>
                <span className="font-mono tabular-nums">
                  {new Date(r.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="mt-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => router.push('/meu-ponto')}
          className="rounded-md border bg-white p-3 text-sm font-medium hover:bg-accent"
        >
          📅 Meu Ponto
        </button>
        <button
          onClick={() => router.push('/banco-horas')}
          className="rounded-md border bg-white p-3 text-sm font-medium hover:bg-accent"
        >
          ⏰ Banco de Horas
        </button>
        <button
          onClick={() => router.push('/perfil')}
          className="rounded-md border bg-white p-3 text-sm font-medium hover:bg-accent"
        >
          👤 Perfil
        </button>
        <button
          onClick={() => router.push('/solicitacoes')}
          className="rounded-md border bg-white p-3 text-sm font-medium hover:bg-accent"
        >
          ✏️ Correção
        </button>
      </nav>

      <footer className="mt-auto pt-8 pb-4 text-center text-xs text-muted-foreground">
        Kairos Ponto • v0.2.0
      </footer>

      {/* Modal de validação facial */}
      {showFaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Validação Facial</h2>
            <FaceVerify
              onCapture={(data) => submitAttendance(data.faceToken)}
              onCancel={() => setShowFaceModal(false)}
            />
          </div>
        </div>
      )}
    </main>
    </>
  );
}
