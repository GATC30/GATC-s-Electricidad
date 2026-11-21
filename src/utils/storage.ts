/**
 * Safe localStorage wrapper with QuotaExceededError protection and user notification (BUG-03).
 */

export type StorageErrorListener = (message: string, isQuota: boolean) => void;

const errorListeners: Set<StorageErrorListener> = new Set();

/**
 * Subscribe to storage error events (e.g., to trigger a Toast notification).
 */
export function onStorageError(callback: StorageErrorListener): () => void {
  errorListeners.add(callback);
  return () => {
    errorListeners.delete(callback);
  };
}

/**
 * Dispatch error notification to all registered listeners.
 */
function notifyStorageError(message: string, isQuota: boolean): void {
  errorListeners.forEach((listener) => {
    try {
      listener(message, isQuota);
    } catch (e) {
      console.error('Error in storage error listener:', e);
    }
  });
}

/**
 * Determines whether an error is a browser storage quota exceeded error.
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException) {
    return (
      err.code === 22 || // Legacy QUOTA_EXCEEDED_ERR
      err.code === 1014 || // Firefox NS_ERROR_DOM_QUOTA_REACHED
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  const e = err as { name?: string; message?: string };
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (typeof e.message === 'string' && e.message.toLowerCase().includes('quota'))
  );
}

/**
 * Safely writes a value to localStorage with quota check and user notification.
 */
export function safeSetItem(
  key: string,
  value: unknown
): { success: boolean; error?: string; isQuota?: boolean } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, error: 'localStorage is not available in this environment' };
  }

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return { success: true };
  } catch (err) {
    const isQuota = isQuotaExceededError(err);
    const message = isQuota
      ? 'Espacio de almacenamiento local lleno (cuota excedida). Por favor exporte y elimine proyectos para liberar espacio.'
      : `Error al guardar datos en el navegador: ${(err as Error)?.message || 'desconocido'}`;

    console.error(`[safeSetItem] Failed to write key "${key}":`, err);
    notifyStorageError(message, isQuota);

    return {
      success: false,
      error: message,
      isQuota
    };
  }
}

/**
 * Safely reads a value from localStorage with JSON parsing fallback.
 */
export function safeGetItem<T = unknown>(key: string, defaultValue: T | null = null): T | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch (err) {
    console.error(`[safeGetItem] Failed to read key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Safely removes a key from localStorage.
 */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`[safeRemoveItem] Failed to remove key "${key}":`, err);
    return false;
  }
}
