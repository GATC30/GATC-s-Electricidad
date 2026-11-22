/**
 * GATC PWA Engine & Service Worker Registration (F10-03)
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateCallback: (() => void) | null = null;

/**
 * Registers the Service Worker in production/supported environments.
 */
export function registerServiceWorker(onUpdate?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  updateCallback = onUpdate || null;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[GATC PWA] Service Worker registrado con alcance:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[GATC PWA] Nueva versión disponible.');
              if (updateCallback) {
                updateCallback();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[GATC PWA] Falló el registro del Service Worker:', error);
      });
  });

  // Listen for PWA installation candidate prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('gatc-pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('[GATC PWA] Aplicación instalada exitosamente.');
    window.dispatchEvent(new CustomEvent('gatc-pwa-installed'));
  });
}

/**
 * Triggers native PWA install prompt if available.
 */
export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (err) {
    console.error('[GATC PWA] Error al solicitar instalación:', err);
    return false;
  }
}

/**
 * Checks if app is running as standalone PWA.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}
