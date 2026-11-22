import { useState, useEffect, useRef, useCallback } from 'react';
import { storageAdapter, SyncStatus } from '@/lib/storage';

export type AutoSaveStatus = 'saved' | 'saving' | 'error' | 'offline';

export interface UseAutoSaveOptions {
  debounceMs?: number;
  enabled?: boolean;
  onSaved?: (timestamp: number) => void;
  onError?: (error: unknown) => void;
}

export interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  statusText: string;
  lastSavedAt: Date | null;
  pendingSyncCount: number;
  isOnline: boolean;
  forceSave: () => Promise<boolean>;
}

export const AUTO_SAVE_LABELS: Record<AutoSaveStatus, { text: string; badgeClass: string; dotClass: string }> = {
  saved: {
    text: 'Guardado',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dotClass: 'bg-emerald-400'
  },
  saving: {
    text: 'Guardando...',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    dotClass: 'bg-amber-400 animate-pulse'
  },
  error: {
    text: 'Error de guardado',
    badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    dotClass: 'bg-rose-400'
  },
  offline: {
    text: 'Guardado local (Offline)',
    badgeClass: 'bg-slate-700/60 text-slate-300 border border-slate-600',
    dotClass: 'bg-slate-400'
  }
};

/**
 * Hook for automatic debounced saving (F6-06)
 * Debounce: 2 seconds by default.
 * Supports dual storage (IndexedDB + API sync) and network connectivity awareness.
 */
export function useAutoSave(
  projectId: string,
  projectName: string,
  state: any,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { debounceMs = 2000, enabled = true, onSaved, onError } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(() => storageAdapter.isOnline());

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateHashRef = useRef<string>('');
  const isInitialMount = useRef<boolean>(true);

  // Sync with storage adapter network and queue events
  useEffect(() => {
    const unsubscribe = storageAdapter.subscribeSync((syncStatus: SyncStatus, pendingCount: number) => {
      setPendingSyncCount(pendingCount);
      const online = storageAdapter.isOnline();
      setIsOnline(online);

      if (!online) {
        setStatus('offline');
      } else if (syncStatus === 'syncing') {
        setStatus('saving');
      } else if (syncStatus === 'error') {
        setStatus('error');
      } else if (syncStatus === 'synced') {
        setStatus('saved');
      }
    });

    return unsubscribe;
  }, []);

  // Core save execution
  const executeSave = useCallback(
    async (targetName: string, targetState: any): Promise<boolean> => {
      if (!projectId) return false;

      setStatus('saving');
      try {
        await storageAdapter.saveProject(projectId, targetName, targetState);
        const now = new Date();
        setLastSavedAt(now);

        const currentOnline = storageAdapter.isOnline();
        setIsOnline(currentOnline);
        setStatus(currentOnline ? 'saved' : 'offline');

        onSaved?.(now.getTime());
        return true;
      } catch (err) {
        console.error('[useAutoSave] Error during auto-save:', err);
        setStatus('error');
        onError?.(err);
        return false;
      }
    },
    [projectId, onSaved, onError]
  );

  // Force immediate save
  const forceSave = useCallback(async (): Promise<boolean> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    return executeSave(projectName, state);
  }, [executeSave, projectName, state]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !projectId) return;

    // Prevent saving on first mount before data is initialized
    if (isInitialMount.current) {
      isInitialMount.current = false;
      try {
        lastStateHashRef.current = JSON.stringify({ projectName, state });
      } catch {
        // ignore circular or serialization errors
      }
      return;
    }

    let currentHash = '';
    try {
      currentHash = JSON.stringify({ projectName, state });
    } catch {
      currentHash = String(Date.now());
    }

    if (currentHash === lastStateHashRef.current) {
      return;
    }

    lastStateHashRef.current = currentHash;
    setStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave(projectName, state);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [projectId, projectName, state, debounceMs, enabled, executeSave]);

  const statusText = AUTO_SAVE_LABELS[status]?.text || 'Guardado';

  return {
    status,
    statusText,
    lastSavedAt,
    pendingSyncCount,
    isOnline,
    forceSave
  };
}

export default useAutoSave;
