/**
 * Sanitization and HTML-escaping utilities for GATC.
 * Prevents Cross-Site Scripting (XSS) in project names, device labels,
 * and user-supplied metadata (BUG-01, BUG-02).
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escapes characters that have special meaning in HTML to prevent XSS.
 */
export function escapeHtml(str: unknown): string {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    return String(str);
  }
  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strips all HTML tags from an input string.
 */
export function stripHtml(str: unknown): string {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    return String(str);
  }
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitizes a project name:
 * - Trims whitespace
 * - Strips raw HTML tags
 * - Escapes remaining HTML entities
 * - Enforces safe length limits
 * - Falls back to a default name if empty
 */
export function sanitizeProjectName(
  rawName: unknown,
  fallback: string = 'Proyecto CAD'
): string {
  if (typeof rawName !== 'string') return fallback;
  const stripped = stripHtml(rawName);
  const trimmed = stripped.trim();
  if (!trimmed) return fallback;
  // Truncate to maximum 120 characters to prevent UI overflow / buffer exploitation
  const truncated = trimmed.slice(0, 120);
  return escapeHtml(truncated);
}

/**
 * Sanitizes an electrical device or box label.
 */
export function sanitizeLabel(rawLabel: unknown, maxLength: number = 80): string {
  if (typeof rawLabel !== 'string') return '';
  const stripped = stripHtml(rawLabel);
  const trimmed = stripped.trim();
  if (!trimmed) return '';
  const truncated = trimmed.slice(0, maxLength);
  return escapeHtml(truncated);
}

/**
 * Sanitizes generic user text attributes (e.g., custom materials, notes).
 */
export function sanitizeText(rawText: unknown, maxLength: number = 500): string {
  if (typeof rawText !== 'string') return '';
  const stripped = stripHtml(rawText);
  return escapeHtml(stripped.trim().slice(0, maxLength));
}
