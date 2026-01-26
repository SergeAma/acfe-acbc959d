/**
 * SINGLE SOURCE OF TRUTH: LMS Media Storage Architecture
 * 
 * This file defines the canonical storage strategy for all media in the LMS.
 * ALL upload, preview, and playback components MUST use these utilities.
 * 
 * BUCKET STRATEGY:
 * ┌─────────────────────┬─────────────────────────────────────────────────────┐
 * │ Bucket              │ Purpose                                             │
 * ├─────────────────────┼─────────────────────────────────────────────────────┤
 * │ course-videos       │ Private. All lesson videos & audio (signed URLs)   │
 * │ course-files        │ Private. Downloadable resources (PDFs, docs)       │
 * │ course-thumbnails   │ Public. Marketing images only                       │
 * └─────────────────────┴─────────────────────────────────────────────────────┘
 * 
 * PATH CONVENTIONS:
 * - Course description media: descriptions/{courseId}/{filename}
 * - Lesson videos:            lessons/{lessonId}/{filename}
 * - Lesson audio:             lessons/{lessonId}/{filename}
 * - Lesson files:             files/{lessonId}/{filename}
 * - Thumbnails:               {courseId}/{filename}
 * 
 * NAMING STRATEGY:
 * - Format: {contentId}-{type}-{timestamp}.{ext}
 * - Example: abc123-video-1706123456789.mp4
 * 
 * ACCESS RULES:
 * - course-videos: Requires enrollment OR mentor ownership OR admin role
 * - course-files:  Requires enrollment OR mentor ownership OR admin role  
 * - course-thumbnails: Public read, mentor/admin write
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// CONSTANTS - Centralized Configuration
// ============================================================

export const STORAGE_BUCKETS = {
  VIDEOS: 'course-videos',      // Private - videos & audio
  FILES: 'course-files',        // Private - downloadable files
  THUMBNAILS: 'course-thumbnails', // Public - marketing images
} as const;

export const STORAGE_PATHS = {
  DESCRIPTIONS: 'descriptions', // Course-level intro media
  LESSONS: 'lessons',           // Lesson content
  FILES: 'files',               // Downloadable resources
} as const;

// Maximum file sizes in bytes
export const MAX_FILE_SIZES = {
  VIDEO: 500 * 1024 * 1024,     // 500MB
  AUDIO: 100 * 1024 * 1024,     // 100MB
  FILE: 50 * 1024 * 1024,       // 50MB
  THUMBNAIL: 5 * 1024 * 1024,   // 5MB
} as const;

// Accepted MIME types
export const ACCEPTED_TYPES = {
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-m4v'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  FILE: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// ============================================================
// TYPES
// ============================================================

export type MediaType = 'video' | 'audio' | 'file' | 'thumbnail';
export type UploadContext = 'description' | 'lesson';

export interface UploadConfig {
  bucket: string;
  path: string;
  maxSize: number;
  acceptedTypes: readonly string[];
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filePath?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================
// VALIDATION - Pre-upload checks
// ============================================================

/**
 * Validates a file before upload
 */
