import { MediaItem, MediaType } from '../types';

/**
 * Extracts a YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  
  // Direct 11-char ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i;
  const match = cleanUrl.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Formats a clean YouTube privacy-enhanced embed URL for playback within an iframe
 */
export function getYouTubeEmbedUrl(urlOrId: string): string {
  const videoId = extractYouTubeId(urlOrId) || urlOrId;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
}

/**
 * Generates the high-res thumbnail for a YouTube video
 */
export function getYouTubeThumbnail(urlOrId: string): string {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Auto-detects media type based on URL extension or YouTube patterns
 */
export function detectMediaType(url: string): MediaType {
  if (!url) return 'image';
  const clean = url.trim();

  if (extractYouTubeId(clean)) {
    return 'youtube';
  }

  const urlWithoutQuery = clean.split('?')[0].split('#')[0].toLowerCase();

  // Video extensions
  if (
    urlWithoutQuery.endsWith('.mp4') ||
    urlWithoutQuery.endsWith('.webm') ||
    urlWithoutQuery.endsWith('.mov') ||
    urlWithoutQuery.endsWith('.m4v') ||
    urlWithoutQuery.endsWith('.ogv')
  ) {
    return 'video';
  }

  // Audio extensions
  if (
    urlWithoutQuery.endsWith('.mp3') ||
    urlWithoutQuery.endsWith('.wav') ||
    urlWithoutQuery.endsWith('.ogg') ||
    urlWithoutQuery.endsWith('.m4a') ||
    urlWithoutQuery.endsWith('.aac') ||
    urlWithoutQuery.endsWith('.flac') ||
    urlWithoutQuery.endsWith('.wma')
  ) {
    return 'audio';
  }

  return 'image';
}

/**
 * Converts legacy string array (from galleryImages) or partial items into full MediaItem objects.
 * When multimedia is defined (even as an empty array []), it is treated as authoritative,
 * preventing deleted media items from being revived from legacy gallery arrays.
 */
export function normalizeMediaList(
  multimedia?: MediaItem[],
  legacyGallery?: string[]
): MediaItem[] {
  // If multimedia is explicitly provided as an array, it is the authoritative list
  if (Array.isArray(multimedia)) {
    return multimedia
      .filter((item) => item && typeof item.url === 'string' && item.url.trim() !== '')
      .map((item, idx) => ({
        id: item.id || `media-${idx}-${Date.now()}`,
        type: item.type || detectMediaType(item.url),
        url: item.url.trim(),
        title: item.title || '',
        description: item.description || '',
        thumbnailUrl: item.thumbnailUrl || (item.type === 'youtube' ? getYouTubeThumbnail(item.url) : ''),
        caption: item.caption || '',
      }));
  }

  // Only if multimedia is undefined or null do we fall back to legacy galleryImages
  const items: MediaItem[] = [];
  if (legacyGallery && Array.isArray(legacyGallery)) {
    legacyGallery.forEach((url, idx) => {
      if (url && typeof url === 'string' && url.trim()) {
        const trimmed = url.trim();
        const type = detectMediaType(trimmed);
        items.push({
          id: `legacy-gallery-${idx}`,
          type,
          url: trimmed,
          title: `Photo ${idx + 1}`,
          thumbnailUrl: type === 'youtube' ? getYouTubeThumbnail(trimmed) : '',
        });
      }
    });
  }

  return items;
}
