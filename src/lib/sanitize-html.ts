import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify sanitization
 * Allows safe HTML elements typically used in rich text editors
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'hr'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'target', 'rel',
    'width', 'height', 'style'
  ],
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab with security attributes
  ADD_ATTR: ['target', 'rel'],
  // Prevent JavaScript URLs
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  // Remove script tags completely
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed']
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Safe for use with dangerouslySetInnerHTML
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  
  // Add security attributes to links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  
  // Remove the hook to prevent memory leaks
  DOMPurify.removeHook('afterSanitizeAttributes');
  
  return clean as string;
};

/**
 * Creates a sanitized HTML object for use with dangerouslySetInnerHTML
 * 
 * @param html - The HTML string to sanitize
 * @returns Object with __html property containing sanitized content
 */
export const createSafeHtml = (html: string | null | undefined): { __html: string } => {
  return { __html: sanitizeHtml(html) };
};