export function validateFile(
  file: File,
  mediaType: MediaType
): ValidationResult {
  // Check file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Get config for this media type
  const config = getUploadConfig(mediaType, 'lesson', 'temp');

  // Check file size
  if (file.size > config.maxSize) {
    const maxMB = Math.round(config.maxSize / (1024 * 1024));
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${maxMB}MB` 
    };
  }

  // Check MIME type
  if (!config.acceptedTypes.some(type => file.type.startsWith(type.split('/')[0]))) {
    return { 
      valid: false, 
      error: `Invalid file type. Accepted: ${config.acceptedTypes.join(', ')}` 
    };
  }

  return { valid: true };
}

// ============================================================
// PATH GENERATION - Deterministic, collision-free paths
// ============================================================

/**
 * Generates a storage file path following the canonical structure
 */
export function generateStoragePath(
  mediaType: MediaType,
  context: UploadContext,
  contentId: string,
  fileName: string
): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
  const timestamp = Date.now();
  const sanitizedId = contentId.replace(/[^a-zA-Z0-9-]/g, '');
  
  const baseName = `${sanitizedId}-${mediaType}-${timestamp}.${ext}`;

  switch (context) {
    case 'description':
      return `${STORAGE_PATHS.DESCRIPTIONS}/${sanitizedId}/${baseName}`;
    case 'lesson':
      if (mediaType === 'file') {
        return `${STORAGE_PATHS.FILES}/${sanitizedId}/${baseName}`;
      }
      return `${STORAGE_PATHS.LESSONS}/${sanitizedId}/${baseName}`;
    default:
      return baseName;
  }
}

/**
 * Gets the appropriate bucket for a media type
 */
export function getBucketForMediaType(mediaType: MediaType): string {
  switch (mediaType) {
    case 'video':
    case 'audio':
      return STORAGE_BUCKETS.VIDEOS;
    case 'file':
      return STORAGE_BUCKETS.FILES;
    case 'thumbnail':
      return STORAGE_BUCKETS.THUMBNAILS;
    default:
      return STORAGE_BUCKETS.FILES;
  }
}

/**
 * Gets the full upload configuration for a media type
 */
export function getUploadConfig(
  mediaType: MediaType,
  context: UploadContext,
  contentId: string
): UploadConfig {
  const bucket = getBucketForMediaType(mediaType);
  
  switch (mediaType) {
    case 'video':
      return {
        bucket,
        path: context === 'description' 
          ? `${STORAGE_PATHS.DESCRIPTIONS}/${contentId}` 
          : `${STORAGE_PATHS.LESSONS}/${contentId}`,
        maxSize: MAX_FILE_SIZES.VIDEO,
        acceptedTypes: ACCEPTED_TYPES.VIDEO,
      };
    case 'audio':
      return {
        bucket,
        path: context === 'description'
          ? `${STORAGE_PATHS.DESCRIPTIONS}/${contentId}`
          : `${STORAGE_PATHS.LESSONS}/${contentId}`,
        maxSize: MAX_FILE_SIZES.AUDIO,
        acceptedTypes: ACCEPTED_TYPES.AUDIO,
      };
    case 'file':
      return {
        bucket,
        path: `${STORAGE_PATHS.FILES}/${contentId}`,
        maxSize: MAX_FILE_SIZES.FILE,
        acceptedTypes: ACCEPTED_TYPES.FILE,
      };
    case 'thumbnail':
      return {
        bucket,
        path: contentId,
        maxSize: MAX_FILE_SIZES.THUMBNAIL,
        acceptedTypes: ACCEPTED_TYPES.IMAGE,
      };
    default:
      throw new Error(`Unknown media type: ${mediaType}`);
  }
}

// ============================================================
// UPLOAD - Unified upload with validation and verification
// ============================================================

/**
 * Uploads a file to storage with full validation and verification
 * This is the ONLY function that should be used for uploads.
 */
export async function uploadMedia(
  file: File,
  mediaType: MediaType,
  context: UploadContext,
  contentId: string
): Promise<UploadResult> {
  // 1. Pre-upload validation
  const validation = validateFile(file, mediaType);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 2. Generate deterministic path
  const bucket = getBucketForMediaType(mediaType);
  const filePath = generateStoragePath(mediaType, context, contentId, file.name);

  try {
    // 3. Upload with upsert for idempotency
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { 
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { 
        success: false, 
        error: uploadError.message || 'Failed to upload file' 
      };
    }

    // 4. Build the URL
    // For public buckets, get public URL
    // For private buckets, store the path - signed URLs are generated on access
    if (bucket === STORAGE_BUCKETS.THUMBNAILS) {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      // Add cache buster for thumbnails
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      return { success: true, url: urlWithCacheBust, filePath };
    }

    // For private buckets, construct the storage URL
    // The edge function will generate signed URLs when needed
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
    
    return { success: true, url: storageUrl, filePath };

  } catch (err: any) {
    console.error('Upload exception:', err);
    return { 
      success: false, 
      error: err.message || 'Upload failed unexpectedly' 
    };
  }
}

// ============================================================
// URL HELPERS
// ============================================================

/**
 * Checks if a URL is an external video/audio service
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  
  const externalPatterns = [
    /youtube\.com/,
    /youtu\.be/,
    /vimeo\.com/,
    /wistia\.com/,
    /loom\.com/,
    /spotify\.com/,
    /soundcloud\.com/,
    /music\.apple\.com/,
  ];
  
  return externalPatterns.some(pattern => pattern.test(url));
}

/**
 * Extracts bucket and path from a Supabase storage URL
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  
  // Match pattern: /storage/v1/object/public/bucket/path or /storage/v1/object/bucket/path
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
  if (publicMatch) {
    return { bucket: publicMatch[1], path: publicMatch[2] };
  }
  
  const privateMatch = url.match(/\/storage\/v1\/object\/([^\/]+)\/(.+)/);
  if (privateMatch) {
    return { bucket: privateMatch[1], path: privateMatch[2] };
  }
  
  return null;
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
