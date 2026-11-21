'use client';

import { useEffect } from 'react';
import * as Engine from '@/engine';

export function EngineInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).GATC_ENGINE = Engine;
    }
  }, []);

  return null;
}
