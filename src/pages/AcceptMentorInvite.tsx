import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function AcceptMentorInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "accepted" | "error">("loading");
  const [invitation, setInvitation] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const checkInvitation = async () => {
      if (!token) {
        setStatus("invalid");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('mentor_invitations')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (error || !data) {
          setStatus("invalid");
          return;
        }

        if (data.status === 'accepted') {
          setStatus("accepted");
          return;
        }

        if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
          setStatus("invalid");
          return;
        }

        setInvitation(data);
        setStatus("valid");
      } catch (error) {
        console.error("Error checking invitation:", error);
        setStatus("error");
      }
    };

    checkInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !token) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_mentor_invitation', {
        _token: token,
        _user_id: user.id
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Failed to accept invitation");
      }

      await refreshProfile();

      toast({
        title: "Welcome, Mentor!",
        description: "You now have mentor privileges. Let's set up your profile!",
      });

      navigate("/settings?tab=profile");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Failed to accept invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-lg mx-auto py-16 px-4">
        {status === "invalid" && (
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>
                This invitation link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/")}>
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "accepted" && (
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle>Already Accepted</CardTitle>
              <CardDescription>
                This invitation has already been accepted.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "valid" && !user && (
          <Card>
            <CardHeader className="text-center">
              <UserPlus className="h-16 w-16 text-primary mx-auto mb-4" />
              <CardTitle>Mentor Invitation</CardTitle>
              <CardDescription>
                You've been invited to become a mentor at A Cloud for Everyone!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Please sign in or create an account to accept this invitation.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate(`/auth?redirect=/accept-mentor-invite?token=${token}`)}>
                  Sign In
                </Button>
                <Button onClick={() => navigate(`/auth?mode=signup&redirect=/accept-mentor-invite?token=${token}`)}>
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "valid" && user && (
          <Card>
            <CardHeader className="text-center">
              <UserPlus className="h-16 w-16 text-primary mx-auto mb-4" />
              <CardTitle>Accept Mentor Invitation</CardTitle>
              <CardDescription>
                You've been invited to become a mentor at A Cloud for Everyone!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Signed in as:</p>
                <p className="font-medium">{user.email}</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">As a mentor, you'll be able to:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Create and publish courses</li>
                  <li>Share your expertise with students across Africa</li>
                  <li>Build your professional profile</li>
                  <li>Still enroll in courses as a student</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" onClick={() => navigate("/")}>
                  Decline
                </Button>
                <Button onClick={handleAccept} disabled={accepting}>
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    "Accept & Become a Mentor"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                There was an error processing your invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
