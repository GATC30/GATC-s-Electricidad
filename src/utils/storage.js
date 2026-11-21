/**
 * LocalStorage Safe Wrapper with Quota Protection (BUG-03)
 */

export function isQuotaExceededError(err) {
  if (!err) return false;
  if (err instanceof DOMException) {
    return (
      err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('quota'))
  );
}

export function safeSetItem(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, error: 'localStorage not available' };
  }
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return { success: true };
  } catch (err) {
    const isQuota = isQuotaExceededError(err);
    const msg = isQuota
      ? 'Espacio de almacenamiento local lleno (cuota de localStorage excedida). Por favor libere espacio exportando o eliminando proyectos.'
      : `Error guardando en almacenamiento local: ${err.message || 'desconocido'}`;
    console.error(`[safeSetItem] Failed to write key "${key}":`, err);
    return { success: false, error: msg, isQuota };
  }
}

export function safeGetItem(key, defaultValue = null) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (err) {
    console.error(`[safeGetItem] Failed to read key "${key}":`, err);
    return defaultValue;
  }
}
