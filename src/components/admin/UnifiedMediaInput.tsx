import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Link2, Loader2, X, Video, Music, ExternalLink, Check } from 'lucide-react';
import { uploadMedia, validateFile, formatFileSize, MAX_FILE_SIZES } from '@/lib/storage-utils';
import { getVideoEmbedInfo, isValidVideoUrl, getProviderDisplayName } from '@/lib/video-utils';
import { getAudioEmbedInfo, isValidAudioUrl, getAudioProviderDisplayName } from '@/lib/audio-utils';

export type MediaProvider = 'cloudinary' | 'youtube' | 'vimeo' | 'loom' | 'wistia' | 'spotify' | 'soundcloud' | 'storage' | 'external' | 'other';
export type MediaType = 'video' | 'audio';

interface MediaData {
  url: string;
  type: MediaType;
  provider: MediaProvider;
  duration?: number;
}

interface UnifiedMediaInputProps {
  currentUrl: string | null;
  onMediaChange: (media: MediaData | null) => Promise<void>;
  contentId: string;
  context: 'lesson' | 'description';
  disabled?: boolean;
}

/**
 * Unified Media Input Component
 * 
 * DESIGN PRINCIPLES:
 * - Single media block per lesson (not separate video/audio)
 * - Auto-detects media type from input
 * - Two modes: Upload OR Paste Link
 * - No technical choices exposed to mentors
 * 
 * MEDIA CONTRACT:
 * - Lovable stores: media_url, media_type, provider
 * - Upload → Backend → Cloudinary → Returns branded URL
 * - External links stored directly with provider metadata
 */
export const UnifiedMediaInput = ({
  currentUrl,
  onMediaChange,
  contentId,
  context,
  disabled = false,
}: UnifiedMediaInputProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');
  const [externalUrl, setExternalUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detect current media info
  const currentMedia = currentUrl ? detectMediaInfo(currentUrl) : null;

  // Detect media type and provider from URL
  function detectMediaInfo(url: string): { type: MediaType; provider: MediaProvider; displayName: string } {
    // Check video providers first
    const videoEmbed = getVideoEmbedInfo(url);
    if (videoEmbed.isExternal) {
      return { 
        type: 'video', 
        provider: (videoEmbed.provider === 'other' ? 'external' : videoEmbed.provider) as MediaProvider,
        displayName: getProviderDisplayName(videoEmbed.provider)
      };
    }

    // Check audio providers
    const audioEmbed = getAudioEmbedInfo(url);
    if (audioEmbed.isExternal) {
      return { 
        type: 'audio', 
        provider: (audioEmbed.provider === 'other' ? 'external' : audioEmbed.provider) as MediaProvider,
        displayName: getAudioProviderDisplayName(audioEmbed.provider)
      };
    }

    // Check file extension for uploaded files
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
    if (ext && ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return { type: 'video', provider: 'storage', displayName: 'Uploaded Video' };
    }
    if (ext && ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
      return { type: 'audio', provider: 'storage', displayName: 'Uploaded Audio' };
    }

    // Default to video/external for unknown URLs
    return { type: 'video', provider: 'external', displayName: 'External Media' };
  }

  // Handle file upload (video or audio)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Detect if video or audio based on MIME type
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a video or audio file',
        variant: 'destructive',
      });
      return;
    }

    const mediaType: MediaType = isVideo ? 'video' : 'audio';

    // Validate file
    const validation = validateFile(file, mediaType);
    if (!validation.valid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const result = await uploadMedia(file, mediaType, context, contentId);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      await onMediaChange({
        url: result.url!,
        type: mediaType,
        provider: 'storage',
      });

      toast({
        title: 'Success',
        description: `${isVideo ? 'Video' : 'Audio'} uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload media',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle external URL submission
  const handleExternalUrl = async () => {
    if (!externalUrl.trim()) return;

    const url = externalUrl.trim();

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL starting with http:// or https://',
        variant: 'destructive',
      });
      return;
    }

    // Check if it's a recognized video URL
    const isVideo = isValidVideoUrl(url);
    const isAudio = isValidAudioUrl(url);

    if (!isVideo && !isAudio) {
      // Check if it looks like a direct media file
      const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
      const isMediaFile = ext && ['mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a'].includes(ext);
      
      if (!isMediaFile) {
        toast({
          title: 'Unsupported URL',
          description: 'Please enter a YouTube, Vimeo, Loom, Spotify, SoundCloud, or direct media file URL',
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);

    try {
      const mediaInfo = detectMediaInfo(url);
      
      await onMediaChange({
        url,
        type: mediaInfo.type,
        provider: mediaInfo.provider,
      });

      setExternalUrl('');
      toast({
        title: 'Success',
        description: 'Media link saved',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save media link',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove current media
  const handleRemoveMedia = async () => {
    setSaving(true);
    try {
      await onMediaChange(null);
      setExternalUrl('');
      toast({
        title: 'Success',
        description: 'Media removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove media',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // If media already exists, show preview with remove option
  if (currentUrl && currentMedia) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Media</Label>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="p-2 rounded-md bg-primary/10">
            {currentMedia.type === 'video' ? (
              <Video className="h-5 w-5 text-primary" />
            ) : (
              <Music className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              {currentMedia.displayName}
              <Check className="h-4 w-4 text-green-500" />
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentUrl.length > 50 ? `${currentUrl.slice(0, 50)}...` : currentUrl}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveMedia}
            disabled={saving || disabled}
            className="text-destructive hover:text-destructive"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  // No media - show upload/link options
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Media (optional)</Label>
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'upload' | 'link')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" disabled={disabled}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="link" disabled={disabled}>
            <Link2 className="h-4 w-4 mr-2" />
            Paste Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || disabled}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || disabled}
              className="w-full h-24 border-dashed flex flex-col gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span>Click to upload video or audio</span>
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Max: {formatFileSize(MAX_FILE_SIZES.VIDEO)} video, {formatFileSize(MAX_FILE_SIZES.AUDIO)} audio
            </p>
          </div>
        </TabsContent>

        <TabsContent value="link" className="mt-3">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Paste YouTube, Vimeo, Loom, or audio URL..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                disabled={saving || disabled}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExternalUrl();
                  }
                }}
              />
              <Button
                onClick={handleExternalUrl}
                disabled={saving || !externalUrl.trim() || disabled}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports: YouTube, Vimeo, Loom, Wistia, Spotify, SoundCloud
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
