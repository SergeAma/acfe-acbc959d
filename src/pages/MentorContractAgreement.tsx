import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, Shield, AlertTriangle, CheckCircle2, Loader2, Heart } from "lucide-react";

const CONTRACT_CONDITIONS = [
  {
    id: "condition_respect_students",
    title: "Respect & Data Protection",
    description: "I commit to respecting all students and always protecting their data and dignity."
  },
  {
    id: "condition_free_courses",
    title: "Free Short Courses",
    description: "I agree to provide all short courses free of charge on the ACFE platform."
  },
  {
    id: "condition_session_pricing",
    title: "1:1 Mentoring Session Pricing",
    description: "I agree to charge only $50 per 1:1 mentoring session, with a 10% ACFE administrative fee."
  },
  {
    id: "condition_minimum_courses",
    title: "Course Creation Commitment",
    description: "I commit to creating at least 4 courses of 30 minutes maximum duration each."
  },
  {
    id: "condition_quarterly_events",
    title: "Live Events Commitment",
    description: "I commit to hosting at least 1 live event per quarter."
  },
  {
    id: "condition_data_privacy",
    title: "Student Data Privacy",
    description: "I commit to not discussing student-specific data online (social media or any public platform)."
  },
  {
    id: "condition_monthly_meetings",
    title: "Monthly Mentor Meetings",
    description: "I commit to joining at least 1 ACFE mentor's general meeting per month."
  },
  {
    id: "condition_support_youth",
    title: "Supporting African Youth",
    description: "I commit and promise to always help and support African youth on the platform by encouraging and inspiring them through every action."
  },
  {
    id: "condition_no_profanity",
    title: "Professional Conduct",
    description: "I commit to not using profanity on the ACFE platform nor within any contact with mentees."
  },
  {
    id: "condition_platform_engagement",
    title: "Platform-Only Engagement",
    description: "I commit to only engaging with mentees within the ACFE ecosystem and platform. Any exterior engagement must be reported, upon which responsibilities towards student rights will be passed on to me moving forward."
  }
];

export default function MentorContractAgreement() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [signatureName, setSignatureName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasContract, setHasContract] = useState<boolean | null>(null);
  const [checkingContract, setCheckingContract] = useState(true);

  // Check if user already has a signed contract
  useEffect(() => {
    const checkExistingContract = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('mentor_contracts')
          .select('id')
          .eq('mentor_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        setHasContract(!!data);
      } catch (error) {
        console.error("Error checking contract:", error);
        setHasContract(false);
      } finally {
        setCheckingContract(false);
      }
    };

    if (user) {
      checkExistingContract();
    }
  }, [user]);

  // Redirect if already has contract
  useEffect(() => {
    if (hasContract === true) {
      navigate('/dashboard');
    }
  }, [hasContract, navigate]);

  // Redirect non-mentors
  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'mentor' && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [authLoading, profile, navigate]);

  const handleConditionChange = (conditionId: string, checked: boolean) => {
    setConditions(prev => ({
      ...prev,
      [conditionId]: checked
    }));
  };

  const allConditionsAccepted = CONTRACT_CONDITIONS.every(c => conditions[c.id] === true);
  const isValidSignature = signatureName.trim().length >= 3;
  const canSubmit = allConditionsAccepted && isValidSignature && !submitting;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('mentor_contracts')
        .insert({
          mentor_id: user.id,
          condition_respect_students: conditions.condition_respect_students,
          condition_free_courses: conditions.condition_free_courses,
          condition_session_pricing: conditions.condition_session_pricing,
          condition_minimum_courses: conditions.condition_minimum_courses,
          condition_quarterly_events: conditions.condition_quarterly_events,
          condition_data_privacy: conditions.condition_data_privacy,
          condition_monthly_meetings: conditions.condition_monthly_meetings,
          condition_support_youth: conditions.condition_support_youth,
          condition_no_profanity: conditions.condition_no_profanity,
          condition_platform_engagement: conditions.condition_platform_engagement,
          signature_name: signatureName.trim(),
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Contract Signed Successfully",
        description: "Welcome to the ACFE Mentor community! You now have full access to mentor features.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error("Error signing contract:", error);
      toast({
        title: "Failed to Sign Contract",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checkingContract) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    navigate('/auth');
    return null;
  }

  const acceptedCount = CONTRACT_CONDITIONS.filter(c => conditions[c.id]).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">ACFE Mentor Agreement</CardTitle>
            <CardDescription className="text-base max-w-xl mx-auto">
              Before you can access your mentor dashboard and start creating courses, 
              please review and accept each of the following commitments that define 
              our community standards.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Important Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Binding Agreement</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  This is a binding contractual agreement between you and A Cloud for Everyone (ACFE). 
                  By signing below, you agree to uphold these standards throughout your mentorship.
                </p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Conditions Accepted</span>
              <span className="font-medium">
                {acceptedCount} of {CONTRACT_CONDITIONS.length}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(acceptedCount / CONTRACT_CONDITIONS.length) * 100}%` }}
              />
            </div>

            <Separator />

            {/* Conditions List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {CONTRACT_CONDITIONS.map((condition, index) => (
                  <div 
                    key={condition.id}
                    className={`p-4 rounded-lg border transition-all ${
                      conditions[condition.id] 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={condition.id}
                        checked={conditions[condition.id] || false}
                        onCheckedChange={(checked) => 
                          handleConditionChange(condition.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={condition.id} 
                          className="font-medium cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-muted-foreground text-sm">
                            {index + 1}.
                          </span>
                          {condition.title}
                          {conditions[condition.id] && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {condition.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Mission Statement */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Our Mission</h3>
              </div>
              <p className="text-sm leading-relaxed">
                ACFE is a not-for-profit organisation. We exist because we want to make a difference. 
                All proceeds from courses are reinvested into funding internships and sponsoring partner 
                charities such as the LEARN Project. We hope you are here for the same purpose. If so, join us!
              </p>
            </div>

            <Separator />

            {/* Digital Signature */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Digital Signature</h3>
              </div>
              
              <p className="text-sm text-muted-foreground">
                By typing your full legal name below, you are digitally signing this agreement 
                and confirming that you have read, understood, and agree to all the conditions above.
              </p>

              <div className="space-y-2">
                <Label htmlFor="signature">Full Legal Name</Label>
                <Input
                  id="signature"
                  placeholder="Type your full legal name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="text-lg"
                  disabled={!allConditionsAccepted}
                />
                {!allConditionsAccepted && (
                  <p className="text-sm text-muted-foreground">
                    Please accept all conditions above before signing.
                  </p>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Date: {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit}
              className="w-full py-6 text-lg"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing Agreement...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-5 w-5" />
                  Sign Agreement & Continue
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              A copy of this signed agreement will be stored securely and may be referenced 
              in case of any disputes or policy violations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
