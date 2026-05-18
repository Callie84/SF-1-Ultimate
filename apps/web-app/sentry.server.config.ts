import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Server-Side: alle Fehler tracken
  tracesSampleRate: 0.1,

  // Sensible Daten nicht loggen
  beforeSend(event) {
    // Cookies und Auth-Header aus Events entfernen
    if (event.request?.cookies) {
      event.request.cookies = {};
    }
    if (event.request?.headers?.['authorization']) {
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
