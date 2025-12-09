import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BarChart3, Clock, Users, TrendingDown, Play } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CourseAnalytics {
  course_id: string;
  course_title: string;
  total_enrollments: number;
  total_watch_time_minutes: number;
  avg_completion: number;
  sections: SectionAnalytics[];
}

interface SectionAnalytics {
  section_id: string;
  section_title: string;
  content_items: ContentAnalytics[];
}

interface ContentAnalytics {
  content_id: string;
  content_title: string;
  content_type: string;
  view_count: number;
  avg_watch_time_seconds: number;
  completion_rate: number;
  drop_off_points: { time: number; count: number }[];
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const AdminLearnerAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [topContent, setTopContent] = useState<ContentAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchAnalytics(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');

    if (!error && data) {
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchAnalytics = async (courseId: string) => {
    setLoading(true);

    // Fetch course details
    const { data: course } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    // Fetch enrollments count
    const { count: enrollmentsCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Fetch sections with content
    const { data: sectionsData } = await supabase
      .from('course_sections')
      .select(`
        id,
        title,
        sort_order,
        course_content (
          id,
          title,
          content_type,
          sort_order
        )
      `)
      .eq('course_id', courseId)
      .order('sort_order');

    // Fetch learner analytics for all content in this course
    const contentIds = sectionsData?.flatMap(s => 
      (s.course_content as any[]).map(c => c.id)
    ) || [];

    const { data: analyticsData } = await supabase
      .from('learner_analytics')
      .select(`
        content_id,
        total_time_spent_seconds,
        view_count,
        completed,
        drop_off_point_seconds
      `)
      .in('content_id', contentIds);

    // Fetch video progress for watch time
    const { data: videoProgress } = await supabase
      .from('video_progress')
      .select(`
        content_id,
        current_time_seconds,
        total_duration_seconds,
        watch_percentage
      `)
      .in('content_id', contentIds);

    // Aggregate analytics by content
    const contentAnalyticsMap = new Map<string, {
      view_count: number;
      total_watch_time: number;
      completed_count: number;
      total_count: number;
      drop_off_points: Map<number, number>;
    }>();

    analyticsData?.forEach(a => {
      const existing = contentAnalyticsMap.get(a.content_id) || {
        view_count: 0,
        total_watch_time: 0,
        completed_count: 0,
        total_count: 0,
        drop_off_points: new Map(),
      };

      existing.view_count += a.view_count || 1;
      existing.total_watch_time += a.total_time_spent_seconds || 0;
      existing.total_count += 1;
      if (a.completed) existing.completed_count += 1;
      
      if (a.drop_off_point_seconds) {
        const roundedTime = Math.floor(a.drop_off_point_seconds / 30) * 30;
        existing.drop_off_points.set(
          roundedTime,
          (existing.drop_off_points.get(roundedTime) || 0) + 1
        );
      }

      contentAnalyticsMap.set(a.content_id, existing);
    });

    // Calculate total watch time from video progress
    let totalWatchTimeMinutes = 0;
    videoProgress?.forEach(vp => {
      totalWatchTimeMinutes += (vp.current_time_seconds || 0) / 60;
    });

    // Build section analytics
    const sections: SectionAnalytics[] = (sectionsData || []).map(section => ({
      section_id: section.id,
      section_title: section.title,
      content_items: (section.course_content as any[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(content => {
          const stats = contentAnalyticsMap.get(content.id);
          const dropOffArray = stats?.drop_off_points 
            ? Array.from(stats.drop_off_points.entries())
                .map(([time, count]) => ({ time, count }))
                .sort((a, b) => a.time - b.time)
            : [];

          return {
            content_id: content.id,
            content_title: content.title,
            content_type: content.content_type,
            view_count: stats?.view_count || 0,
            avg_watch_time_seconds: stats?.total_count 
              ? stats.total_watch_time / stats.total_count 
              : 0,
            completion_rate: stats?.total_count 
              ? (stats.completed_count / stats.total_count) * 100 
              : 0,
            drop_off_points: dropOffArray,
          };
        }),
    }));

    // Calculate average completion
    const allContent = sections.flatMap(s => s.content_items);
    const avgCompletion = allContent.length > 0
      ? allContent.reduce((sum, c) => sum + c.completion_rate, 0) / allContent.length
      : 0;

    // Find top consumed content
    const sortedByViews = [...allContent].sort((a, b) => b.view_count - a.view_count);
    setTopContent(sortedByViews.slice(0, 5));

    setAnalytics({
      course_id: courseId,
      course_title: course?.title || '',
      total_enrollments: enrollmentsCount || 0,
      total_watch_time_minutes: Math.round(totalWatchTimeMinutes),
      avg_completion: avgCompletion,
      sections,
    });

    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const chartData = analytics?.sections.flatMap(s => 
    s.content_items.map(c => ({
      name: c.content_title.substring(0, 20) + (c.content_title.length > 20 ? '...' : ''),
      views: c.view_count,
      avgTime: Math.round(c.avg_watch_time_seconds / 60),
      completion: Math.round(c.completion_rate),
    }))
  ) || [];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Learner Analytics</h1>
            <p className="text-muted-foreground">
              Track learner behavior, engagement, and drop-off points
            </p>
          </div>

          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {analytics && (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Enrollments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.total_enrollments}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total Watch Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.total_watch_time_minutes}m</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Avg. Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{Math.round(analytics.avg_completion)}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Content Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {analytics.sections.reduce((sum, s) => sum + s.content_items.length, 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Views by Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Views by Content</CardTitle>
                  <CardDescription>Number of views per content item</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                        />
                        <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Completion Rate by Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Completion Rate</CardTitle>
                  <CardDescription>Percentage of learners who completed each item</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                          formatter={(value: number) => [`${value}%`, 'Completion']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="completion" 
                          stroke="hsl(var(--secondary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--secondary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Content */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Most Consumed Content
                </CardTitle>
                <CardDescription>Content with the highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Avg. Time</TableHead>
                      <TableHead>Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topContent.map((content, idx) => (
                      <TableRow key={content.content_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {content.content_title}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{content.content_type}</TableCell>
                        <TableCell className="text-right">{content.view_count}</TableCell>
                        <TableCell className="text-right">
                          {formatDuration(content.avg_watch_time_seconds)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={content.completion_rate} className="h-2 w-20" />
                            <span className="text-sm">{Math.round(content.completion_rate)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Section Details */}
            <Card>
              <CardHeader>
                <CardTitle>Section-by-Section Breakdown</CardTitle>
                <CardDescription>Detailed analytics for each section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analytics.sections.map((section, sectionIdx) => (
                    <div key={section.section_id} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <h3 className="font-semibold mb-3">
                        Section {sectionIdx + 1}: {section.section_title}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lesson</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Avg. Time</TableHead>
                            <TableHead>Completion</TableHead>
                            <TableHead>Drop-off Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.content_items.map(content => (
                            <TableRow key={content.content_id}>
                              <TableCell className="font-medium">{content.content_title}</TableCell>
                              <TableCell className="capitalize">{content.content_type}</TableCell>
                              <TableCell className="text-right">{content.view_count}</TableCell>
                              <TableCell className="text-right">
                                {formatDuration(content.avg_watch_time_seconds)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={content.completion_rate} className="h-2 w-16" />
                                  <span className="text-xs">{Math.round(content.completion_rate)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {content.drop_off_points.length > 0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    {content.drop_off_points.slice(0, 3).map((p, i) => (
                                      <span key={i}>
                                        {formatDuration(p.time)} ({p.count})
                                        {i < Math.min(2, content.drop_off_points.length - 1) && ', '}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No data</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
