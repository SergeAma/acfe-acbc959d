/**
 * HTML Entity Escaping Utility
 * 
 * SECURITY: All user-provided data MUST be escaped before rendering in emails
 * to prevent XSS and HTML injection attacks.
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param text - User-provided text to escape
 * @returns Escaped string safe for HTML rendering
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }
  
  if (typeof text !== 'string') {
    text = String(text);
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escape multiple values and return as object
 * Useful for escaping all user fields at once
 */
export function escapeUserFields<T extends Record<string, string | null | undefined>>(
  fields: T
): { [K in keyof T]: string } {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = escapeHtml(value);
  }
  return result as { [K in keyof T]: string };
}

/**
 * Escape URL for use in href attributes
 * Validates URL and prevents javascript: and data: protocol attacks
 */
export function escapeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  const trimmedUrl = url.trim();
  
  // Block dangerous protocols
  const lowerUrl = trimmedUrl.toLowerCase();
  if (lowerUrl.startsWith('javascript:') || 
      lowerUrl.startsWith('data:') || 
      lowerUrl.startsWith('vbscript:')) {
    return '';
  }
  
  // Encode special characters in URL
  try {
    const urlObj = new URL(trimmedUrl);
    return urlObj.toString();
  } catch {
    // If not a valid URL, escape as HTML
    return escapeHtml(trimmedUrl);
  }
}
