import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Video, File, Trash2, Save, Loader2, GripVertical, Copy, MoveRight, Pencil, X, Link, Upload, ExternalLink, Youtube, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getVideoEmbedInfo, isValidVideoUrl, getProviderDisplayName } from '@/lib/video-utils';
import { getAudioEmbedInfo, isValidAudioUrl, getAudioProviderDisplayName } from '@/lib/audio-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextEditor } from '@/components/RichTextEditor';
import { createSafeHtml } from '@/lib/sanitize-html';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SectionInfo {
  id: string;
  title: string;
}

interface ContentItem {
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

interface ContentItemEditorProps {
  item: ContentItem;
  onDelete: () => void;
  onUpdate: () => void;
  onDuplicate?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  otherSections?: SectionInfo[];
  onMoveToSection?: (targetSectionId: string) => void;
}

export const ContentItemEditor = ({ 
  item, 
  onDelete, 
  onUpdate, 
  onDuplicate, 
  isSelected, 
  onSelect,
  otherSections,
  onMoveToSection 
}: ContentItemEditorProps) => {
  const { toast } = useToast();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [savingTitle, setSavingTitle] = useState(false);
  
  const [editingContent, setEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(item.text_content || '');
  const [savingContent, setSavingContent] = useState(false);
  
  const [editingSettings, setEditingSettings] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(item.duration_minutes || 0);
  const [dripDelayDays, setDripDelayDays] = useState(item.drip_delay_days || 0);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  
  // External video URL state
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [savingExternalUrl, setSavingExternalUrl] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'external'>('upload');

  // External audio URL state
  const [externalAudioUrl, setExternalAudioUrl] = useState('');
  const [savingAudioUrl, setSavingAudioUrl] = useState(false);
  const [audioInputMode, setAudioInputMode] = useState<'upload' | 'external'>('upload');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Keep local state in sync with prop changes
  useEffect(() => {
    setEditedTitle(item.title);
    setEditedContent(item.text_content || '');
    setDurationMinutes(item.duration_minutes || 0);
    setDripDelayDays(item.drip_delay_days || 0);
    
    // Determine if the current video is external
    if (item.video_url) {
      const embedInfo = getVideoEmbedInfo(item.video_url);
      if (embedInfo.isExternal) {
        setVideoInputMode('external');
        setExternalVideoUrl(item.video_url);
      } else {
        setVideoInputMode('upload');
        setExternalVideoUrl('');
      }
    }
    
    // Determine if the current audio is external
    if (item.audio_url) {
      const embedInfo = getAudioEmbedInfo(item.audio_url);
      if (embedInfo.isExternal) {
        setAudioInputMode('external');
        setExternalAudioUrl(item.audio_url);
      } else {
        setAudioInputMode('upload');
        setExternalAudioUrl('');
      }
    }
  }, [item]);

  const getIcon = () => {
    switch (item.content_type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return;
    setSavingTitle(true);
    
    const { error } = await supabase
      .from('course_content')
      .update({ title: editedTitle.trim() })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update title',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Title updated',
      });
      setEditingTitle(false);
      onUpdate();
    }
    setSavingTitle(false);
  };

