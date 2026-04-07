#!/usr/bin/env node
/**
 * HTTP Client mit Retry-Logik und Timeout
 * Zentrale Stelle für alle API-Requests in Tests
 */

const TIMEOUT_MS = 8000;

/**
 * Mache einen HTTP Request mit Retry
 * @param {string} method - GET, POST, DELETE, PATCH, etc.
 * @param {string} url - volle URL, z.B. http://172.28.0.11:3001/api/auth/register
 * @param {Object} options
 *   - body: Request body (wird JSON stringified)
 *   - token: Bearer token für Authorization header
 *   - expectStatus: erwarteter Status oder Array von Statussen (wenn unerwartet: ok=false, keine Exception)
 *   - label: Human-readable Beschreibung für Logs
 *   - retries: Anzahl Retry-Versuche (default: 2, nur bei retryable Fehlern)
 *   - retryDelay: Basis Verzögerung in ms (default: 500, exponential backoff)
 * @returns {Promise<Object>} - { ok, status, data, error }
 *   - ok: true wenn status im expectStatus-Set
 *   - status: HTTP-Status-Code oder null bei Netzwerkfehler
 *   - data: geparster JSON oder null
 *   - error: String mit Fehlermeldung bei Fehler
 */
export async function request(method, url, {
  body = null,
  token = null,
  expectStatus = 200,
  label = '',
  retries = 2,
  retryDelay = 500,
} = {}) {
  const statusSet = Array.isArray(expectStatus) ? new Set(expectStatus) : new Set([expectStatus]);
  const expectedStr = Array.from(statusSet).join(', ');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const text = await res.text();

      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      // Erfolgreich erhalten, prüfe Status
      if (statusSet.has(res.status)) {
        return { ok: true, status: res.status, data, error: null };
      }

      // Unexpected status, aber nicht retryable
      return {
        ok: false,
        status: res.status,
        data,
        error: `Unexpected HTTP ${res.status} (expected ${expectedStr})`,
      };
    } catch (e) {
      const err = e.message || String(e);
      const isRetryable = err.includes('ECONNREFUSED')
        || err.includes('ETIMEDOUT')
        || err.includes('aborted');

      // Bei letztem Versuch oder non-retryable error: zurückgeben
      if (attempt === retries || !isRetryable) {
        return {
          ok: false,
          status: null,
          data: null,
          error: `${method} ${url} → ${err}`,
        };
      }

      // Exponential backoff vor nächstem Versuch
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Mache einen HTTP Request, wirfe aber Exception bei unerwartetem Status
 * Für Verwendung in before()-Hooks wo Fehler critical sind
 *
 * @param {string} method
 * @param {string} url
 * @param {Object} options - wie request()
 * @returns {Promise<Object>} - { ok, status, data } oder wirft AssertionError
 */
export async function requestOrThrow(method, url, options = {}) {
  const { ok, status, data, error } = await request(method, url, options);

  if (!ok) {
    const label = options.label || `${method} ${url}`;
    throw new Error(`${label} failed: ${error}`);
  }

  return { ok, status, data };
}

/**
 * Utility: warte auf Bedingung oder timeout
 * Nützlich für Tests die auf Daten-Konsistenz warten
 *
 * @param {Function} checkFn - async function die true/false returnt
 * @param {number} maxWaitMs - max Wartezeit (default: 5000)
 * @param {number} intervalMs - Check-Intervall (default: 100)
 * @returns {Promise<boolean>} - true wenn Bedingung erfüllt, false bei Timeout
 */
export async function waitFor(checkFn, maxWaitMs = 5000, intervalMs = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await checkFn()) {
      return true;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }

  return false;
}
