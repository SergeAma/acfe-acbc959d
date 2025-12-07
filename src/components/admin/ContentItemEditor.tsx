import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Video, File, Trash2, Save, Loader2, GripVertical, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ContentItem {
  id: string;
  title: string;
  content_type: 'text' | 'video' | 'file';
  text_content: string | null;
  video_url: string | null;
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
}

export const ContentItemEditor = ({ item, onDelete, onUpdate, onDuplicate, isSelected, onSelect }: ContentItemEditorProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: item.title,
    text_content: item.text_content || '',
    duration_minutes: item.duration_minutes || 0,
    drip_delay_days: item.drip_delay_days || 0,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch (item.content_type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('course_content')
      .update({
        title: formData.title,
        text_content: item.content_type === 'text' ? formData.text_content : null,
        duration_minutes: formData.duration_minutes || null,
        drip_delay_days: formData.drip_delay_days || 0,
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Changes saved',
      });
      setEditing(false);
      onUpdate();
    }
    setSaving(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${item.id}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editing ? (
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="font-medium"
                  />
                ) : (
                  <h4 className="font-medium">{item.title}</h4>
                )}
                <Badge variant="outline" className="capitalize">
                  {item.content_type}
                </Badge>
              </div>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                    {onDuplicate && (
                      <Button size="sm" variant="ghost" onClick={onDuplicate} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {item.content_type === 'text' && editing && (
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  rows={6}
                  placeholder="Enter your lesson content here..."
                />
              </div>
            )}

            {item.content_type === 'text' && !editing && item.text_content && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.text_content}</p>
            )}

            {item.content_type === 'video' && (
              <div className="space-y-2">
                {item.video_url ? (
                  <div className="space-y-2">
                    <video controls className="w-full rounded-md">
                      <source src={item.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p className="text-xs text-muted-foreground">Change video:</p>
                  </div>
                ) : (
                  <Label>Upload Video</Label>
                )}
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploading}
                />
                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              </div>
            )}

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

            {editing && (item.content_type === 'video' || item.content_type === 'file') && (
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            )}

            {editing && (
              <div className="space-y-2">
                <Label>Drip Delay (days after enrollment)</Label>
                <Input
                  type="number"
                  value={formData.drip_delay_days}
                  onChange={(e) => setFormData({ ...formData, drip_delay_days: parseInt(e.target.value) || 0 })}
                  min="0"
                  placeholder="0 = available immediately"
                />
                <p className="text-xs text-muted-foreground">
                  Number of days after enrollment before this content becomes available
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
