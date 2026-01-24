import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Link, Save, Loader2, Trash2, Video, Music, ExternalLink, Youtube } from 'lucide-react';
import { getVideoEmbedInfo, getProviderDisplayName } from '@/lib/video-utils';
import { getAudioEmbedInfo, getAudioProviderDisplayName } from '@/lib/audio-utils';
import { uploadMedia, validateFile, formatFileSize, MAX_FILE_SIZES } from '@/lib/storage-utils';

interface CourseDescriptionMediaProps {
  courseId: string;
  videoUrl: string | null;
  audioUrl: string | null;
  onUpdate: (videoUrl: string | null, audioUrl: string | null) => void;
}

export const CourseDescriptionMedia = ({
  courseId,
  videoUrl,
  audioUrl,
  onUpdate,
}: CourseDescriptionMediaProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  
  // Video state
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [savingVideoUrl, setSavingVideoUrl] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'external'>('upload');
  
  // Audio state
  const [externalAudioUrl, setExternalAudioUrl] = useState('');
  const [savingAudioUrl, setSavingAudioUrl] = useState(false);
  const [audioInputMode, setAudioInputMode] = useState<'upload' | 'external'>('upload');

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pre-upload validation
    const validation = validateFile(file, 'video');
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
      // Use centralized upload utility
      const result = await uploadMedia(file, 'video', 'description', courseId);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update database with the storage URL
      const { error: updateError } = await supabase
        .from('courses')
        .update({ description_video_url: result.url })
        .eq('id', courseId);

      if (updateError) throw updateError;

      onUpdate(result.url!, audioUrl);
      toast({ title: 'Success', description: 'Description video uploaded' });
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload video',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExternalVideoUrl = async () => {
    if (!externalVideoUrl.trim()) return;
    
    setSavingVideoUrl(true);
    try {
      const embedInfo = getVideoEmbedInfo(externalVideoUrl);
      if (!embedInfo.isExternal) {
        toast({
          title: 'Invalid URL',
          description: 'Please enter a valid YouTube, Vimeo, Loom, or Wistia URL',
          variant: 'destructive',
        });
        setSavingVideoUrl(false);
        return;
      }

      const { error } = await supabase
        .from('courses')
        .update({ description_video_url: externalVideoUrl.trim() })
        .eq('id', courseId);

      if (error) throw error;

      onUpdate(externalVideoUrl.trim(), audioUrl);
      setExternalVideoUrl('');
      toast({ title: 'Success', description: 'External video URL saved' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save video URL',
        variant: 'destructive',
      });
    } finally {
      setSavingVideoUrl(false);
    }
  };

  const handleRemoveVideo = async () => {
    const { error } = await supabase
      .from('courses')
      .update({ description_video_url: null })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove video',
        variant: 'destructive',
      });
    } else {
      onUpdate(null, audioUrl);
      toast({ title: 'Video removed' });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pre-upload validation
    const validation = validateFile(file, 'audio');
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
      // Use centralized upload utility - audio goes to course-videos bucket
      const result = await uploadMedia(file, 'audio', 'description', courseId);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update database with the storage URL
      const { error: updateError } = await supabase
        .from('courses')
        .update({ description_audio_url: result.url })
        .eq('id', courseId);

      if (updateError) throw updateError;

      onUpdate(videoUrl, result.url!);
      toast({ title: 'Success', description: 'Description audio uploaded' });
    } catch (error: any) {
      console.error('Audio upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload audio',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExternalAudioUrl = async () => {
    if (!externalAudioUrl.trim()) return;
    
    setSavingAudioUrl(true);
    try {
      const embedInfo = getAudioEmbedInfo(externalAudioUrl);
      if (!embedInfo.isExternal) {
        toast({
          title: 'Invalid URL',
          description: 'Please enter a valid Spotify, Apple Music, SoundCloud, or YouTube Music URL',
          variant: 'destructive',
        });
        setSavingAudioUrl(false);
        return;
      }

      const { error } = await supabase
        .from('courses')
        .update({ description_audio_url: externalAudioUrl.trim() })
        .eq('id', courseId);

      if (error) throw error;

      onUpdate(videoUrl, externalAudioUrl.trim());
      setExternalAudioUrl('');
      toast({ title: 'Success', description: 'External audio URL saved' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save audio URL',
        variant: 'destructive',
      });
    } finally {
      setSavingAudioUrl(false);
    }
  };

  const handleRemoveAudio = async () => {
    const { error } = await supabase
      .from('courses')
      .update({ description_audio_url: null })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove audio',
        variant: 'destructive',
      });
    } else {
      onUpdate(videoUrl, null);
      toast({ title: 'Audio removed' });
    }
  };

  const renderVideoPreview = () => {
    if (!videoUrl) return null;
    
    const embedInfo = getVideoEmbedInfo(videoUrl);
    if (embedInfo.isExternal && embedInfo.embedUrl) {
      return (
        <div className="space-y-2">
          <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden max-h-48">
            <iframe
              src={embedInfo.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video preview"
            />
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1.5 text-xs">
              {embedInfo.provider === 'youtube' ? <Youtube className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
              {getProviderDisplayName(embedInfo.provider)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleRemoveVideo} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <video controls className="w-full rounded-md max-h-48">
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleRemoveVideo} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    );
  };

  const renderAudioPreview = () => {
    if (!audioUrl) return null;
    
    const embedInfo = getAudioEmbedInfo(audioUrl);
    if (embedInfo.isExternal && embedInfo.embedUrl) {
      return (
        <div className="space-y-2">
          <div className="relative w-full rounded-md overflow-hidden">
            <iframe
              src={embedInfo.embedUrl}
              className="w-full"
              style={{ height: embedInfo.provider === 'spotify' ? '152px' : embedInfo.provider === 'soundcloud' ? '166px' : '80px' }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Audio preview"
            />
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Music className="h-3 w-3" />
              {getAudioProviderDisplayName(embedInfo.provider)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleRemoveAudio} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <audio controls className="w-full">
          <source src={audioUrl} />
          Your browser does not support the audio tag.
        </audio>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleRemoveAudio} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-6 border-t pt-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium">Course Introduction Media</h3>
        <Badge variant="outline" className="text-xs">Optional</Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-4 mb-4">
        Add a video or audio introduction for learners who prefer watching or listening over reading.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Introduction Video</Label>
          </div>
          
          {videoUrl && (
            <div className="mb-3">
              {renderVideoPreview()}
              <p className="text-xs text-muted-foreground mt-2">Replace video:</p>
            </div>
          )}

          <Tabs value={videoInputMode} onValueChange={(v) => setVideoInputMode(v as 'upload' | 'external')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-1.5 text-xs">
                <Upload className="h-3 w-3" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="external" className="gap-1.5 text-xs">
                <Link className="h-3 w-3" />
                External
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-2 space-y-2">
              <Input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                disabled={uploading}
                className="text-xs"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading...
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="external" className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={externalVideoUrl}
                  onChange={(e) => setExternalVideoUrl(e.target.value)}
                  className="flex-1 text-xs"
                />
                <Button 
                  onClick={handleSaveExternalVideoUrl} 
                  disabled={savingVideoUrl || !externalVideoUrl.trim()}
                  size="sm"
                >
                  {savingVideoUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs"><Youtube className="h-2.5 w-2.5 mr-1" />YouTube</Badge>
                <Badge variant="outline" className="text-xs">Vimeo</Badge>
                <Badge variant="outline" className="text-xs">Loom</Badge>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Audio Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Introduction Audio</Label>
          </div>
          
          {audioUrl && (
            <div className="mb-3">
              {renderAudioPreview()}
              <p className="text-xs text-muted-foreground mt-2">Replace audio:</p>
            </div>
          )}

          <Tabs value={audioInputMode} onValueChange={(v) => setAudioInputMode(v as 'upload' | 'external')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-1.5 text-xs">
                <Upload className="h-3 w-3" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="external" className="gap-1.5 text-xs">
                <Link className="h-3 w-3" />
                External
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-2 space-y-2">
              <Input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                disabled={uploading}
                className="text-xs"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading...
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="external" className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://open.spotify.com/track/..."
                  value={externalAudioUrl}
                  onChange={(e) => setExternalAudioUrl(e.target.value)}
                  className="flex-1 text-xs"
                />
                <Button 
                  onClick={handleSaveExternalAudioUrl} 
                  disabled={savingAudioUrl || !externalAudioUrl.trim()}
                  size="sm"
                >
                  {savingAudioUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs"><Music className="h-2.5 w-2.5 mr-1" />Spotify</Badge>
                <Badge variant="outline" className="text-xs">Apple Music</Badge>
                <Badge variant="outline" className="text-xs">SoundCloud</Badge>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
