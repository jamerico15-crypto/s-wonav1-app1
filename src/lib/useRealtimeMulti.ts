import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface TableConfig {
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
}

export function useRealtimeMulti<T extends Record<string, unknown>>(
  configs: Record<string, TableConfig>
) {
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const entries = Object.entries(configs);
    const results = await Promise.all(
      entries.map(async ([key, cfg]) => {
        let query = supabase.from(cfg.table).select(cfg.select ?? '*');
        if (cfg.orderBy) {
          query = query.order(cfg.orderBy.column, { ascending: cfg.orderBy.ascending ?? false });
        }
        const { data: result } = await query;
        return [key, result ?? []] as const;
      })
    );
    setData(Object.fromEntries(results));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase.channel('realtime-multi');

    for (const [key, cfg] of Object.entries(configs)) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: cfg.table },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => ({
              ...prev,
              [key]: [payload.new, ...(prev[key] ?? [])],
            }));
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) => ({
              ...prev,
              [key]: (prev[key] ?? []).map((r: any) =>
                r.id === (payload.new as any).id ? payload.new : r
              ),
            }));
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => ({
              ...prev,
              [key]: (prev[key] ?? []).filter((r: any) => r.id !== (payload.old as any).id),
            }));
          }
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { data, loading, reload: load };
}
