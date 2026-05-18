/**
 * Plausible Analytics — Custom Events (Session 77)
 * Sendet Events an analytics.seedfinderpro.de
 * Kein Tracking wenn Plausible-Script nicht geladen ist (fail-safe)
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

function track(event: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return;
  if (typeof window.plausible !== 'function') return;
  window.plausible(event, props ? { props } : undefined);
}

// ─── Custom Events ────────────────────────────────────────────────────────────

/** Wird beim Erstellen eines neuen Grows ausgelöst */
export function trackGrowCreated(strainName?: string) {
  track('grow_created', strainName ? { strain: strainName } : undefined);
}

/** Wird beim Erstellen eines Forum-Beitrags (Thread oder Reply) ausgelöst */
export function trackPostCreated(type: 'thread' | 'reply') {
  track('post_created', { type });
}

/** Wird bei Nutzung des Rechners/Konfigurators ausgelöst */
export function trackCalculatorUsed(calculator: string) {
  track('calculator_used', { calculator });
}

/** Wird beim Aufrufen einer Strain-Detailseite ausgelöst */
export function trackStrainViewed(strainSlug: string) {
  track('strain_viewed', { slug: strainSlug });
}

/** Wird nach erfolgreicher Registrierung ausgelöst (Goal: Registrierung) */
export function trackRegistration() {
  track('signup');
}

/** Wird beim Erstellen des ersten Grows ausgelöst (Goal: erster Grow) */
export function trackFirstGrow() {
  track('first_grow');
}

/** Wird beim ersten Forum-Post ausgelöst (Goal: erster Post) */
export function trackFirstPost() {
  track('first_post');
}
