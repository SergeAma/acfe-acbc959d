import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, Video, Music, File, Trash2, Save, Loader2, 
  GripVertical, Upload, Link, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getVideoEmbedInfo, isValidVideoUrl } from '@/lib/video-utils';
import { getAudioEmbedInfo, isValidAudioUrl } from '@/lib/audio-utils';
import { uploadMedia, validateFile } from '@/lib/storage-utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LessonItem {
  id: string;
  title: string;
  content_type: 'text' | 'video' | 'file' | 'audio';
  text_content: string | null;
  video_url: string | null;
  audio_url: string | null;
  file_url: string | null;
  file_name: string | null;
  duration_minutes: number | null;
  drip_delay_days: number | null;
}

interface SimplifiedLessonEditorProps {
  item: LessonItem;
  onDelete: () => void;
  onUpdate: () => void;
}

export const SimplifiedLessonEditor = ({ item, onDelete, onUpdate }: SimplifiedLessonEditorProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(!item.video_url && !item.audio_url && !item.file_url && !item.text_content);
  const [title, setTitle] = useState(item.title);
  const [textContent, setTextContent] = useState(item.text_content || '');
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    setTitle(item.title);
    setTextContent(item.text_content || '');
  }, [item]);

  const getIcon = () => {
    if (item.video_url) return <Video className="h-4 w-4 text-primary" />;
    if (item.audio_url) return <Music className="h-4 w-4 text-primary" />;
    if (item.file_url) return <File className="h-4 w-4 text-primary" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getMediaStatus = () => {
    if (item.video_url) {
      const embedInfo = getVideoEmbedInfo(item.video_url);
      return embedInfo.provider ? `Video (${embedInfo.provider})` : 'Video';
    }
    if (item.audio_url) return 'Audio';
    if (item.file_url) return item.file_name || 'File';
    if (item.text_content) return 'Text';
    return 'Empty';
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Lesson title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('course_content')
      .update({ 
        title: title.trim(),
        text_content: textContent || null 
      })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save lesson', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Lesson updated successfully' });
      setHasUnsavedChanges(false);
      onUpdate();
    }
    setSaving(false);
  };

  // Auto-detect and handle pasted URL
  const handlePasteUrl = async () => {
    if (!externalUrl.trim()) return;

    setSaving(true);
    
    // Detect media type from URL
    const videoInfo = getVideoEmbedInfo(externalUrl);
    const audioInfo = getAudioEmbedInfo(externalUrl);

    let updateData: Record<string, string | null> = {};
    let contentType: 'video' | 'audio' = 'video';

    if (videoInfo.isExternal) {
      updateData = { video_url: externalUrl.trim(), audio_url: null };
      contentType = 'video';
    } else if (audioInfo.isExternal) {
      updateData = { audio_url: externalUrl.trim(), video_url: null };
      contentType = 'audio';
    } else if (isValidVideoUrl(externalUrl)) {
      updateData = { video_url: externalUrl.trim(), audio_url: null };
      contentType = 'video';
    } else if (isValidAudioUrl(externalUrl)) {
      updateData = { audio_url: externalUrl.trim(), video_url: null };
      contentType = 'audio';
    } else {
      toast({ title: 'Invalid URL', description: 'Please enter a valid video or audio URL', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('course_content')
      .update({ ...updateData, content_type: contentType })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save media URL', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: `${contentType === 'video' ? 'Video' : 'Audio'} link added` });
      setExternalUrl('');
      onUpdate();
    }
    setSaving(false);
  };

  // Unified file upload - auto-detect type from file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Detect file type
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'file';

    // Validate file
    const validation = validateFile(file, mediaType);
    if (!validation.valid) {
      toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
      setUploading(false);
      return;
    }

    // Upload using centralized utility
    const result = await uploadMedia(file, mediaType, 'lesson', item.id);

    if (!result.success) {
      toast({ title: 'Upload failed', description: result.error || 'Failed to upload file', variant: 'destructive' });
      setUploading(false);
      return;
    }

    // Build update object based on file type
    const updateData: Record<string, string | null> = {
      video_url: null,
      audio_url: null,
      file_url: null,
      file_name: null,
    };

    if (isVideo) {
      updateData.video_url = result.url!;
    } else if (isAudio) {
      updateData.audio_url = result.url!;
    } else {
      updateData.file_url = result.url!;
      updateData.file_name = file.name;
    }

    const { error } = await supabase
      .from('course_content')
      .update({ ...updateData, content_type: mediaType })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save file', variant: 'destructive' });
    } else {
      toast({ title: 'Uploaded', description: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} uploaded successfully` });
      onUpdate();
    }
    setUploading(false);
  };

  const handleRemoveMedia = async () => {
    const { error } = await supabase
      .from('course_content')
      .update({ video_url: null, audio_url: null, file_url: null, file_name: null, content_type: 'text' })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove media', variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: 'Media removed from lesson' });
      onUpdate();
    }
  };

  const hasMedia = item.video_url || item.audio_url || item.file_url;

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Compact Header - Always visible */}
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-border/50">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {getIcon()}
          
          <div className="flex-1 min-w-0">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Lesson title..."
              className="h-9 font-medium border-0 bg-transparent px-2 focus-visible:ring-1"
              onBlur={() => {
                if (title !== item.title && title.trim()) {
                  handleSave();
                }
              }}
            />
          </div>
          
          <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">
            {getMediaStatus()}
          </Badge>
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Expandable Content */}
        <CollapsibleContent>
          <CardContent className="p-4 space-y-4">
            {/* Unified Media Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Media (optional)</label>
              
              {hasMedia ? (
                <div className="space-y-2">
                  {/* Media Preview */}
                  {item.video_url && (
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden max-h-48">
                      {getVideoEmbedInfo(item.video_url).isExternal ? (
                        <iframe
                          src={getVideoEmbedInfo(item.video_url).embedUrl || ''}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video controls className="w-full h-full">
                          <source src={item.video_url} type="video/mp4" />
                        </video>
                      )}
                    </div>
                  )}
                  
                  {item.audio_url && (
                    <audio controls className="w-full">
                      <source src={item.audio_url} />
                    </audio>
                  )}
                  
                  {item.file_url && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <File className="h-5 w-5 text-primary" />
                      <span className="text-sm truncate flex-1">{item.file_name || 'Attached file'}</span>
                    </div>
                  )}
                  
                  <Button variant="ghost" size="sm" onClick={handleRemoveMedia} className="text-destructive hover:text-destructive">
                    <X className="h-4 w-4 mr-1" />
                    Remove media
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Upload Button */}
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors min-h-[60px]">
                    <input
                      type="file"
                      accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="font-medium">Upload Media</span>
                      </>
                    )}
                  </label>
                  
                  {/* Paste URL */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="Paste video/audio URL..."
                        className="pl-9 h-[60px]"
                        onKeyDown={(e) => e.key === 'Enter' && handlePasteUrl()}
                      />
                    </div>
                    <Button onClick={handlePasteUrl} disabled={!externalUrl.trim() || saving} className="h-[60px]">
                      Add
                    </Button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Supports: YouTube, Vimeo, Loom, Spotify, or direct upload (video, audio, documents)
              </p>
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lesson Content</label>
              <RichTextEditor
                content={textContent}
                onChange={(content) => {
                  setTextContent(content);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Add lesson notes, instructions, or text content..."
              />
            </div>

            {/* Save Button */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
                <span className="text-xs text-amber-600">Unsaved changes</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
