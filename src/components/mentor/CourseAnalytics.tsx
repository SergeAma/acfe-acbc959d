import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Award, BarChart3, Calendar, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CourseAnalyticsProps {
  mentorId?: string;
  isAdmin: boolean;
}

interface CourseStats {
  id: string;
  title: string;
  mentor_name: string | null;
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  is_published: boolean;
}

interface EnrollmentTrend {
  week: string;
  enrollments: number;
  completions: number;
}

export const CourseAnalytics = ({ mentorId, isAdmin }: CourseAnalyticsProps) => {
  const { toast } = useToast();
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [avgCompletionRate, setAvgCompletionRate] = useState(0);

  const exportToCSV = (type: 'courses' | 'trends') => {
    let csvContent = '';
    let filename = '';

    if (type === 'courses') {
      // Export course stats
      const headers = isAdmin 
        ? ['Course Title', 'Mentor', 'Status', 'Enrollments', 'Completions', 'Completion Rate (%)']
        : ['Course Title', 'Status', 'Enrollments', 'Completions', 'Completion Rate (%)'];
      
      csvContent = headers.join(',') + '\n';
      
      courseStats.forEach(course => {
        const row = isAdmin
          ? [
              `"${course.title.replace(/"/g, '""')}"`,
              `"${(course.mentor_name || 'Unknown').replace(/"/g, '""')}"`,
              course.is_published ? 'Published' : 'Draft',
              course.total_enrollments,
              course.completed_enrollments,
              course.completion_rate
            ]
          : [
              `"${course.title.replace(/"/g, '""')}"`,
              course.is_published ? 'Published' : 'Draft',
              course.total_enrollments,
              course.completed_enrollments,
              course.completion_rate
            ];
        csvContent += row.join(',') + '\n';
      });
      
      filename = `course-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      // Export enrollment trends
      const headers = ['Week', 'Enrollments', 'Completions'];
      csvContent = headers.join(',') + '\n';
      
      enrollmentTrends.forEach(trend => {
        csvContent += `${trend.week},${trend.enrollments},${trend.completions}\n`;
      });
      
      filename = `enrollment-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Export Complete",
      description: `Downloaded ${filename}`
    });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [mentorId, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      // Fetch courses with enrollment data
      let coursesQuery = supabase
        .from('courses')
        .select(`
          id,
          title,
          is_published,
          mentor:profiles!courses_mentor_id_fkey(full_name)
        `);

      // Non-admin mentors only see their own courses
      if (!isAdmin && mentorId) {
        coursesQuery = coursesQuery.eq('mentor_id', mentorId);
      }

      const { data: courses, error: coursesError } = await coursesQuery;
      if (coursesError) throw coursesError;

      // Fetch enrollments for each course
      const stats: CourseStats[] = [];
      let allEnrollments = 0;
      let allCompletions = 0;

      for (const course of courses || []) {
        let enrollmentsQuery = supabase
          .from('enrollments')
          .select('id, progress')
          .eq('course_id', course.id);

        const { data: enrollments, error: enrollmentsError } = await enrollmentsQuery;
        if (enrollmentsError) continue;

        const total = enrollments?.length || 0;
        const completed = enrollments?.filter(e => e.progress === 100).length || 0;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        allEnrollments += total;
        allCompletions += completed;

        stats.push({
          id: course.id,
          title: course.title,
          mentor_name: course.mentor?.full_name || 'Unknown',
          total_enrollments: total,
          completed_enrollments: completed,
          completion_rate: rate,
          is_published: course.is_published
        });
      }

      setCourseStats(stats.sort((a, b) => b.total_enrollments - a.total_enrollments));
      setTotalEnrollments(allEnrollments);
      setTotalCompletions(allCompletions);
      setAvgCompletionRate(allEnrollments > 0 ? Math.round((allCompletions / allEnrollments) * 100) : 0);

      // Fetch enrollment trends for the last 12 weeks
      const now = new Date();
      const twelveWeeksAgo = subDays(now, 84);
      const weeks = eachWeekOfInterval({ start: twelveWeeksAgo, end: now });

      let trendsQuery = supabase
        .from('enrollments')
        .select('enrolled_at, progress, course:courses!inner(mentor_id)')
        .gte('enrolled_at', twelveWeeksAgo.toISOString());

      // Non-admin mentors only see their own course enrollments
      if (!isAdmin && mentorId) {
        trendsQuery = trendsQuery.eq('course.mentor_id', mentorId);
      }

      const { data: allEnrollmentsData, error: trendsError } = await trendsQuery;

      if (!trendsError && allEnrollmentsData) {
        const trends: EnrollmentTrend[] = weeks.map(weekStart => {
          const weekEnd = endOfWeek(weekStart);
          const weekEnrollments = allEnrollmentsData.filter(e => {
            const enrolledDate = new Date(e.enrolled_at);
            return enrolledDate >= weekStart && enrolledDate <= weekEnd;
          });

          return {
            week: format(weekStart, 'MMM d'),
            enrollments: weekEnrollments.length,
            completions: weekEnrollments.filter(e => e.progress === 100).length
          };
        });

        setEnrollmentTrends(trends);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEnrollments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {courseStats.length} course{courseStats.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completions</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCompletions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Students completed courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">
            <Calendar className="h-4 w-4 mr-2" />
            Enrollment Trends
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BarChart3 className="h-4 w-4 mr-2" />
            Course Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Enrollment Trends</CardTitle>
                <CardDescription>Weekly enrollments and completions over the last 12 weeks</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV('trends')}
                disabled={enrollmentTrends.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {enrollmentTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={enrollmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="week" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="enrollments" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Enrollments"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completions" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Completions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No enrollment data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Course Performance</CardTitle>
                <CardDescription>Enrollment and completion statistics per course</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV('courses')}
                disabled={courseStats.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {courseStats.length > 0 ? (
                <div className="space-y-4">
                  {/* Chart for top courses */}
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={courseStats.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="title" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="total_enrollments" fill="hsl(var(--primary))" name="Enrollments" />
                      <Bar dataKey="completed_enrollments" fill="hsl(var(--chart-2))" name="Completions" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detailed list */}
                  <div className="space-y-2 mt-6">
                    {courseStats.map((course) => (
                      <div 
                        key={course.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{course.title}</p>
                            <Badge variant={course.is_published ? "default" : "secondary"} className="text-xs">
                              {course.is_published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                          {isAdmin && (
                            <p className="text-xs text-muted-foreground">by {course.mentor_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-semibold">{course.total_enrollments}</p>
                            <p className="text-xs text-muted-foreground">Enrolled</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">{course.completed_enrollments}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <div className="text-center min-w-[60px]">
                            <p className={`font-semibold ${
                              course.completion_rate >= 70 ? 'text-green-600' : 
                              course.completion_rate >= 40 ? 'text-yellow-600' : 
                              'text-muted-foreground'
                            }`}>
                              {course.completion_rate}%
                            </p>
                            <p className="text-xs text-muted-foreground">Rate</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No course data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
