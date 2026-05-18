import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance Monitoring: 10% der Requests tracken
  tracesSampleRate: 0.1,

  // Session Replay: 1% normal, 100% bei Fehler
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Eigene Fehler ignorieren (z.B. Netzwerkabbrüche)
  ignoreErrors: [
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'AbortError',
  ],
});
