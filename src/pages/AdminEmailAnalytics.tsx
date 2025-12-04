import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Mail, Eye, MousePointer, TrendingUp, Calendar } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface EmailStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
  click_to_open_rate: number;
}

interface DailyStats {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}

interface TemplateStats {
  name: string;
  sent: number;
  opened: number;
  clicked: number;
  open_rate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d'];

export const AdminEmailAnalytics = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmailStats>({
    total_sent: 0,
    total_opened: 0,
    total_clicked: 0,
    open_rate: 0,
    click_rate: 0,
    click_to_open_rate: 0
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [templateStats, setTemplateStats] = useState<TemplateStats[]>([]);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAnalytics();
    }
  }, [profile]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all email logs
      const { data: logs, error } = await supabase
        .from('email_logs')
        .select('*, email_templates(name)')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const emailLogs = logs || [];

      // Calculate overall stats
      const total_sent = emailLogs.length;
      const total_opened = emailLogs.filter(l => l.opened_at).length;
      const total_clicked = emailLogs.filter(l => l.clicked_at).length;
      
      setStats({
        total_sent,
        total_opened,
        total_clicked,
        open_rate: total_sent > 0 ? Math.round((total_opened / total_sent) * 100) : 0,
        click_rate: total_sent > 0 ? Math.round((total_clicked / total_sent) * 100) : 0,
        click_to_open_rate: total_opened > 0 ? Math.round((total_clicked / total_opened) * 100) : 0
      });

      // Calculate daily stats for last 30 days
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date()
      });

      const dailyData = last30Days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLogs = emailLogs.filter(l => 
          l.sent_at && format(new Date(l.sent_at), 'yyyy-MM-dd') === dayStr
        );
        
        return {
          date: format(day, 'MMM dd'),
          sent: dayLogs.length,
          opened: dayLogs.filter(l => l.opened_at).length,
          clicked: dayLogs.filter(l => l.clicked_at).length
        };
      });

      setDailyStats(dailyData);

      // Calculate template performance
      const templateMap = new Map<string, { sent: number; opened: number; clicked: number }>();
      
      emailLogs.forEach(log => {
        const templateName = log.email_templates?.name || 'Unknown';
        const current = templateMap.get(templateName) || { sent: 0, opened: 0, clicked: 0 };
        templateMap.set(templateName, {
          sent: current.sent + 1,
          opened: current.opened + (log.opened_at ? 1 : 0),
          clicked: current.clicked + (log.clicked_at ? 1 : 0)
        });
      });

      const templateData: TemplateStats[] = Array.from(templateMap.entries())
        .map(([name, data]) => ({
          name,
          ...data,
          open_rate: data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0
        }))
        .sort((a, b) => b.sent - a.sent)
        .slice(0, 5);

      setTemplateStats(templateData);

      // Recent emails
      setRecentEmails(emailLogs.slice(0, 10));

    } catch (error: any) {
      toast({ title: "Error fetching analytics", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/newsletter')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Email Analytics</h1>
            <p className="text-muted-foreground">Track your email campaign performance</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total_sent}</p>
                      <p className="text-xs text-muted-foreground">Emails Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Eye className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total_opened}</p>
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <MousePointer className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total_clicked}</p>
                      <p className="text-xs text-muted-foreground">Clicked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.open_rate}%</p>
                      <p className="text-xs text-muted-foreground">Open Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.click_rate}%</p>
                      <p className="text-xs text-muted-foreground">Click Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.click_to_open_rate}%</p>
                      <p className="text-xs text-muted-foreground">CTOR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Over Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Engagement Over Time (Last 30 Days)
                </CardTitle>
                <CardDescription>Daily email sends, opens, and clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sent" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                        name="Sent"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="opened" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={false}
                        name="Opened"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicked" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        name="Clicked"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Template Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Performance</CardTitle>
                  <CardDescription>Top performing email templates</CardDescription>
                </CardHeader>
                <CardContent>
                  {templateStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No template data yet</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={templateStats} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 11 }}
                            width={100}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" />
                          <Bar dataKey="opened" fill="#22c55e" name="Opened" />
                          <Bar dataKey="clicked" fill="#3b82f6" name="Clicked" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Open Rate Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Breakdown</CardTitle>
                  <CardDescription>Distribution of email engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Opened & Clicked', value: stats.total_clicked },
                            { name: 'Opened Only', value: stats.total_opened - stats.total_clicked },
                            { name: 'Not Opened', value: stats.total_sent - stats.total_opened }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[0, 1, 2].map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Emails Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Emails</CardTitle>
                <CardDescription>Latest email activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Subject</th>
                        <th className="text-left py-3 px-2 font-medium">Template</th>
                        <th className="text-left py-3 px-2 font-medium">Sent</th>
                        <th className="text-center py-3 px-2 font-medium">Opened</th>
                        <th className="text-center py-3 px-2 font-medium">Clicked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEmails.map((email) => (
                        <tr key={email.id} className="border-b last:border-0">
                          <td className="py-3 px-2 max-w-[200px] truncate">{email.subject}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {email.email_templates?.name || '-'}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {email.sent_at ? format(new Date(email.sent_at), 'MMM dd, HH:mm') : '-'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {email.opened_at ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
                                <Eye className="h-3 w-3 text-green-600" />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {email.clicked_at ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10">
                                <MousePointer className="h-3 w-3 text-blue-600" />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {recentEmails.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No emails sent yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
