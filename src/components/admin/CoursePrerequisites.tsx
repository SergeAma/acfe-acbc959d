import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, X, Link2, ExternalLink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Course {
  id: string;
  title: string;
}

interface ExternalPrerequisite {
  id: string;
  title: string;
  url: string;
}

interface CoursePrerequisitesProps {
  courseId: string;
  mentorId: string;
}

export const CoursePrerequisites = ({ courseId, mentorId }: CoursePrerequisitesProps) => {
  const { toast } = useToast();
  const [prerequisites, setPrerequisites] = useState<Course[]>([]);
  const [externalPrerequisites, setExternalPrerequisites] = useState<ExternalPrerequisite[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // External course form state
  const [externalTitle, setExternalTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [addingExternal, setAddingExternal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Fetch existing internal prerequisites
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

      // Fetch external prerequisites
      const { data: externalData, error: externalError } = await supabase
        .from('external_course_prerequisites')
        .select('id, title, url')
        .eq('course_id', courseId);

      if (externalError) throw externalError;

      setExternalPrerequisites(externalData || []);
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

  const addExternalPrerequisite = async () => {
    if (!externalTitle.trim() || !externalUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both title and URL',
        variant: 'destructive',
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(externalUrl);
    } catch {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      });
      return;
    }

    setAddingExternal(true);
    try {
      const { data, error } = await supabase
        .from('external_course_prerequisites')
        .insert({
          course_id: courseId,
          title: externalTitle.trim(),
          url: externalUrl.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setExternalPrerequisites([...externalPrerequisites, data]);
      setExternalTitle('');
      setExternalUrl('');

      toast({
        title: 'Success',
        description: 'External prerequisite added',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add external prerequisite',
        variant: 'destructive',
      });
    } finally {
      setAddingExternal(false);
    }
  };

  const removeExternalPrerequisite = async (prereqId: string) => {
    try {
      const { error } = await supabase
        .from('external_course_prerequisites')
        .delete()
        .eq('id', prereqId);

      if (error) throw error;

      setExternalPrerequisites(externalPrerequisites.filter(p => p.id !== prereqId));

      toast({
        title: 'Success',
        description: 'External prerequisite removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove external prerequisite',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading prerequisites...</div>;
  }

  const totalPrerequisites = prerequisites.length + externalPrerequisites.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Course Prerequisites
          {totalPrerequisites > 0 && (
            <Badge variant="secondary" className="ml-2">{totalPrerequisites}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Set courses that students must complete before enrolling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display all prerequisites */}
        {totalPrerequisites > 0 ? (
          <div className="space-y-3">
            {prerequisites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Internal Courses</p>
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
              </div>
            )}
            
            {externalPrerequisites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">External Courses</p>
                <div className="flex flex-wrap gap-2">
                  {externalPrerequisites.map((prereq) => (
                    <Badge key={prereq.id} variant="outline" className="py-1.5 px-3">
                      <a 
                        href={prereq.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        {prereq.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => removeExternalPrerequisite(prereq.id)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No prerequisites set</p>
        )}

        {/* Add prerequisites */}
        <Tabs defaultValue="internal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">Internal Course</TabsTrigger>
            <TabsTrigger value="external">External Course</TabsTrigger>
          </TabsList>
          
          <TabsContent value="internal" className="space-y-3 pt-3">
            {availableCourses.length > 0 ? (
              <div className="flex gap-2">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a course from your catalog" />
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
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No other published courses available to set as prerequisites
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="external" className="space-y-3 pt-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="external-title">Course Title</Label>
                <Input
                  id="external-title"
                  placeholder="e.g., Google Cloud Fundamentals"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="external-url">Course URL</Label>
                <Input
                  id="external-url"
                  placeholder="https://coursera.org/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={addExternalPrerequisite} 
                disabled={!externalTitle.trim() || !externalUrl.trim() || addingExternal}
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add External Course
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
