/**
 * HTML Sanitization and XSS Prevention (BUG-01, BUG-02)
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

export function escapeHtml(str) {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    return String(str);
  }
  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

export function stripHtml(str) {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    return String(str);
  }
  return str.replace(/<[^>]*>/g, '').trim();
}

export function sanitizeProjectName(rawName, fallback = 'Proyecto CAD') {
  if (typeof rawName !== 'string') return fallback;
  const stripped = stripHtml(rawName).trim();
  if (!stripped) return fallback;
  return escapeHtml(stripped.slice(0, 120));
}

export function sanitizeLabel(rawLabel, maxLength = 80) {
  if (typeof rawLabel !== 'string') return '';
  const stripped = stripHtml(rawLabel).trim();
  if (!stripped) return '';
  return escapeHtml(stripped.slice(0, maxLength));
}
