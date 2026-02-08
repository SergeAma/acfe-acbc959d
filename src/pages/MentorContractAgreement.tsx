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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, Shield, AlertTriangle, CheckCircle2, Loader2, Heart } from "lucide-react";

export default function MentorContractAgreement() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendWelcomeEmail } = useWelcomeEmail();
  
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [signatureName, setSignatureName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasContract, setHasContract] = useState<boolean | null>(null);
  const [checkingContract, setCheckingContract] = useState(true);
  const [sessionPriceCents, setSessionPriceCents] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  // Fetch session price from platform settings
  useEffect(() => {
    const fetchSessionPrice = async () => {
      setPriceLoading(true);
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'mentorship_session_price')
          .single();
        
        if (!error && data) {
          const settings = data.setting_value as { price_cents: number };
          setSessionPriceCents(settings.price_cents);
        }
      } catch (error) {
        console.error("Error fetching session price:", error);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchSessionPrice();
  }, []);

  const sessionPriceDollars = sessionPriceCents !== null ? Math.round(sessionPriceCents / 100) : null;

  // Contract conditions using translation keys
  const CONTRACT_CONDITIONS = [
    { id: "condition_respect_students", title: t('mentor.term1_title'), description: t('mentor.term1_desc') },
    { id: "condition_free_courses", title: t('mentor.term2_title'), description: t('mentor.term2_desc') },
    { id: "condition_session_pricing", title: t('mentor.term3_title'), description: t('mentor.term3_desc').replace('${price}', sessionPriceDollars !== null ? `$${sessionPriceDollars}` : '...') },
    { id: "condition_minimum_courses", title: t('mentor.term4_title'), description: t('mentor.term4_desc') },
    { id: "condition_quarterly_events", title: t('mentor.term5_title'), description: t('mentor.term5_desc') },
    { id: "condition_data_privacy", title: t('mentor.term6_title'), description: t('mentor.term6_desc') },
    { id: "condition_support_youth", title: t('mentor.term8_title'), description: t('mentor.term8_desc') },
    { id: "condition_no_profanity", title: t('mentor.term9_title'), description: t('mentor.term9_desc') },
    { id: "condition_platform_engagement", title: t('mentor.term10_title'), description: t('mentor.term10_desc') },
    { id: "condition_promotional_rights", title: t('mentor.term11_title'), description: t('mentor.term11_desc') },
  ];

  // Check if user already has a signed contract
  useEffect(() => {
    const checkExistingContract = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('mentor_contracts')
          .select('id, requires_resign')
          .eq('mentor_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        // User needs to sign if no contract OR if requires_resign is true
        setHasContract(data ? !data.requires_resign : false);
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

  // Redirect if already has valid contract (not requiring re-sign)
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
      // Use upsert to handle both new contracts and re-signing
      const { error } = await supabase
        .from('mentor_contracts')
        .upsert({
          mentor_id: user.id,
          condition_respect_students: conditions.condition_respect_students,
          condition_free_courses: conditions.condition_free_courses,
          condition_session_pricing: conditions.condition_session_pricing,
          condition_minimum_courses: conditions.condition_minimum_courses,
          condition_quarterly_events: conditions.condition_quarterly_events,
          condition_data_privacy: conditions.condition_data_privacy,
          condition_monthly_meetings: true, // Legacy field - set to true for compatibility
          condition_support_youth: conditions.condition_support_youth,
          condition_no_profanity: conditions.condition_no_profanity,
          condition_platform_engagement: conditions.condition_platform_engagement,
          condition_promotional_rights: conditions.condition_promotional_rights,
          signature_name: signatureName.trim(),
          signature_date: new Date().toISOString(),
          user_agent: navigator.userAgent,
          requires_resign: false, // Clear the re-sign flag
        }, { 
          onConflict: 'mentor_id' 
        });

      if (error) throw error;

      // Send welcome email after successful contract signing
      await sendWelcomeEmail({
        userId: user.id,
        userEmail: user.email || '',
        fullName: profile?.full_name || signatureName.trim() || user.email || '',
        preferredLanguage: language,
        role: 'mentor'
      });

      await refreshProfile();

      toast({
        title: t('mentor.success_title'),
        description: t('mentor.success_desc'),
      });

      navigate('/dashboard');
    } catch (error: unknown) {
      console.error("Error signing contract:", error);
      const message = error instanceof Error ? error.message : "Please try again";
      toast({
        title: "Failed to Sign Contract",
        description: message,
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
            <CardTitle className="text-2xl md:text-3xl">{t('mentor.agreement_title')}</CardTitle>
            <CardDescription className="text-base max-w-xl mx-auto">
              {t('mentor.agreement_description')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Important Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">{t('mentor.binding_title')}</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  {t('mentor.binding_desc')}
                </p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('mentor.conditions_accepted')}</span>
              <span className="font-medium">
                {acceptedCount} / {CONTRACT_CONDITIONS.length}
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
                <h3 className="font-semibold text-primary">{t('mentor.mission_title')}</h3>
              </div>
              <p className="text-sm leading-relaxed">
                {t('mentor.mission_desc')}
              </p>
            </div>

            <Separator />

            {/* Digital Signature */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{t('mentor.digital_signature')}</h3>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {t('mentor.signature_instruction')}
              </p>

              <div className="space-y-2">
                <Label htmlFor="signature">{t('mentor.full_legal_name')}</Label>
                <Input
                  id="signature"
                  placeholder={t('mentor.type_name_placeholder')}
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="text-lg"
                  disabled={!allConditionsAccepted}
                />
                {!allConditionsAccepted && (
                  <p className="text-sm text-muted-foreground">
                    {t('mentor.accept_all_first')}
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
                  {t('mentor.signing')}
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-5 w-5" />
                  {t('mentor.sign_button')}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t('mentor.footer_notice')}{" "}
              <a href="/terms" target="_blank" className="text-primary hover:underline">
                {t('terms_of_service')}
              </a>{" "}
              {t('and')}{" "}
              <a href="/privacy" target="_blank" className="text-primary hover:underline">
                {t('privacy_policy')}
              </a>
              {t('mentor.footer_provisions')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
