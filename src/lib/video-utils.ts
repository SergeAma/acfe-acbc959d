/**
 * Utility functions for handling video URLs and embedding
 */

export interface VideoEmbedInfo {
  isExternal: boolean;
  embedUrl: string | null;
  provider: 'youtube' | 'vimeo' | 'wistia' | 'loom' | 'other' | null;
}

/**
 * Detects if a URL is an external video service and returns embed info
 */
export function getVideoEmbedInfo(url: string): VideoEmbedInfo {
  if (!url) {
    return { isExternal: false, embedUrl: null, provider: null };
  }

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return {
      isExternal: true,
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`,
      provider: 'youtube',
    };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return {
      isExternal: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      provider: 'vimeo',
    };
  }

  // Wistia patterns
  const wistiaRegex = /(?:wistia\.com\/medias\/|wi\.st\/medias\/)([a-zA-Z0-9]+)/;
  const wistiaMatch = url.match(wistiaRegex);
  if (wistiaMatch) {
    return {
      isExternal: true,
      embedUrl: `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`,
      provider: 'wistia',
    };
  }

  // Loom patterns
  const loomRegex = /(?:loom\.com\/share\/|loom\.com\/embed\/)([a-zA-Z0-9]+)/;
  const loomMatch = url.match(loomRegex);
  if (loomMatch) {
    return {
      isExternal: true,
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      provider: 'loom',
    };
  }

  // Check if it's already an embed URL or iframe src
  if (url.includes('embed') || url.includes('player')) {
    return {
      isExternal: true,
      embedUrl: url,
      provider: 'other',
    };
  }

  // Not an external video (likely a direct video file)
  return { isExternal: false, embedUrl: null, provider: null };
}

/**
 * Validates if a URL looks like a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    // Check for common video patterns
    const videoPatterns = [
      /youtube\.com/,
      /youtu\.be/,
      /vimeo\.com/,
      /wistia\.com/,
      /wi\.st/,
      /loom\.com/,
      /\.mp4$/,
      /\.webm$/,
      /\.mov$/,
      /embed/,
      /player/,
    ];
    return videoPatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}

/**
 * Gets a user-friendly provider name
 */
export function getProviderDisplayName(provider: VideoEmbedInfo['provider']): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube';
    case 'vimeo':
      return 'Vimeo';
    case 'wistia':
      return 'Wistia';
    case 'loom':
      return 'Loom';
    case 'other':
      return 'External Video';
    default:
      return 'Video';
  }
}
