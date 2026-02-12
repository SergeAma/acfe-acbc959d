/**
 * Strips HTML tags from a string for plain text display
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  // Strip tags then decode common HTML entities
  const text = html.replace(/<[^>]*>/g, '');
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (textarea) {
    textarea.innerHTML = text;
    return textarea.value;
  }
  // Fallback: decode the most common entities manually
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};
