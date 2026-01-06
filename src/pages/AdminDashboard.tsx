import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, CheckCircle, XCircle, Clock, UserX, UserCheck, 
  Users, GraduationCap, TrendingUp, Mail, Settings, BookOpen,
  Send, Lightbulb, Newspaper, BarChart3, Building2, CreditCard,
  ArrowRight, ChevronRight, Sparkles, Activity, UserPlus, Heart
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { SecurityAuditPanel } from '@/components/admin/SecurityAuditPanel';

interface MentorRequest {
  id: string;
  user_id: string;
  status: string;
  reason: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// Quick action categories for organized layout
const quickActionCategories = [
  {
    title: 'Analytics & Revenue',
    icon: TrendingUp,
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    items: [
      { label: 'Revenue Analytics', icon: TrendingUp, path: '/admin/revenue' },
      { label: 'Learner Analytics', icon: BarChart3, path: '/admin/learner-analytics' },
      { label: 'Pricing Settings', icon: CreditCard, path: '/admin/pricing' },
      { label: 'Donor Management', icon: Heart, path: '/admin/donors' },
    ]
  },
  {
    title: 'Communications',
    icon: Mail,
    color: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    items: [
      { label: 'Newsletter', icon: Send, path: '/admin/newsletter' },
      { label: 'Email Logs', icon: Mail, path: '/admin/email-logs' },
      { label: 'Email Templates', icon: Mail, path: '/admin/email-templates' },
    ]
  },
  {
    title: 'Content & Learning',
    icon: BookOpen,
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    items: [
      { label: 'Manage Courses', icon: BookOpen, path: '/admin/courses' },
      { label: 'Idea Submissions', icon: Lightbulb, path: '/admin/ideas' },
      { label: 'News Curation', icon: Newspaper, path: '/admin/news-curation' },
    ]
  },
  {
    title: 'User Management',
    icon: Users,
    color: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    items: [
      { label: 'Mentor Invitations', icon: UserPlus, path: '/admin/mentor-invitations' },
      { label: 'Institutions', icon: Building2, path: '/admin/institutions' },
      { label: 'System Settings', icon: Settings, path: '/admin/settings' },
    ]
  },
];

export const AdminDashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchRequests();
    }
  }, [profile]);

  const fetchRequests = async () => {
    setLoading(true);
    
    const { data: requestData, error: requestError } = await supabase
      .from('mentor_role_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestError) {
      toast({
        title: "Error fetching requests",
        description: requestError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (requestData && requestData.length > 0) {
      const userIds = requestData.map(r => r.user_id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const enrichedRequests = requestData.map(request => ({
        ...request,
        profiles: profileData?.find(p => p.id === request.user_id)
      }));
      
      setRequests(enrichedRequests as MentorRequest[]);
    } else {
      setRequests([]);
    }
    
    setLoading(false);
  };

  const sendMentorApprovalEmail = async (userId: string, email: string, fullName: string) => {
    try {
      const firstName = fullName?.split(' ')[0] || 'Mentor';
      await supabase.functions.invoke('send-mentor-approval-email', {
        body: { user_id: userId, email, first_name: firstName }
      });
    } catch (err) {
      // Email failed silently
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!profile?.id) return;
    setProcessingId(requestId);
    const request = requests.find(r => r.id === requestId);
    
    const { error } = await supabase.rpc('approve_mentor_request', {
      _request_id: requestId,
      _admin_id: profile.id
    });

    if (error) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request approved!", description: "User has been granted mentor role." });
      if (request?.profiles?.email) {
        await sendMentorApprovalEmail(request.user_id, request.profiles.email, request.profiles.full_name || '');
      }
      fetchRequests();
    }
    setProcessingId(null);
  };

  const sendMentorRejectionEmail = async (userId: string, email: string, fullName: string) => {
    try {
      const firstName = fullName?.split(' ')[0] || 'Applicant';
      await supabase.functions.invoke('send-mentor-rejection-email', {
        body: { user_id: userId, email, first_name: firstName }
      });
    } catch (err) {
      // Email failed silently
    }
  };

  const handleReject = async (requestId: string) => {
    if (!profile?.id) return;
    setProcessingId(requestId);
    const request = requests.find(r => r.id === requestId);
    
    const { error } = await supabase.rpc('reject_mentor_request', {
      _request_id: requestId,
      _admin_id: profile.id
    });

    if (error) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request rejected", description: "The mentor request has been rejected." });
      if (request?.profiles?.email) {
        await sendMentorRejectionEmail(request.user_id, request.profiles.email, request.profiles.full_name || '');
      }
      fetchRequests();
    }
    setProcessingId(null);
  };

  const handleRevokeMentor = async (userId: string, requestId: string) => {
    setProcessingId(userId);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', userId);

    if (profileError) {
      toast({ title: "Revoke failed", description: profileError.message, variant: "destructive" });
    } else {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'mentor');
      await supabase.from('mentor_role_requests')
        .update({ status: 'revoked', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      
      toast({ title: "Mentor role revoked", description: "User has been demoted to student role." });
      fetchRequests();
    }
    setProcessingId(null);
  };

  const handleReinstateMentor = async (userId: string) => {
    if (!profile?.id) return;
    setProcessingId(userId);
    
    const { error } = await supabase.rpc('reinstate_mentor', {
      _user_id: userId,
      _admin_id: profile.id
    });

    if (error) {
      toast({ title: "Reinstate failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from('mentor_role_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('user_id', userId);
      
      toast({ title: "Mentor reinstated", description: "User has been granted mentor role again." });
      fetchRequests();
    }
    setProcessingId(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedMentors = requests.filter(r => r.status === 'approved');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with gradient accent */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-primary/10 to-accent/20 rounded-3xl blur-3xl opacity-50" />
          <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5">
                    <Sparkles className="h-6 w-6 text-secondary" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Admin Dashboard
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg">
                  Manage your platform, users, and content from one place
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20">
                  <Activity className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-medium text-secondary">System Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {/* Mentors Card */}
          <Card 
            className="group cursor-pointer border-0 bg-gradient-to-br from-purple-500/10 via-card to-card hover:from-purple-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
            onClick={() => navigate('/admin/users?filter=mentor')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                  <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Mentors</h3>
              <p className="text-2xl font-bold">{approvedMentors.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Active mentors</p>
            </CardContent>
          </Card>

          {/* Students Card */}
          <Card 
            className="group cursor-pointer border-0 bg-gradient-to-br from-blue-500/10 via-card to-card hover:from-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
            onClick={() => navigate('/admin/users?filter=student')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Students</h3>
              <p className="text-2xl font-bold">View All</p>
              <p className="text-xs text-muted-foreground mt-1">Manage accounts</p>
            </CardContent>
          </Card>

          {/* Pending Requests Card */}
          <Card 
            className={`group border-0 bg-gradient-to-br ${pendingRequests.length > 0 ? 'from-amber-500/10 via-card to-card' : 'from-secondary/10 via-card to-card'} transition-all duration-300`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${pendingRequests.length > 0 ? 'bg-amber-500/20' : 'bg-secondary/20'}`}>
                  <Clock className={`h-6 w-6 ${pendingRequests.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-secondary'}`} />
                </div>
                {pendingRequests.length > 0 && (
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Pending</h3>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card 
            className="group cursor-pointer border-0 bg-gradient-to-br from-emerald-500/10 via-card to-card hover:from-emerald-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1"
            onClick={() => navigate('/admin/revenue')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Revenue</h3>
              <p className="text-2xl font-bold">Analytics</p>
              <p className="text-xs text-muted-foreground mt-1">View reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {quickActionCategories.map((category) => (
                <Card key={category.title} className="border-0 bg-card/50 backdrop-blur-sm overflow-hidden group hover:bg-card transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color}`}>
                        <category.icon className={`h-4 w-4 ${category.iconColor}`} />
                      </div>
                      <CardTitle className="text-sm font-medium">{category.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    {category.items.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all group/item"
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* System Status Section */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">System Status</h2>
              </div>
              <SecurityAuditPanel />
            </div>
          </div>

          {/* Mentor Requests Panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mentor Requests</h2>
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0">
                  {pendingRequests.length} pending
                </Badge>
              )}
            </div>

            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <CheckCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No mentor requests</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {requests.slice(0, 10).map((request) => (
                      <div 
                        key={request.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          request.status === 'pending' 
                            ? 'bg-amber-500/5 border-amber-500/20' 
                            : request.status === 'approved'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-muted/30 border-border/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {request.profiles?.full_name || 'Unknown User'}
                              </h4>
                              <Badge 
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  request.status === 'pending' 
                                    ? 'border-amber-500/50 text-amber-600 dark:text-amber-400' 
                                    : request.status === 'approved'
                                    ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                                    : request.status === 'revoked'
                                    ? 'border-destructive/50 text-destructive'
                                    : 'border-muted-foreground/50'
                                }`}
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {request.profiles?.email}
                            </p>
                          </div>
                        </div>
                        
                        {request.reason && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-background/50 rounded-lg p-2">
                            "{request.reason}"
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                          
                          <div className="flex gap-1.5">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  onClick={() => handleApprove(request.id)}
                                  disabled={processingId === request.id}
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                                >
                                  {processingId === request.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleReject(request.id)}
                                  disabled={processingId === request.id}
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs"
                                >
                                  {processingId === request.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                </Button>
                              </>
                            )}
                            {request.status === 'approved' && (
                              <Button
                                onClick={() => handleRevokeMentor(request.user_id, request.id)}
                                disabled={processingId === request.user_id}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                {processingId === request.user_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserX className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            {(request.status === 'rejected' || request.status === 'revoked') && (
                              <Button
                                onClick={() => handleReinstateMentor(request.user_id)}
                                disabled={processingId === request.user_id}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                              >
                                {processingId === request.user_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
