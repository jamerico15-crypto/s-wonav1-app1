import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useProjectAccess } from '@/context/ProjectAccessContext';

interface RealtimeOptions {
  orderBy?: { column: string; ascending?: boolean };
  select?: string;
}

export function useRealtimeTable<T extends { id: string }>(
  table: string,
  options: RealtimeOptions = {}
) {
  const { isAdmin, projectIds, loading: accessLoading } = useProjectAccess();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isProjectScoped = ['projects', 'activities', 'indicators', 'beneficiaries', 'project_districts', 'kobo_activity_mappings'].includes(table);
  const orderByColumn = options.orderBy?.column;
  const orderByAscending = options.orderBy?.ascending;

  const rowIsAuthorized = useCallback((row: unknown) => {
    if (isAdmin || !isProjectScoped) return true;
    if (!row || typeof row !== 'object') return false;
    const record = row as Record<string, unknown>;
    const rowProjectId = table === 'projects' ? record.id : record.project_id;
    return typeof rowProjectId === 'string' && projectIds.includes(rowProjectId);
  }, [isAdmin, isProjectScoped, projectIds, table]);

  const load = useCallback(async () => {
    if (accessLoading) return;
    setLoading(true);
    if (isProjectScoped && !isAdmin && projectIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from(table).select(options.select ?? '*');
      if (orderByColumn) {
        query = query.order(orderByColumn, { ascending: orderByAscending ?? false });
      }
      if (isProjectScoped && !isAdmin) {
        query = query.in(table === 'projects' ? 'id' : 'project_id', projectIds);
      }
      const { data: result, error } = await query;
      if (error) {
        console.error(`[useRealtimeTable] ${table} fetch error:`, error.message);
      } else {
        setData(((result ?? []) as unknown[]).filter(rowIsAuthorized) as T[]);
      }
    } catch (error) {
      console.error(`[useRealtimeTable] ${table} fetch failed:`, error);
    } finally {
      setLoading(false);
    }
  }, [accessLoading, isAdmin, isProjectScoped, projectIds, rowIsAuthorized, table, options.select, orderByColumn, orderByAscending]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!rowIsAuthorized(payload.new)) return;
          setData((prev) => {
            const newRow = payload.new as T;
            if (prev.some((r) => r.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const rowId = (payload.new as T).id;
          setData((prev) => rowIsAuthorized(payload.new)
            ? prev.map((r) => r.id === rowId ? payload.new as T : r)
            : prev.filter(row => row.id !== rowId));
        } else if (payload.eventType === 'DELETE') {
          setData((prev) => prev.filter((r) => r.id !== (payload.old as T).id));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, load, rowIsAuthorized]);

  return { data, setData, loading, reload: load };
}
