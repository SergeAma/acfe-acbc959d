import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Pencil, Save, X, Copy, MoveRight } from 'lucide-react';
import { ContentItemEditor } from './ContentItemEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
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
  sort_order: number;
  duration_minutes: number | null;
  drip_delay_days: number | null;
}

interface SectionEditorProps {
  section: Section;
  onDelete: () => void;
  onUpdate?: (updatedSection: Section) => void;
  onDuplicate?: () => void;
  allSections?: Section[];
  onMoveContent?: (contentId: string, fromSectionId: string, toSectionId: string) => Promise<void>;
}

export const SectionEditor = ({ section, onDelete, onUpdate, onDuplicate, allSections, onMoveContent }: SectionEditorProps) => {
  const { toast } = useToast();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(section.description || '');
  const [savingDescription, setSavingDescription] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const contentSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return;
    setSavingTitle(true);

    const { error } = await supabase
      .from('course_sections')
      .update({ title: editedTitle.trim() })
      .eq('id', section.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update section title',
        variant: 'destructive',
      });
    } else {
      onUpdate?.({ ...section, title: editedTitle.trim() });
      setEditingTitle(false);
      toast({
        title: 'Success',
        description: 'Section title updated',
      });
    }
    setSavingTitle(false);
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);

    const { error } = await supabase
      .from('course_sections')
      .update({ description: editedDescription.trim() || null })
      .eq('id', section.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update section description',
        variant: 'destructive',
      });
    } else {
      onUpdate?.({ ...section, description: editedDescription.trim() || null });
      setEditingDescription(false);
      toast({
        title: 'Success',
        description: 'Section description updated',
      });
    }
    setSavingDescription(false);
  };

  const handleContentDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = contentItems.findIndex((c) => c.id === active.id);
      const newIndex = contentItems.findIndex((c) => c.id === over.id);

      const newItems = arrayMove(contentItems, oldIndex, newIndex);
      setContentItems(newItems);

      // Update sort_order in database
      const updates = newItems.map((item, index) =>
        supabase
          .from('course_content')
          .update({ sort_order: index })
          .eq('id', item.id)
      );

      await Promise.all(updates);
    }
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

  const handleCreateContent = async (type: 'text' | 'video' | 'file' | 'audio') => {
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

  const handleDuplicateContent = async (contentId: string) => {
    const itemToDuplicate = contentItems.find(c => c.id === contentId);
    if (!itemToDuplicate) return;

    const { data, error } = await supabase
      .from('course_content')
      .insert({
        section_id: section.id,
        title: `${itemToDuplicate.title} (Copy)`,
        content_type: itemToDuplicate.content_type,
        text_content: itemToDuplicate.text_content,
        video_url: itemToDuplicate.video_url,
        audio_url: (itemToDuplicate as any).audio_url,
        file_url: itemToDuplicate.file_url,
        file_name: itemToDuplicate.file_name,
        duration_minutes: itemToDuplicate.duration_minutes,
        drip_delay_days: itemToDuplicate.drip_delay_days,
        sort_order: contentItems.length,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate content',
        variant: 'destructive',
      });
    } else {
      setContentItems([...contentItems, data as ContentItem]);
      toast({
        title: 'Success',
        description: 'Content duplicated',
      });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === contentItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(contentItems.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);

    const { error } = await supabase
      .from('course_content')
      .delete()
      .in('id', Array.from(selectedItems));

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete selected items',
        variant: 'destructive',
      });
    } else {
      setContentItems(contentItems.filter(c => !selectedItems.has(c.id)));
      setSelectedItems(new Set());
      toast({
        title: 'Success',
        description: `Deleted ${selectedItems.size} items`,
      });
    }
    setBulkActionLoading(false);
  };

  const handleBulkDuplicate = async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);

    const itemsToDuplicate = contentItems.filter(c => selectedItems.has(c.id));
    const newItems = itemsToDuplicate.map((item, index) => ({
      section_id: section.id,
      title: `${item.title} (Copy)`,
      content_type: item.content_type,
      text_content: item.text_content,
      video_url: item.video_url,
      audio_url: (item as any).audio_url,
      file_url: item.file_url,
      file_name: item.file_name,
      duration_minutes: item.duration_minutes,
      drip_delay_days: item.drip_delay_days,
      sort_order: contentItems.length + index,
    }));

    const { data, error } = await supabase
      .from('course_content')
      .insert(newItems)
      .select();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate selected items',
        variant: 'destructive',
      });
    } else {
      setContentItems([...contentItems, ...(data as ContentItem[])]);
      setSelectedItems(new Set());
      toast({
        title: 'Success',
        description: `Duplicated ${selectedItems.size} items`,
      });
    }
    setBulkActionLoading(false);
  };

  const handleMoveToSection = async (contentId: string, targetSectionId: string) => {
    if (onMoveContent) {
      await onMoveContent(contentId, section.id, targetSectionId);
      setContentItems(contentItems.filter(c => c.id !== contentId));
    }
  };

  const handleBulkMove = async (targetSectionId: string) => {
    if (!onMoveContent || selectedItems.size === 0) return;
    setBulkActionLoading(true);

    for (const itemId of selectedItems) {
      await onMoveContent(itemId, section.id, targetSectionId);
    }

    setContentItems(contentItems.filter(c => !selectedItems.has(c.id)));
    setSelectedItems(new Set());
    toast({
      title: 'Success',
      description: `Moved ${selectedItems.size} items`,
    });
    setBulkActionLoading(false);
  };

  const otherSections = allSections?.filter(s => s.id !== section.id) || [];

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditingTitle(false);
                      setEditedTitle(section.title);
                    }
                  }}
                />
                <Button onClick={handleSaveTitle} disabled={savingTitle || !editedTitle.trim()} size="sm" variant="ghost">
                  <Save className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingTitle(false);
                    setEditedTitle(section.title);
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
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {section.title}
                </CardTitle>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            {!editingTitle && (
              editingDescription ? (
                <div className="flex items-start gap-2 mt-1">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="text-sm min-h-[60px]"
                    placeholder="Add a section description..."
                    autoFocus
                  />
                  <Button onClick={handleSaveDescription} disabled={savingDescription} size="sm" variant="ghost">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setEditingDescription(false);
                      setEditedDescription(section.description || '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 mt-1 cursor-pointer group hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-all"
                  onClick={() => setEditingDescription(true)}
                  title="Click to edit description"
                >
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {section.description || 'Click to add description...'}
                  </p>
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )
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
          <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate section">
            <Copy className="h-4 w-4" />
          </Button>
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
                  <>
                    {/* Bulk Actions Bar */}
                    <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedItems.size === contentItems.length && contentItems.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                        </span>
                      </div>
                      {selectedItems.size > 0 && (
                        <div className="flex gap-2 ml-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleBulkDuplicate}
                            disabled={bulkActionLoading}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={bulkActionLoading}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {selectedItems.size} items? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {otherSections.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={bulkActionLoading}
                                >
                                  <MoveRight className="h-4 w-4 mr-2" />
                                  Move to
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {otherSections.map(s => (
                                  <DropdownMenuItem 
                                    key={s.id} 
                                    onClick={() => handleBulkMove(s.id)}
                                  >
                                    {s.title}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )}
                    </div>
                    <DndContext sensors={contentSensors} collisionDetection={closestCenter} onDragEnd={handleContentDragEnd}>
                      <SortableContext items={contentItems.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4 mb-4">
                          {contentItems.map((item) => (
                            <ContentItemEditor
                              key={item.id}
                              item={item}
                              onDelete={() => handleDeleteContent(item.id)}
                              onUpdate={fetchContentItems}
                              onDuplicate={() => handleDuplicateContent(item.id)}
                              isSelected={selectedItems.has(item.id)}
                              onSelect={() => toggleItemSelection(item.id)}
                              otherSections={otherSections}
                              onMoveToSection={(targetSectionId) => handleMoveToSection(item.id, targetSectionId)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleCreateContent('text')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateContent('video')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateContent('audio')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Audio
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
