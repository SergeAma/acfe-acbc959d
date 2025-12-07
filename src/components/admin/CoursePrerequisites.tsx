import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, X, Link2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Course {
  id: string;
  title: string;
}

interface CoursePrerequisitesProps {
  courseId: string;
  mentorId: string;
}

export const CoursePrerequisites = ({ courseId, mentorId }: CoursePrerequisitesProps) => {
  const { toast } = useToast();
  const [prerequisites, setPrerequisites] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Fetch existing prerequisites
      const { data: prereqData, error: prereqError } = await supabase
        .from('course_prerequisites')
        .select('prerequisite_course_id')
        .eq('course_id', courseId);

      if (prereqError) throw prereqError;

      const prereqIds = prereqData?.map(p => p.prerequisite_course_id) || [];

      // Fetch all available courses (published courses by this mentor, excluding current course)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('mentor_id', mentorId)
        .eq('is_published', true)
        .neq('id', courseId);

      if (coursesError) throw coursesError;

      // Filter prerequisites and available courses
      const prereqCourses = coursesData?.filter(c => prereqIds.includes(c.id)) || [];
      const availableCourses = coursesData?.filter(c => !prereqIds.includes(c.id)) || [];

      setPrerequisites(prereqCourses);
      setAvailableCourses(availableCourses);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load prerequisites',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addPrerequisite = async () => {
    if (!selectedCourse) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from('course_prerequisites')
        .insert({
          course_id: courseId,
          prerequisite_course_id: selectedCourse,
        });

      if (error) throw error;

      // Move course from available to prerequisites
      const course = availableCourses.find(c => c.id === selectedCourse);
      if (course) {
        setPrerequisites([...prerequisites, course]);
        setAvailableCourses(availableCourses.filter(c => c.id !== selectedCourse));
      }
      setSelectedCourse('');

      toast({
        title: 'Success',
        description: 'Prerequisite added',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add prerequisite',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const removePrerequisite = async (prereqCourseId: string) => {
    try {
      const { error } = await supabase
        .from('course_prerequisites')
        .delete()
        .eq('course_id', courseId)
        .eq('prerequisite_course_id', prereqCourseId);

      if (error) throw error;

      // Move course from prerequisites to available
      const course = prerequisites.find(c => c.id === prereqCourseId);
      if (course) {
        setAvailableCourses([...availableCourses, course]);
        setPrerequisites(prerequisites.filter(c => c.id !== prereqCourseId));
      }

      toast({
        title: 'Success',
        description: 'Prerequisite removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove prerequisite',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading prerequisites...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Course Prerequisites
        </CardTitle>
        <CardDescription>
          Set courses that students must complete before enrolling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {prerequisites.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {prerequisites.map((course) => (
              <Badge key={course.id} variant="secondary" className="py-1.5 px-3">
                {course.title}
                <button
                  onClick={() => removePrerequisite(course.id)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No prerequisites set</p>
        )}

        {availableCourses.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a prerequisite course" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addPrerequisite} disabled={!selectedCourse || adding} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}

        {availableCourses.length === 0 && prerequisites.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No other published courses available to set as prerequisites
          </p>
        )}
      </CardContent>
    </Card>
  );
};