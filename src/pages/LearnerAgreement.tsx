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
import { FileSignature, Shield, AlertTriangle, CheckCircle2, Loader2, Heart, Users } from "lucide-react";

const AGREEMENT_CONDITIONS = [
  {
    id: "condition_good_conduct",
    title: "Good Conduct",
    description: "I commit to maintaining good conduct with fellow learners in all forums and cohorts."
  },
  {
    id: "condition_zero_tolerance",
    title: "Zero Tolerance Policy",
    description: "I understand and accept that there is zero tolerance for bullying or use of profanity on the platform."
  },
  {
    id: "condition_respect_privacy",
    title: "Respect & Privacy",
    description: "I commit to respecting fellow learners as well as mentor privacy at all times."
  },
  {
    id: "condition_no_liability_behavior",
    title: "Student Behaviour Liability",
    description: "I accept that ACFE shall not be held responsible or accountable for any other student's behaviour."
  },
  {
    id: "condition_no_liability_external",
    title: "External Connections Liability",
    description: "I accept that ACFE shall not be held responsible or accountable for any outcome if students or mentors decide to connect outside the ACFE platform."
  },
  {
    id: "condition_promotional_rights",
    title: "Promotional Rights",
    description: "I agree that ACFE reserves the right to publicly share and promote any positive outcomes as a result of my learning & mentorship experience."
  },
  {
    id: "condition_non_refundable",
    title: "Membership Fees",
    description: "I understand that once subscribed, membership fees are non-refundable unless cancellation happens before the next billing cycle."
  },
  {
    id: "condition_no_sharing",
    title: "Account & Promo Code Sharing",
    description: "I agree not to share my login credentials with any other individual, nor any promotional code I have access to."
  }
];

export default function LearnerAgreement() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [signatureName, setSignatureName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasAgreement, setHasAgreement] = useState<boolean | null>(null);
  const [checkingAgreement, setCheckingAgreement] = useState(true);

  // Check if user already has a signed agreement
  useEffect(() => {
    const checkExistingAgreement = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('learner_agreements')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        setHasAgreement(!!data);
      } catch (error) {
        console.error("Error checking agreement:", error);
        setHasAgreement(false);
      } finally {
        setCheckingAgreement(false);
      }
    };

    if (user) {
      checkExistingAgreement();
    }
  }, [user]);

  // Redirect if already has agreement
  useEffect(() => {
    if (hasAgreement === true) {
      navigate('/dashboard');
    }
  }, [hasAgreement, navigate]);

  const handleConditionChange = (conditionId: string, checked: boolean) => {
    setConditions(prev => ({
      ...prev,
      [conditionId]: checked
    }));
  };

  const allConditionsAccepted = AGREEMENT_CONDITIONS.every(c => conditions[c.id] === true);
  const isValidSignature = signatureName.trim().length >= 3;
  const canSubmit = allConditionsAccepted && isValidSignature && !submitting;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('learner_agreements')
        .insert({
          user_id: user.id,
          condition_good_conduct: conditions.condition_good_conduct,
          condition_zero_tolerance: conditions.condition_zero_tolerance,
          condition_respect_privacy: conditions.condition_respect_privacy,
          condition_no_liability_behavior: conditions.condition_no_liability_behavior,
          condition_no_liability_external: conditions.condition_no_liability_external,
          condition_promotional_rights: conditions.condition_promotional_rights,
          condition_non_refundable: conditions.condition_non_refundable,
          condition_no_sharing: conditions.condition_no_sharing,
          signature_name: signatureName.trim(),
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Agreement Signed Successfully",
        description: "Welcome to the ACFE learning community! You now have full access to the platform.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error("Error signing agreement:", error);
      toast({
        title: "Failed to Sign Agreement",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checkingAgreement) {
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

  const acceptedCount = AGREEMENT_CONDITIONS.filter(c => conditions[c.id]).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">ACFE Learner Agreement</CardTitle>
            <CardDescription className="text-base max-w-xl mx-auto">
              Before you can fully access the platform, please review and accept each of 
              the following terms that help maintain a positive and respectful learning community.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Important Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Community Agreement</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  This agreement defines our community standards and your responsibilities as an ACFE learner.
                  By signing below, you agree to uphold these standards throughout your time with ACFE.
                </p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Terms Accepted</span>
              <span className="font-medium">
                {acceptedCount} of {AGREEMENT_CONDITIONS.length}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(acceptedCount / AGREEMENT_CONDITIONS.length) * 100}%` }}
              />
            </div>

            <Separator />

            {/* Conditions List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {AGREEMENT_CONDITIONS.map((condition, index) => (
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
                All proceeds from memberships are reinvested into funding internships and sponsoring partner 
                charities such as the LEARN Project. We hope you are here to grow, learn, and contribute 
                to our community of African professionals.
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
                and confirming that you have read, understood, and agree to all the terms above.
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
                    Please accept all terms above before signing.
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
