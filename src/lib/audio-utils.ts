/**
 * Utility functions for handling audio URLs and embedding
 */

export interface AudioEmbedInfo {
  isExternal: boolean;
  embedUrl: string | null;
  provider: 'spotify' | 'apple_music' | 'soundcloud' | 'youtube_music' | 'other' | null;
}

/**
 * Detects if a URL is an external audio service and returns embed info
 */
export function getAudioEmbedInfo(url: string): AudioEmbedInfo {
  if (!url) {
    return { isExternal: false, embedUrl: null, provider: null };
  }

  // Spotify patterns - handles tracks, episodes, playlists, albums
  const spotifyRegex = /(?:open\.spotify\.com|spotify\.com)\/(track|episode|album|playlist)\/([a-zA-Z0-9]+)/;
  const spotifyMatch = url.match(spotifyRegex);
  if (spotifyMatch) {
    return {
      isExternal: true,
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
      provider: 'spotify',
    };
  }

  // Apple Music patterns
  const appleMusicRegex = /music\.apple\.com\/([a-z]{2})\/(?:album|playlist|song)\/[^\/]+\/([a-zA-Z0-9]+)(?:\?i=(\d+))?/;
  const appleMusicMatch = url.match(appleMusicRegex);
  if (appleMusicMatch) {
    const country = appleMusicMatch[1];
    const albumId = appleMusicMatch[2];
    const songId = appleMusicMatch[3];
    const embedPath = songId ? `${country}/album/${albumId}?i=${songId}` : `${country}/album/${albumId}`;
    return {
      isExternal: true,
      embedUrl: `https://embed.music.apple.com/${embedPath}`,
      provider: 'apple_music',
    };
  }

  // SoundCloud patterns
  const soundcloudRegex = /soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
  const soundcloudMatch = url.match(soundcloudRegex);
  if (soundcloudMatch) {
    return {
      isExternal: true,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      provider: 'soundcloud',
    };
  }

  // YouTube Music patterns (redirects to regular YouTube)
  const youtubeMusicRegex = /music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
  const youtubeMusicMatch = url.match(youtubeMusicRegex);
  if (youtubeMusicMatch) {
    return {
      isExternal: true,
      embedUrl: `https://www.youtube.com/embed/${youtubeMusicMatch[1]}?rel=0&modestbranding=1`,
      provider: 'youtube_music',
    };
  }

  // Check if it's already an embed URL
  if (url.includes('embed') || url.includes('player')) {
    return {
      isExternal: true,
      embedUrl: url,
      provider: 'other',
    };
  }

  // Not an external audio service (likely a direct audio file)
  return { isExternal: false, embedUrl: null, provider: null };
}

/**
 * Validates if a URL looks like a valid audio URL
 */
export function isValidAudioUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    // Check for common audio patterns
    const audioPatterns = [
      /spotify\.com/,
      /music\.apple\.com/,
      /soundcloud\.com/,
      /music\.youtube\.com/,
      /\.mp3$/,
      /\.wav$/,
      /\.m4a$/,
      /\.ogg$/,
      /\.aac$/,
      /embed/,
      /player/,
    ];
    return audioPatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}

/**
 * Gets a user-friendly provider name
 */
export function getAudioProviderDisplayName(provider: AudioEmbedInfo['provider']): string {
  switch (provider) {
    case 'spotify':
      return 'Spotify';
    case 'apple_music':
      return 'Apple Music';
    case 'soundcloud':
      return 'SoundCloud';
    case 'youtube_music':
      return 'YouTube Music';
    case 'other':
      return 'External Audio';
    default:
      return 'Audio';
  }
}