  const handleSaveContent = async () => {
    setSavingContent(true);
    
    const { error } = await supabase
      .from('course_content')
      .update({ text_content: editedContent || null })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update content',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Content updated',
      });
      setEditingContent(false);
      onUpdate();
    }
    setSavingContent(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    
    const { error } = await supabase
      .from('course_content')
      .update({
        duration_minutes: durationMinutes || null,
        drip_delay_days: dripDelayDays || 0,
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Settings updated',
      });
      setEditingSettings(false);
      onUpdate();
    }
    setSavingSettings(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${item.id}-${Date.now()}.${fileExt}`;
    const filePath = `lessons/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('course-videos')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: 'Error',
        description: 'Failed to upload video',
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('course-videos')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('course_content')
      .update({ video_url: publicUrl })
      .eq('id', item.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update video URL',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Video uploaded successfully',
      });
      onUpdate();
    }
    setUploading(false);
  };

  const handleSaveExternalVideoUrl = async () => {
    if (!externalVideoUrl.trim()) return;
    
    if (!isValidVideoUrl(externalVideoUrl)) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube, Vimeo, Loom, or Wistia video URL',
        variant: 'destructive',
      });
      return;
    }
    
    setSavingExternalUrl(true);
    
    const { error } = await supabase
      .from('course_content')
      .update({ video_url: externalVideoUrl.trim() })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save video URL',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'External video URL saved',
      });
      onUpdate();
    }
    setSavingExternalUrl(false);
  };

  const handleRemoveVideo = async () => {
    const { error } = await supabase
      .from('course_content')
      .update({ video_url: null })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove video',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Video removed',
      });
      setExternalVideoUrl('');
      onUpdate();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${item.id}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('course-files')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('course_content')
      .update({ 
        file_url: publicUrl,
        file_name: file.name 
      })
      .eq('id', item.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update file',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
      onUpdate();
    }
    setUploading(false);
  };

  // Audio upload handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${item.id}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: 'Error',
        description: 'Failed to upload audio',
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('course-files')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('course_content')
      .update({ audio_url: publicUrl })
      .eq('id', item.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update audio URL',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Audio uploaded successfully',
      });
      onUpdate();
    }
    setUploading(false);
  };

  const handleSaveExternalAudioUrl = async () => {
    if (!externalAudioUrl.trim()) return;
    
    if (!isValidAudioUrl(externalAudioUrl)) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid Spotify, Apple Music, SoundCloud, or audio file URL',
        variant: 'destructive',
      });
      return;
    }
    
    setSavingAudioUrl(true);
    
    const { error } = await supabase
      .from('course_content')
      .update({ audio_url: externalAudioUrl.trim() })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save audio URL',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'External audio URL saved',
      });
      onUpdate();
    }
    setSavingAudioUrl(false);
  };

  const handleRemoveAudio = async () => {
    const { error } = await supabase
      .from('course_content')
      .update({ audio_url: null })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove audio',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Audio removed',
      });
      setExternalAudioUrl('');
      onUpdate();
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
          )}
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="mt-1">{getIcon()}</div>
          <div className="flex-1 space-y-4">
            {/* Title Section - Inline Editable */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {editingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="h-8 font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') {
                          setEditingTitle(false);
                          setEditedTitle(item.title);
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSaveTitle} 
                      disabled={savingTitle || !editedTitle.trim()} 
                      size="sm" 
                      variant="ghost"
                    >
                      {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingTitle(false);
                        setEditedTitle(item.title);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-2 cursor-pointer group hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-all"
                    onClick={() => setEditingTitle(true)}
                    title="Click to edit title"
                  >
                    <h4 className="font-medium group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <Badge variant="outline" className="capitalize ml-2">
                  {item.content_type}
                </Badge>
              </div>
              <div className="flex gap-1">
                {onDuplicate && (
                  <Button size="sm" variant="ghost" onClick={onDuplicate} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                {otherSections && otherSections.length > 0 && onMoveToSection && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" title="Move to section">
                        <MoveRight className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {otherSections.map(s => (
                        <DropdownMenuItem 
                          key={s.id} 
                          onClick={() => onMoveToSection(s.id)}
                        >
                          {s.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button size="sm" variant="ghost" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Text Content - Rich Text Editing with full toolbar always visible */}
            {item.content_type === 'text' && (
              <div className="space-y-3">
                <RichTextEditor
                  content={editedContent}
                  onChange={(content) => {
                    setEditedContent(content);
                    setEditingContent(true);
                  }}
                  placeholder="Enter your lesson content here..."
                />
                {editingContent && (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleSaveContent} 
                      disabled={savingContent} 
                      size="sm"
                      className="gap-2"
                    >
                      {savingContent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Content
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingContent(false);
                        setEditedContent(item.text_content || '');
                      }}
                    >
                      Cancel
                    </Button>
                    <span className="text-xs text-amber-600 ml-2">You have unsaved changes</span>
                  </div>
                )}
              </div>
            )}

            {/* Video Upload/External Link */}
            {item.content_type === 'video' && (
              <div className="space-y-3">
                {item.video_url ? (
                  <div className="space-y-3">
                    {/* Show current video preview */}
                    {(() => {
                      const embedInfo = getVideoEmbedInfo(item.video_url);
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
                            <source src={item.video_url} type="video/mp4" />
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
                    })()}
                    <p className="text-xs text-muted-foreground">Replace video:</p>
                  </div>
                ) : null}

                <Tabs value={videoInputMode} onValueChange={(v) => setVideoInputMode(v as 'upload' | 'external')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </TabsTrigger>
                    <TabsTrigger value="external" className="gap-1.5">
                      <Link className="h-3.5 w-3.5" />
                      External Link
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="mt-3 space-y-2">
                    <Label className="text-sm text-muted-foreground">Upload a video file</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="external" className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Paste a video URL from YouTube, Vimeo, Loom, or Wistia
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://youtube.com/watch?v=..."
                          value={externalVideoUrl}
                          onChange={(e) => setExternalVideoUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSaveExternalVideoUrl} 
                          disabled={savingExternalUrl || !externalVideoUrl.trim()}
                          size="sm"
                        >
                          {savingExternalUrl ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Youtube className="h-3 w-3 mr-1" />
                        YouTube
                      </Badge>
                      <Badge variant="outline" className="text-xs">Vimeo</Badge>
                      <Badge variant="outline" className="text-xs">Loom</Badge>
                      <Badge variant="outline" className="text-xs">Wistia</Badge>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Audio Upload/External Link */}
            {item.content_type === 'audio' && (
              <div className="space-y-3">
                {item.audio_url ? (
                  <div className="space-y-3">
                    {/* Show current audio preview */}
                    {(() => {
                      const embedInfo = getAudioEmbedInfo(item.audio_url);
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
                            <source src={item.audio_url} />
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
                    })()}
                    <p className="text-xs text-muted-foreground">Replace audio:</p>
                  </div>
                ) : null}

                <Tabs value={audioInputMode} onValueChange={(v) => setAudioInputMode(v as 'upload' | 'external')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </TabsTrigger>
                    <TabsTrigger value="external" className="gap-1.5">
                      <Link className="h-3.5 w-3.5" />
                      External Link
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="mt-3 space-y-2">
                    <Label className="text-sm text-muted-foreground">Upload an audio file</Label>
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="external" className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Paste an audio URL from Spotify, Apple Music, SoundCloud, or YouTube Music
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://open.spotify.com/track/..."
                          value={externalAudioUrl}
                          onChange={(e) => setExternalAudioUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSaveExternalAudioUrl} 
                          disabled={savingAudioUrl || !externalAudioUrl.trim()}
                          size="sm"
                        >
                          {savingAudioUrl ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Music className="h-3 w-3 mr-1" />
                        Spotify
                      </Badge>
                      <Badge variant="outline" className="text-xs">Apple Music</Badge>
                      <Badge variant="outline" className="text-xs">SoundCloud</Badge>
                      <Badge variant="outline" className="text-xs">YouTube Music</Badge>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Transcript Section for Audio (Podcast-style) */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Transcript / Show Notes</Label>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>
                  {editingContent ? (
                    <div className="space-y-2">
                      <RichTextEditor
                        content={editedContent}
                        onChange={setEditedContent}
                        placeholder="Add transcript, show notes, or episode description..."
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveContent} 
                          disabled={savingContent} 
                          size="sm"
                        >
                          {savingContent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Transcript
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingContent(false);
                            setEditedContent(item.text_content || '');
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group">
                      {item.text_content ? (
                        <div 
                          className="text-sm text-muted-foreground prose prose-sm max-w-none cursor-pointer hover:bg-muted/50 rounded-md p-3 border border-dashed"
                          onClick={() => setEditingContent(true)}
                        >
                          <div dangerouslySetInnerHTML={createSafeHtml(item.text_content)} />
                          <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="h-3 w-3" />
                            Click to edit transcript
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingContent(true)}
                          className="text-muted-foreground w-full justify-start"
                        >
                          <Pencil className="h-3 w-3 mr-2" />
                          Add transcript or show notes...
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File Upload */}
            {item.content_type === 'file' && (
              <div className="space-y-2">
                {item.file_url ? (
                  <div className="space-y-2">
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {item.file_name || 'Download file'}
                    </a>
                    <p className="text-xs text-muted-foreground">Replace file:</p>
                  </div>
                ) : (
                  <Label>Upload File</Label>
                )}
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              </div>
            )}

            {/* Settings: Duration & Drip Delay - Collapsible */}
            <div className="border-t pt-3 mt-3">
              {editingSettings ? (
                <div className="space-y-3">
                  {(item.content_type === 'video' || item.content_type === 'file' || item.content_type === 'audio') && (
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                        min="0"
                        className="h-8"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Drip Delay (days after enrollment)</Label>
                    <Input
                      type="number"
                      value={dripDelayDays}
                      onChange={(e) => setDripDelayDays(parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="0 = available immediately"
                      className="h-8"
                    />
                    <p className="text-xs text-muted-foreground">
                      Days after enrollment before this content becomes available
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSettings} disabled={savingSettings} size="sm">
                      {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingSettings(false);
                        setDurationMinutes(item.duration_minutes || 0);
                        setDripDelayDays(item.drip_delay_days || 0);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-xs text-muted-foreground group">
                  {(item.content_type === 'video' || item.content_type === 'file' || item.content_type === 'audio') && item.duration_minutes && (
                    <span>Duration: {item.duration_minutes} min</span>
                  )}
                  {item.drip_delay_days ? (
                    <span>Available after {item.drip_delay_days} days</span>
                  ) : (
                    <span>Available immediately</span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
                    onClick={() => setEditingSettings(true)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit Settings
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
