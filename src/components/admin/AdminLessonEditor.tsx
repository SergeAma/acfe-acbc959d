import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, Video, Trash2, Save, Loader2, 
  GripVertical, ChevronDown, ChevronUp, Youtube, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LessonItem {
  id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  video_url: string | null;
  sort_order: number;
}

interface AdminLessonEditorProps {
  item: LessonItem;
  onDelete: () => void;
  onUpdate: () => void;
  sectionDescription?: string | null;
}

// Validate YouTube URL and extract video ID
function validateYouTubeUrl(url: string): { valid: boolean; videoId?: string; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: 'YouTube URL is required' };
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return { valid: true, videoId: match[1] };
    }
  }

  return { valid: false, error: 'Invalid YouTube URL. Please use a valid youtube.com or youtu.be link.' };
}

// Get YouTube embed URL
function getYouTubeEmbedUrl(url: string): string | null {
  const validation = validateYouTubeUrl(url);
  if (validation.valid && validation.videoId) {
    return `https://www.youtube.com/embed/${validation.videoId}?rel=0&modestbranding=1`;
  }
  return null;
}

export const AdminLessonEditor = ({ item, onDelete, onUpdate, sectionDescription }: AdminLessonEditorProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(!item.video_url && !item.text_content);
  const [title, setTitle] = useState(item.title);
  const [textContent, setTextContent] = useState(item.text_content || '');
  const [youtubeUrl, setYoutubeUrl] = useState(item.video_url || '');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

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
    setYoutubeUrl(item.video_url || '');
  }, [item]);

  const getIcon = () => {
    if (item.video_url) return <Video className="h-4 w-4 text-primary" />;
    if (item.text_content) return <FileText className="h-4 w-4 text-primary" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatus = () => {
    if (item.video_url) return 'YouTube Video';
    if (item.text_content) return 'Text Only';
    return 'Empty';
  };

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setHasUnsavedChanges(true);
    
    if (url.trim()) {
      const validation = validateYouTubeUrl(url);
      if (!validation.valid) {
        setUrlError(validation.error || 'Invalid URL');
      } else {
        setUrlError(null);
      }
    } else {
      setUrlError(null);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Lesson title is required', variant: 'destructive' });
      return;
    }

    // Validate YouTube URL if provided
    let finalVideoUrl: string | null = null;
    if (youtubeUrl.trim()) {
      const validation = validateYouTubeUrl(youtubeUrl);
      if (!validation.valid) {
        toast({ title: 'Invalid YouTube URL', description: validation.error, variant: 'destructive' });
        return;
      }
      finalVideoUrl = youtubeUrl.trim();
    }

    setSaving(true);
    const { error } = await supabase
      .from('course_content')
      .update({ 
        title: title.trim(),
        text_content: textContent || null,
        video_url: finalVideoUrl,
        content_type: finalVideoUrl ? 'video' : 'text',
        // Clear any legacy fields
        audio_url: null,
        file_url: null,
        file_name: null,
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

  const embedUrl = youtubeUrl ? getYouTubeEmbedUrl(youtubeUrl) : null;

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
            />
          </div>
          
          <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">
            {getStatus()}
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
          <CardContent className="p-4 space-y-6">
            {/* YouTube URL Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube Video URL
              </Label>
              
              <Input
                value={youtubeUrl}
                onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className={urlError ? 'border-destructive' : ''}
              />
              
              {urlError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{urlError}</AlertDescription>
                </Alert>
              )}
              
              {/* YouTube Preview */}
              {embedUrl && !urlError && (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden max-h-64">
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video preview"
                  />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Paste a YouTube video link. Supported formats: youtube.com/watch, youtu.be, youtube.com/shorts
              </p>
            </div>

            {/* Text Content */}
            <div className="space-y-3">
              <Label>Lesson Text Content</Label>
              <RichTextEditor
                content={textContent || sectionDescription || ''}
                onChange={(content) => {
                  setTextContent(content);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Add lesson notes, instructions, or written content..."
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <Button 
                onClick={handleSave} 
                disabled={saving || !!urlError} 
                className="gap-2"
                size="lg"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Lesson
              </Button>
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
