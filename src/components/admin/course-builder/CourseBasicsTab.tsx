import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save, Pencil, X, Loader2 } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ThumbnailDropzone } from '../ThumbnailDropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSafeHtml } from '@/lib/sanitize-html';

/**
 * Course Basics Tab
 * 
 * TAB 1 of 3 in simplified course builder
 * Contains: Title, Description, Thumbnail, Category, Level
 * 
 * NO pricing, certificates, or publishing settings here.
 */

const CATEGORIES = [
  'Career Learning',
  'General Learning', 
  'Tech Jobs',
  'Software Development',
  'Data Science',
  'Design',
  'Marketing',
  'Business',
  'Finance',
  'Leadership',
  'Communication',
  'Entrepreneurship',
  'Personal Development',
];

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string | null;
}

interface CourseBasicsTabProps {
  course: Course;
  onUpdate: (updates: Partial<Course>) => void;
}

export const CourseBasicsTab = ({ course, onUpdate }: CourseBasicsTabProps) => {
  const { toast } = useToast();
  
  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [savingTitle, setSavingTitle] = useState(false);

  // Description editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(course.description || '');
  const [savingDescription, setSavingDescription] = useState(false);

  // Other fields
  const [category, setCategory] = useState(course.category || '');
  const [customCategory, setCustomCategory] = useState('');
  const [level, setLevel] = useState(course.level || '');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Check if category is custom
  const isCustomCategory = category === 'Other' || (course.category && !CATEGORIES.includes(course.category));

  // Initialize custom category if needed
  useState(() => {
    if (course.category && !CATEGORIES.includes(course.category)) {
      setCategory('Other');
      setCustomCategory(course.category);
    }
  });

  // Save title
  const handleSaveTitle = async () => {
    if (!title.trim() || title.length < 5) {
      toast({
        title: 'Invalid title',
        description: 'Title must be at least 5 characters',
        variant: 'destructive',
      });
      return;
    }

    setSavingTitle(true);
    const { error } = await supabase
      .from('courses')
      .update({ title: title.trim() })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save title', variant: 'destructive' });
    } else {
      onUpdate({ title: title.trim() });
      setEditingTitle(false);
      toast({ title: 'Saved', description: 'Course title updated' });
    }
    setSavingTitle(false);
  };

  // Save description
  const handleSaveDescription = async () => {
    setSavingDescription(true);
    const { error } = await supabase
      .from('courses')
      .update({ description })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save description', variant: 'destructive' });
    } else {
      onUpdate({ description });
      setEditingDescription(false);
      toast({ title: 'Saved', description: 'Course description updated' });
    }
    setSavingDescription(false);
  };

  // Save category
  const handleSaveCategory = async (value: string) => {
    const categoryToSave = value === 'Other' ? customCategory : value;
    if (value === 'Other' && !customCategory.trim()) return;

    const { error } = await supabase
      .from('courses')
      .update({ category: categoryToSave || null })
      .eq('id', course.id);

    if (!error) {
      onUpdate({ category: categoryToSave });
      toast({ title: 'Saved', description: 'Category updated' });
    }
  };

  // Save level
  const handleSaveLevel = async (value: string) => {
    const { error } = await supabase
      .from('courses')
      .update({ level: value || null })
      .eq('id', course.id);

    if (!error) {
      onUpdate({ level: value });
      toast({ title: 'Saved', description: 'Level updated' });
    }
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);

    try {
      const fileName = `${course.id}-thumbnail-${Date.now()}.jpg`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('courses')
        .update({ thumbnail_url: urlWithCacheBust })
        .eq('id', course.id);

      if (updateError) throw updateError;

      onUpdate({ thumbnail_url: urlWithCacheBust });
      toast({ title: 'Success', description: 'Thumbnail uploaded' });
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast({ title: 'Error', description: 'Failed to upload thumbnail', variant: 'destructive' });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Course Title</CardTitle>
          <CardDescription>Give your course a clear, descriptive title</CardDescription>
        </CardHeader>
        <CardContent>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') { setEditingTitle(false); setTitle(course.title); }
                }}
              />
              <Button onClick={handleSaveTitle} disabled={savingTitle} size="sm">
                {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditingTitle(false); setTitle(course.title); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 group cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-md transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              <h2 className="text-xl font-semibold">{course.title}</h2>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Description</CardTitle>
          <CardDescription>Explain what students will learn (min 20 characters)</CardDescription>
        </CardHeader>
        <CardContent>
          {editingDescription ? (
            <div className="space-y-3">
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Describe what students will learn..."
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveDescription} disabled={savingDescription} size="sm">
                  {savingDescription ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditingDescription(false); setDescription(course.description || ''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="group cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-md transition-colors"
              onClick={() => setEditingDescription(true)}
            >
              {course.description ? (
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={createSafeHtml(course.description)}
                />
              ) : (
                <p className="text-muted-foreground italic">Click to add description...</p>
              )}
              <Button variant="ghost" size="sm" className="mt-2">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Description
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thumbnail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Thumbnail</CardTitle>
          <CardDescription>Upload an eye-catching image for your course</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <ThumbnailDropzone
              currentThumbnail={course.thumbnail_url}
              onUpload={handleThumbnailUpload}
              uploading={uploadingThumbnail}
              courseTitle={course.title}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category & Level */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Category</CardTitle>
            <CardDescription>Help students find your course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select 
              value={category || ''} 
              onValueChange={(v) => { 
                setCategory(v); 
                if (v !== 'Other') {
                  setCustomCategory('');
                  handleSaveCategory(v);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                <SelectItem value="Other">Other (Custom)</SelectItem>
              </SelectContent>
            </Select>
            
            {category === 'Other' && (
              <div className="flex gap-2">
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category..."
                />
                <Button 
                  size="sm" 
                  onClick={() => handleSaveCategory('Other')}
                  disabled={!customCategory.trim()}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Difficulty Level</CardTitle>
            <CardDescription>Set the expected skill level</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={level || ''} onValueChange={handleSaveLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((lvl) => (
                  <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
