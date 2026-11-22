/**
 * GATC Error Monitoring & Performance Tracking (F11-05)
 * Captures exceptions, breadcrumbs, and metrics for production observability.
 */

export interface ErrorContext {
  component?: string;
  componentStack?: string;
  projectId?: string;
  phase?: number;
  [key: string]: any;
}

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  data?: Record<string, any>;
}

class MonitoringService {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 30;
  private timers: Map<string, number> = new Map();
  private isInitialized = false;

  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Listen for uncaught window errors
    window.addEventListener('error', (event) => {
      this.captureException(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureException(error, { source: 'unhandledrejection' });
    });

    console.log('[GATC Monitoring] Sistema de observabilidad inicializado.');
  }

  addBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      category,
      message,
      data
    });

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  captureException(error: Error, context?: ErrorContext): void {
    const errorPayload = {
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      breadcrumbs: [...this.breadcrumbs],
      environment: process.env.NODE_ENV || 'production'
    };

    console.error('[GATC Monitoring Exception]', errorPayload);

    // If Sentry DSN or external tracking endpoint is configured, send telemetry
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (sentryDsn && typeof fetch !== 'undefined') {
      try {
        fetch('/api/monitoring/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorPayload)
        }).catch(() => {});
      } catch (_) {}
    }
  }

  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string): number | null {
    const start = this.timers.get(name);
    if (start === undefined) return null;
    const duration = performance.now() - start;
    this.timers.delete(name);
    this.addBreadcrumb('performance', `Timer ${name}: ${duration.toFixed(2)}ms`, { duration });
    return duration;
  }
}

export const monitoring = new MonitoringService();

export function reportError(error: Error, context?: ErrorContext): void {
  monitoring.captureException(error, context);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
  monitoring.addBreadcrumb(category, message, data);
}

export function startTimer(name: string): void {
  monitoring.startTimer(name);
}

export function endTimer(name: string): number | null {
  return monitoring.endTimer(name);
}
