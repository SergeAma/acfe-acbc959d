import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RequestMentorRole } from '@/components/RequestMentorRole';
import { MySubmissions } from '@/components/dashboard/MySubmissions';
import { BookOpen, Library, Award, TrendingUp, UserCheck, Clock, BookOpenCheck, MessageSquare } from 'lucide-react';
import { stripHtml } from '@/lib/html-utils';

interface Enrollment {
  id: string;
  progress: number;
  enrolled_at: string;
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnail_url: string;
  };
}

interface MentorshipRequest {
  id: string;
  status: string;
  mentor_response: string | null;
  created_at: string;
  mentor_id: string;
  course_to_complete_id: string | null;
  course_to_complete?: {
    id: string;
    title: string;
  } | null;
}

export const StudentDashboard = () => {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [mentorProfiles, setMentorProfiles] = useState<Record<string, { full_name: string; avatar_url: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;

      // Fetch enrollments
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses (
            id,
            title,
            description,
            category,
            level,
            thumbnail_url
          )
        `)
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false });

      if (enrollmentData) {
        setEnrollments(enrollmentData as any);
      }

      // Fetch mentorship requests
      const { data: requestData } = await supabase
        .from('mentorship_requests')
        .select(`
          id,
          status,
          mentor_response,
          created_at,
          mentor_id,
          course_to_complete_id,
          course_to_complete:courses!mentorship_requests_course_to_complete_id_fkey (
            id,
            title
          )
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (requestData) {
        setMentorshipRequests(requestData as any);
        
        // Fetch mentor profiles
        const mentorIds = [...new Set(requestData.map(r => r.mentor_id))];
        if (mentorIds.length > 0) {
          const { data: profiles } = await supabase
            .rpc('get_public_mentor_profiles');
          
          if (profiles) {
            const profileMap: Record<string, { full_name: string; avatar_url: string }> = {};
            profiles.forEach((p: any) => {
              if (mentorIds.includes(p.id)) {
                profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              }
            });
            setMentorProfiles(profileMap);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome back, {profile?.full_name}!</h1>
        <p className="text-muted-foreground text-lg">Continue your learning journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled and learning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {enrollments.length > 0
                ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
          </CardContent>
        </Card>

        <Link to="/certificates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {enrollments.filter(e => e.progress === 100).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Courses completed</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Mentorship Requests Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Mentorship Requests</h2>
          <Link to="/mentors">
            <Button variant="outline">
              <UserCheck className="h-4 w-4 mr-2" />
              Find a Mentor
            </Button>
          </Link>
        </div>

        {mentorshipRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No mentorship requests yet</h3>
              <p className="text-muted-foreground mb-4">Connect with a mentor to accelerate your growth</p>
              <Link to="/mentors">
                <Button>Browse Mentors</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {mentorshipRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {mentorProfiles[request.mentor_id]?.full_name || 'Mentor'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        request.status === 'accepted' ? 'default' :
                        request.status === 'course_required' ? 'secondary' : 'outline'
                      }
                    >
                      {request.status === 'accepted' && <UserCheck className="h-3 w-3 mr-1" />}
                      {request.status === 'course_required' && <BookOpenCheck className="h-3 w-3 mr-1" />}
                      {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {request.status === 'accepted' ? 'Accepted' : 
                       request.status === 'course_required' ? 'Course Required' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {request.status === 'accepted' && (
                    <div className="space-y-3">
                      {request.mentor_response && (
                        <p className="text-sm text-muted-foreground">{request.mentor_response}</p>
                      )}
                      <Link to={`/cohort/community?mentor=${request.mentor_id}`}>
                        <Button size="sm" className="w-full">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Join Cohort Community
                        </Button>
                      </Link>
                    </div>
                  )}
                  {request.status === 'course_required' && request.course_to_complete && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Complete the following course to join the cohort:
                      </p>
                      <Link to={`/courses/${request.course_to_complete.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          {request.course_to_complete.title}
                        </Button>
                      </Link>
                    </div>
                  )}
                  {request.status === 'pending' && (
                    <p className="text-sm text-muted-foreground">
                      Waiting for mentor's response...
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mentor Role Request - Only shown to students */}
      <RequestMentorRole />

      {/* My Startup Ideas Submissions */}
      <MySubmissions />

      {/* My Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Link to="/courses">
            <Button variant="outline">
              <Library className="h-4 w-4 mr-2" />
              Browse More Courses
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading your courses...</div>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course</p>
              <Link to="/courses">
                <Button>Explore Courses</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{enrollment.course.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {enrollment.course.category}
                    </span>
                    <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
                      {enrollment.course.level}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {stripHtml(enrollment.course.description)}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{enrollment.progress}%</span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>
                  <Link to={`/courses/${enrollment.course.id}/learn`}>
                    <Button className="w-full mt-4">
                      {enrollment.progress === 0 ? 'Start Learning' : 'Continue Learning'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
