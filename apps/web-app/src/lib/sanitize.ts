import DOMPurify from 'isomorphic-dompurify';

/**
 * Bereinigt HTML-Inhalt — erlaubt nur sichere Tags.
 * Verwendung: überall wo dangerouslySetInnerHTML mit User-Content.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'rel', 'target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Entfernt allen HTML-Code — gibt Plain-Text zurück.
 * Verwendung: Meta-Descriptions, Vorschauen, Tooltips.
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
