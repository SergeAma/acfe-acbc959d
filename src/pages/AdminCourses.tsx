import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { InviteMentorDialog } from '@/components/admin/InviteMentorDialog';
import { CourseQuickStats } from '@/components/admin/CourseQuickStats';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { stripHtml } from '@/lib/html-utils';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  created_at: string;
  thumbnail_url: string | null;
  sections: { count: number }[];
}

export const AdminCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        sections:course_sections(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive',
      });
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Course deleted successfully',
      });
      fetchCourses();
    }
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Course Management</h1>
            <p className="text-muted-foreground">Create and manage all platform courses</p>
          </div>
          <div className="flex gap-2">
            <InviteMentorDialog />
            <Button onClick={() => navigate('/mentor/courses/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading courses...</div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Create your first course to get started</p>
              <Button onClick={() => navigate('/mentor/courses/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                {course.thumbnail_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight line-clamp-2 flex-1">{course.title}</CardTitle>
                    <Badge variant={course.is_published ? 'default' : 'secondary'} className="shrink-0">
                      {course.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{course.category}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">{stripHtml(course.description)}</p>
                  <div className="text-xs text-muted-foreground">
                    {course.sections[0]?.count || 0} sections
                  </div>
                  <CourseQuickStats courseId={course.id} />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/admin/courses/${course.id}/build`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Build Content
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        setCourseToDelete(course.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course? This will also delete all sections and content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
