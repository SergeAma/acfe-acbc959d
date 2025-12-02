import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

const courseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  category: z.string().min(2).max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  duration_weeks: z.number().min(1).max(52),
});

export const CreateCourse = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration_weeks: 4,
    drip_enabled: false,
  });

  const validateForm = () => {
    try {
      courseSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation error",
        description: "Please check your inputs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...formData,
        mentor_id: profile?.id,
        is_published: publish,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: publish ? "Course created and published" : "Course saved as draft",
      });
      navigate(`/admin/courses/${data.id}/build`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Create New Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Web Development"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn in this course..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  required
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Programming, Design"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level *</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: any) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (weeks) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="52"
                  value={formData.duration_weeks}
                  onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 1 })}
                  required
                />
                {errors.duration_weeks && <p className="text-sm text-destructive">{errors.duration_weeks}</p>}
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-4">
                <Checkbox
                  id="drip_enabled"
                  checked={formData.drip_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, drip_enabled: checked as boolean })}
                />
                <div className="space-y-1">
                  <Label htmlFor="drip_enabled" className="cursor-pointer">
                    Enable Drip Content Release
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Release course content progressively based on enrollment date. You can set individual delays for each lesson.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" variant="outline" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Publish Course
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};