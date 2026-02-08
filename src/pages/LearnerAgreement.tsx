import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWelcomeEmail } from "@/hooks/useWelcomeEmail";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, Loader2, Heart, Users, Shield } from "lucide-react";

export default function LearnerAgreement() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendWelcomeEmail } = useWelcomeEmail();
  
  const [submitting, setSubmitting] = useState(false);
  const [hasAgreement, setHasAgreement] = useState<boolean | null>(null);
  const [checkingAgreement, setCheckingAgreement] = useState(true);

  // Agreement terms using translation keys
  const AGREEMENT_TERMS = [
    { title: t('learner.term1_title'), description: t('learner.term1_desc') },
    { title: t('learner.term2_title'), description: t('learner.term2_desc') },
    { title: t('learner.term3_title'), description: t('learner.term3_desc') },
    { title: t('learner.term4_title'), description: t('learner.term4_desc') },
    { title: t('learner.term5_title'), description: t('learner.term5_desc') },
    { title: t('learner.term6_title'), description: t('learner.term6_desc') },
    { title: t('learner.term7_title'), description: t('learner.term7_desc') },
    { title: t('learner.term8_title'), description: t('learner.term8_desc') },
  ];

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

  // Redirect to profile if profile is incomplete
  useEffect(() => {
    if (!authLoading && profile && !profile.full_name) {
      navigate('/profile');
    }
  }, [authLoading, profile, navigate]);

  const handleAgree = async () => {
    if (!user || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('learner_agreements')
        .insert({
          user_id: user.id,
          condition_good_conduct: true,
          condition_zero_tolerance: true,
          condition_respect_privacy: true,
          condition_no_liability_behavior: true,
          condition_no_liability_external: true,
          condition_promotional_rights: true,
          condition_non_refundable: true,
          condition_no_sharing: true,
          signature_name: profile?.full_name || 'Agreed',
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      // Send welcome email after successful agreement acceptance
      await sendWelcomeEmail({
        userId: user.id,
        userEmail: user.email || '',
        fullName: profile?.full_name || user.email || '',
        preferredLanguage: language,
        role: 'student'
      });

      await refreshProfile();

      toast({
        title: t('learner.welcome_title'),
        description: t('learner.welcome_desc'),
      });

      navigate('/dashboard');
    } catch (error: unknown) {
      console.error("Error signing agreement:", error);
      const message = error instanceof Error ? error.message : "Please try again";
      toast({
        title: "Something went wrong",
        description: message,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">{t('learner.title')}</CardTitle>
            <CardDescription className="text-base max-w-xl mx-auto">
              {t('learner.description')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Terms List */}
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-4">
                {AGREEMENT_TERMS.map((term, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{term.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {term.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Mission Statement */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-primary">{t('learner.mission_title')}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('learner.mission_desc')}
              </p>
            </div>

            {/* Agreement Notice */}
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                {t('learner.agreement_notice')}
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleAgree} 
              disabled={submitting}
              className="w-full py-6 text-lg"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('learner.processing')}
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-5 w-5" />
                  {t('learner.agree_button')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
