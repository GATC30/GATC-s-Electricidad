import { useState, useCallback, useRef } from 'react';

export interface UseHistoryOptions<T> {
  maxHistory?: number;
  onApplySnapshot?: (snapshot: T) => void;
}

export interface UseHistoryReturn<T> {
  pushState: (state: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: (initialState?: T) => void;
  historyLength: number;
  currentIndex: number;
}

export function useHistory<T>(
  initialState?: T,
  options: UseHistoryOptions<T> = {}
): UseHistoryReturn<T> {
  const maxHistory = options.maxHistory || 50; // Requirement F4-06: max 50 states
  const [history, setHistory] = useState<T[]>(initialState ? [initialState] : []);
  const [currentIndex, setCurrentIndex] = useState<number>(initialState ? 0 : -1);

  // Keep ref for immediate synchronous access
  const historyRef = useRef<T[]>(initialState ? [initialState] : []);
  const indexRef = useRef<number>(initialState ? 0 : -1);

  const pushState = useCallback(
    (newState: T) => {
      // Discard future redo history if we made an edit from a past step
      const current = historyRef.current.slice(0, indexRef.current + 1);

      // Deep serialize or clone check if desired, or store snapshot
      const updated = [...current, newState];

      // Limit to maxHistory items
      if (updated.length > maxHistory) {
        updated.shift();
      }

      historyRef.current = updated;
      indexRef.current = updated.length - 1;

      setHistory(updated);
      setCurrentIndex(indexRef.current);
    },
    [maxHistory]
  );

  const undo = useCallback((): T | null => {
    if (indexRef.current > 0) {
      const nextIndex = indexRef.current - 1;
      indexRef.current = nextIndex;
      setCurrentIndex(nextIndex);

      const targetSnapshot = historyRef.current[nextIndex];
      if (options.onApplySnapshot) {
        options.onApplySnapshot(targetSnapshot);
      }
      return targetSnapshot;
    }
    return null;
  }, [options]);

  const redo = useCallback((): T | null => {
    if (indexRef.current < historyRef.current.length - 1) {
      const nextIndex = indexRef.current + 1;
      indexRef.current = nextIndex;
      setCurrentIndex(nextIndex);

      const targetSnapshot = historyRef.current[nextIndex];
      if (options.onApplySnapshot) {
        options.onApplySnapshot(targetSnapshot);
      }
      return targetSnapshot;
    }
    return null;
  }, [options]);

  const clearHistory = useCallback((resetState?: T) => {
    const fresh = resetState ? [resetState] : [];
    historyRef.current = fresh;
    indexRef.current = resetState ? 0 : -1;
    setHistory(fresh);
    setCurrentIndex(indexRef.current);
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    historyLength: history.length,
    currentIndex
  };
}
