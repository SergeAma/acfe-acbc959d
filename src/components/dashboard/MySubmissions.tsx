import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Clock, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IdeaSubmission {
  id: string;
  idea_title: string;
  idea_description: string | null;
  status: string;
  created_at: string;
  video_url: string | null;
}

const statusConfig = {
  pending: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  rejected: {
    label: 'Not Selected',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  'under-review': {
    label: 'Under Review',
    icon: Eye,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
};

export const MySubmissions = () => {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<IdeaSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      // RLS now handles filtering by submitter_id automatically
      const { data, error } = await supabase
        .from('idea_submissions')
        .select('id, idea_title, idea_description, status, created_at, video_url')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSubmissions(data);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return null; // Don't show section if no submissions
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Startup Ideas</h2>
        <Link to="/startups">
          <Button variant="outline">
            <Rocket className="h-4 w-4 mr-2" />
            Submit New Idea
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {submissions.map((submission) => {
          const config = statusConfig[submission.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = config.icon;

          return (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg line-clamp-1">{submission.idea_title}</CardTitle>
                  <Badge variant="outline" className={config.className}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {submission.idea_description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {submission.idea_description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Submitted {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}</span>
                  {submission.video_url && (
                    <span className="flex items-center gap-1">
                      <Rocket className="h-3 w-3" />
                      Video attached
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};