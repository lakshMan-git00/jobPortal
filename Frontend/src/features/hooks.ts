import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiSend } from '../services/client';
import { queryClient } from '../services/query';
import { useUi } from '../services/ui';
export function useData<T>(path: string, enabled = true, poll = false) {
  return useQuery({
    queryKey: [path],
    queryFn: () => apiGet<T>(path),
    enabled,
    refetchInterval: poll ? 15000 : false,
  });
}
export function useAction<T = unknown>(
  action: (input: T) => Promise<unknown>,
  message = 'Changes saved.',
) {
  const notify = useUi((state) => state.notify);
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'session' });
      if (message) notify(message);
    },
  });
}
export function useWrite(path: string, method = 'POST', message?: string) {
  return useAction((input: unknown) => apiSend(path, method, input), message);
}
export function useDebounce<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
