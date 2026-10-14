import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Database, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ConnectionStatus = 'checking' | 'online' | 'offline';

const CHECK_INTERVAL_MS = 30_000;

export function DatabaseStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const inFlight = useRef(false);

  const checkConnection = useCallback(async () => {
    if (inFlight.current) return;

    inFlight.current = true;
    setStatus('checking');
    const startedAt = performance.now();

    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;

      setResponseTime(Math.round(performance.now() - startedAt));
      setStatus('online');
    } catch {
      setResponseTime(null);
      setStatus('offline');
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    const intervalId = window.setInterval(() => void checkConnection(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [checkConnection]);

  const appearance = {
    checking: {
      label: 'A verificar ligação…',
      icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
      classes: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    online: {
      label: `Online · ${responseTime ?? 0} ms`,
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
      classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    offline: {
      label: 'Offline · Erro de rede',
      icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
      classes: 'border-rose-200 bg-rose-50 text-rose-800',
    },
  }[status];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        type="button"
        onClick={() => void checkConnection()}
        disabled={status === 'checking'}
        aria-label={`Estado da base de dados: ${appearance.label}. ${status === 'checking' ? '' : 'Clique para atualizar.'}`}
        title={status === 'offline' ? 'Não foi possível consultar a tabela profiles' : 'Clique para verificar agora'}
        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-lg shadow-slate-900/10 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-wait disabled:hover:translate-y-0 ${appearance.classes}`}
      >
        <Database className="h-4 w-4" aria-hidden="true" />
        <span className="flex items-center gap-1.5" role="status" aria-live="polite">
          {appearance.icon}
          {appearance.label}
        </span>
        {status !== 'checking' && <RefreshCw className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
      </button>
    </div>
  );
}
