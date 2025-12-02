import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ContentItemEditor } from './ContentItemEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface ContentItem {
  id: string;
  title: string;
  content_type: 'text' | 'video' | 'file';
  text_content: string | null;
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  sort_order: number;
  duration_minutes: number | null;
  drip_delay_days: number | null;
}

interface SectionEditorProps {
  section: Section;
  onDelete: () => void;
}

export const SectionEditor = ({ section, onDelete }: SectionEditorProps) => {
  const { toast } = useToast();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isOpen) {
      fetchContentItems();
    }
  }, [isOpen]);

  const fetchContentItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_content')
      .select('*')
      .eq('section_id', section.id)
      .order('sort_order', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load content items',
        variant: 'destructive',
      });
    } else {
      setContentItems((data || []) as ContentItem[]);
    }
    setLoading(false);
  };

  const handleCreateContent = async (type: 'text' | 'video' | 'file') => {
    const { data, error } = await supabase
      .from('course_content')
      .insert({
        section_id: section.id,
        title: `New ${type} content`,
        content_type: type,
        sort_order: contentItems.length,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create content',
        variant: 'destructive',
      });
    } else {
      setContentItems([...contentItems, data as ContentItem]);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    const { error } = await supabase
      .from('course_content')
      .delete()
      .eq('id', contentId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete content',
        variant: 'destructive',
      });
    } else {
      setContentItems(contentItems.filter((c) => c.id !== contentId));
      toast({
        title: 'Success',
        description: 'Content deleted',
      });
    }
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <CardTitle className="text-lg">{section.title}</CardTitle>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            )}
          </div>
          <Badge variant="secondary">{contentItems.length} items</Badge>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Section</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure? This will delete all content in this section. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading content...</div>
            ) : (
              <>
                {contentItems.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {contentItems.map((item) => (
                      <ContentItemEditor
                        key={item.id}
                        item={item}
                        onDelete={() => handleDeleteContent(item.id)}
                        onUpdate={fetchContentItems}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCreateContent('text')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateContent('video')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateContent('file')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add File
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
