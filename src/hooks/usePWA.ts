'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  promptPWAInstall,
  isStandalonePWA
} from '@/lib/pwa';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsStandalone(isStandalonePWA());
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInstallable = () => setIsInstallable(true);
    const handleInstalled = () => setIsInstallable(false);

    window.addEventListener('gatc-pwa-installable', handleInstallable);
    window.addEventListener('gatc-pwa-installed', handleInstalled);

    // Register SW
    registerServiceWorker(() => {
      setIsUpdateAvailable(true);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('gatc-pwa-installable', handleInstallable);
      window.removeEventListener('gatc-pwa-installed', handleInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    const success = await promptPWAInstall();
    if (success) {
      setIsInstallable(false);
    }
    return success;
  }, []);

  const reloadAndUpdate = useCallback(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      });
    }
  }, []);

  return {
    isInstallable,
    isOffline,
    isUpdateAvailable,
    isStandalone,
    installApp,
    reloadAndUpdate
  };
}
