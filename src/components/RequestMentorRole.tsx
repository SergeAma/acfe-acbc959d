import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';

export const RequestMentorRole = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [hasRequest, setHasRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Check if user already has a request
  useState(() => {
    if (user) {
      checkExistingRequest();
    }
  });

  const checkExistingRequest = async () => {
    const { data, error } = await supabase
      .from('mentor_role_requests')
      .select('status')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) {
      setHasRequest(true);
      setRequestStatus(data.status as 'pending' | 'approved' | 'rejected');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('mentor_role_requests')
      .insert({
        user_id: user.id,
        reason: reason,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request submitted!",
        description: "An admin will review your request soon.",
      });
      setHasRequest(true);
      setRequestStatus('pending');
    }

    setLoading(false);
  };

  // Don't show if already a mentor or admin
  if (profile?.role === 'mentor' || profile?.role === 'admin') {
    return null;
  }

  if (hasRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Mentor Role Request
          </CardTitle>
          <CardDescription>
            Your request status: <span className="font-semibold capitalize">{requestStatus}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestStatus === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Your mentor role request is being reviewed by an administrator.
            </p>
          )}
          {requestStatus === 'approved' && (
            <p className="text-sm text-success">
              Congratulations! Your mentor role has been approved. Refresh the page to see your new permissions.
            </p>
          )}
          {requestStatus === 'rejected' && (
            <p className="text-sm text-destructive">
              Your mentor role request was not approved. Please contact support if you have questions.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Become a Mentor
        </CardTitle>
        <CardDescription>
          Request to upgrade your account to mentor status so you can create and teach courses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want to become a mentor?</Label>
            <Textarea
              id="reason"
              placeholder="Tell us about your expertise and teaching experience..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={5}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
