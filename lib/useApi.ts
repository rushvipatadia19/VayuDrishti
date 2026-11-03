'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}

