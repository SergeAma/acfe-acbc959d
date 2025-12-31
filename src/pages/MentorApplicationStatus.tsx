import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface MentorRequest {
  id: string;
  status: string;
  reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export const MentorApplicationStatus = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MentorRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=signin');
      return;
    }

    const fetchRequest = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('mentor_role_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setRequest(data);
      }
      setLoading(false);
    };

    if (user) {
      fetchRequest();
    }
  }, [user, authLoading, navigate]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          badgeVariant: 'outline' as const,
          title: 'Application Under Review',
          description: 'Your mentor application is being reviewed by our team. We typically respond within 3-5 business days.',
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          badgeVariant: 'default' as const,
          title: 'Congratulations! You\'re Approved',
          description: 'Welcome to the ACFE mentor community! You can now create courses and mentor students.',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          badgeVariant: 'destructive' as const,
          title: 'Application Not Approved',
          description: 'Unfortunately, your application was not approved at this time. You can apply again after 30 days.',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'bg-muted text-muted-foreground',
          badgeVariant: 'secondary' as const,
          title: 'Unknown Status',
          description: 'Please contact support for more information.',
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // If user is already a mentor, redirect to dashboard
  if (profile?.role === 'mentor') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">You're Already a Mentor!</h1>
            <p className="text-muted-foreground mb-8">
              You have full mentor access. Start creating courses and mentoring students.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/mentor/courses')}>
                My Courses
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // No application found
  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">No Application Found</h1>
            <p className="text-muted-foreground mb-8">
              You haven't submitted a mentor application yet. Would you like to apply?
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/auth?mode=signup&role=mentor')}>
                Apply to Become a Mentor
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-3xl font-bold mb-2">Mentor Application Status</h1>
          <p className="text-muted-foreground mb-8">
            Track the status of your mentor application
          </p>

          <Card className={`border-2 ${statusConfig.color}`}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                <StatusIcon className="h-16 w-16" />
              </div>
              <CardTitle className="text-2xl">{statusConfig.title}</CardTitle>
              <CardDescription className="text-base">
                {statusConfig.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Badge variant={statusConfig.badgeVariant} className="text-sm px-4 py-1">
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Application Date</span>
                  <span className="text-sm font-medium">
                    {format(new Date(request.created_at), 'MMMM d, yyyy')}
                  </span>
                </div>
                {request.reviewed_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Review Date</span>
                    <span className="text-sm font-medium">
                      {format(new Date(request.reviewed_at), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {request.reason && (
                <div className="space-y-2">
                  <h3 className="font-medium">Your Application</h3>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {request.reason}
                  </div>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="flex justify-center pt-4">
                  <Button onClick={() => navigate('/mentor/courses')}>
                    Start Creating Courses
                  </Button>
                </div>
              )}

              {request.status === 'pending' && (
                <p className="text-center text-sm text-muted-foreground">
                  We'll notify you by email once your application has been reviewed.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};