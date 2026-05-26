// Sentry Instrumentation — MUSS vor allen anderen Imports sein!
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request?.headers?.['authorization']) {
      delete event.request.headers['authorization'];
    }
    if (event.request?.cookies) {
      event.request.cookies = {};
    }
    return event;
  },
});

export default Sentry;
