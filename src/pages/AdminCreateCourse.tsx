import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, Plus, BookOpen } from 'lucide-react';

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

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const AdminCreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a course title',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a course',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          level: level || null,
          mentor_id: user.id,
          is_published: false,
          certificate_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Course Created',
        description: 'Your course draft has been created. Now add sections and lessons.',
      });

      // Navigate to the course builder
      navigate(`/admin/courses/${data.id}/build`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create course',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/admin/courses')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Create New Course</CardTitle>
                <CardDescription>
                  Start with the basics. You can add sections and lessons after creation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCourse} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Cloud Computing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn in this course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t flex items-center gap-3">
                <Button type="submit" disabled={creating} className="gap-2">
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Course
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/courses')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
