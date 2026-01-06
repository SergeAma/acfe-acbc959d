/**
 * Content moderation utility for community posts and user-generated content
 * Filters profanity, offensive language, and spam patterns
 */

// Common profanity and offensive words (case-insensitive matching)
const BLOCKED_PATTERNS = [
  // English profanity
  /\bf+u+c+k+/gi,
  /\bs+h+i+t+/gi,
  /\ba+s+s+h+o+l+e+/gi,
  /\bb+i+t+c+h+/gi,
  /\bd+a+m+n+/gi,
  /\bc+u+n+t+/gi,
  /\bn+i+g+g+/gi,
  /\bf+a+g+/gi,
  /\br+e+t+a+r+d+/gi,
  /\bw+h+o+r+e+/gi,
  /\bs+l+u+t+/gi,
  /\bp+o+r+n+/gi,
  /\bd+i+c+k+/gi,
  /\bc+o+c+k+/gi,
  /\bp+u+s+s+y+/gi,
  // French profanity
  /\bm+e+r+d+e+/gi,
  /\bp+u+t+a+i+n+/gi,
  /\bs+a+l+o+p+e+/gi,
  /\bc+o+n+n+a+r+d+/gi,
  /\be+n+c+u+l+/gi,
  /\bn+i+q+u+e+/gi,
  // Spam patterns
  /\b(buy now|click here|earn money fast|free money|make \$\d+)/gi,
  /\b(telegram|whatsapp|signal)\s*[+@]/gi,
  // Contact info spam
  /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // Phone numbers
];

// Less severe words that get flagged but not blocked
const WARNING_PATTERNS = [
  /\bstupid+/gi,
  /\bidiot+/gi,
  /\bdumb+/gi,
  /\bhate+/gi,
];

export interface ModerationResult {
  isAllowed: boolean;
  hasWarnings: boolean;
  sanitizedContent: string;
  blockedTerms: string[];
  warningTerms: string[];
}

/**
 * Moderates user-generated content
 * @param content - The content to moderate
 * @returns ModerationResult with details about the content
 */
export const moderateContent = (content: string): ModerationResult => {
  const blockedTerms: string[] = [];
  const warningTerms: string[] = [];
  let sanitizedContent = content;

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      blockedTerms.push(...matches);
      // Replace with asterisks
      sanitizedContent = sanitizedContent.replace(pattern, (match) => 
        match[0] + '*'.repeat(match.length - 2) + match[match.length - 1]
      );
    }
  }

  // Check for warning patterns
  for (const pattern of WARNING_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      warningTerms.push(...matches);
    }
  }

  // Remove duplicate terms
  const uniqueBlocked = [...new Set(blockedTerms.map(t => t.toLowerCase()))];
  const uniqueWarnings = [...new Set(warningTerms.map(t => t.toLowerCase()))];

  return {
    isAllowed: uniqueBlocked.length === 0,
    hasWarnings: uniqueWarnings.length > 0,
    sanitizedContent,
    blockedTerms: uniqueBlocked,
    warningTerms: uniqueWarnings,
  };
};

/**
 * Quick check if content contains any blocked terms
 * @param content - The content to check
 * @returns boolean indicating if content is clean
 */
export const isContentClean = (content: string): boolean => {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return false;
    }
  }
  return true;
};

/**
 * Sanitizes content by removing/replacing offensive terms
 * @param content - The content to sanitize
 * @returns Sanitized content string
 */
export const sanitizeUserContent = (content: string): string => {
  let sanitized = content;
  
  for (const pattern of BLOCKED_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.length <= 2) return '**';
      return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    });
  }
  
  return sanitized;
};
