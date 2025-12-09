/**
 * Strips HTML tags from a string for plain text display
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};
