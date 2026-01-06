import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Sparkles, BookOpen, Video, Users, Award, Calendar, Briefcase, MessageSquare, BookMarked, Loader2, Zap, Globe, GraduationCap, Building2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { AFRICAN_UNIVERSITIES } from '@/data/universities';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

export const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [pricePerMonth, setPricePerMonth] = useState(15);
  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [institutionForm, setInstitutionForm] = useState({
    institutionName: '',
    institutionType: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    estimatedStudents: '',
    message: '',
  });

  useEffect(() => {
    const fetchPrice = async () => {
      const { data } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', 'subscription_price').single();
      if (data?.setting_value) {
        const priceCents = typeof data.setting_value === 'object' ? (data.setting_value as any).price_cents : data.setting_value;
        if (priceCents) {
          setPricePerMonth(priceCents / 100);
        }
      }
    };
    fetchPrice();
  }, []);

  // Initialize Turnstile when dialog opens
  useEffect(() => {
    if (!showInstitutionDialog) {
      // Reset token when dialog closes
      setTurnstileToken(null);
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
      return;
    }

    // Load Turnstile script if not already loaded
    const existingScript = document.querySelector('script[src*="turnstile"]');
    
    const initTurnstile = () => {
      // Wait for the ref to be available
      setTimeout(() => {
        if (turnstileRef.current && !turnstileWidgetId.current && (window as any).turnstile) {
          turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(null),
            theme: 'auto',
          });
        }
      }, 100);
    };

    if (existingScript) {
      initTurnstile();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = initTurnstile;
      document.head.appendChild(script);
    }
  }, [showInstitutionDialog]);

  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: 'membership' | 'mentorship_plus' = 'membership') => {
    if (!user) {
      navigate('/auth?redirect=/pricing');
      return;
    }

    setLoadingTier(tier);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { tier },
      });
      
      if (error) throw error;
      
      if (data?.alreadySubscribed) {
        if (data?.hasOtherSubscription) {
          toast.info("You have an existing subscription. Use 'Manage Billing' to upgrade or change your plan.", {
            action: {
              label: "My Subscriptions",
              onClick: () => navigate('/my-subscriptions'),
            },
          });
        } else {
          toast.info("You already have this subscription!");
        }
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
      setLoadingTier(null);
    }
  };

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institutionForm.institutionName || !institutionForm.institutionType || !institutionForm.contactName || !institutionForm.contactEmail || !institutionForm.contactPhone || !institutionForm.estimatedStudents || !institutionForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    setInstitutionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-institution-inquiry', {
        body: { ...institutionForm, turnstileToken },
      });
      
      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast.success('Thank you! Our partnerships team will contact you within 2-3 business days.');
      setShowInstitutionDialog(false);
      setInstitutionForm({
        institutionName: '',
        institutionType: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        estimatedStudents: '',
        message: '',
      });
      setTurnstileToken(null);
    } catch (error: any) {
      console.error('Institution inquiry error:', error);
      toast.error(error.message || 'Failed to submit inquiry. Please try again.');
      // Reset Turnstile on error
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken(null);
    } finally {
      setInstitutionLoading(false);
    }
  };

  const benefits = [
    { icon: BookOpen, title: t('pricing_benefit_courses'), description: t('pricing_benefit_courses_desc') },
    { icon: Video, title: t('pricing_benefit_qa'), description: t('pricing_benefit_qa_desc') },
    { icon: Users, title: t('pricing_benefit_sessions'), description: t('pricing_benefit_sessions_desc') },
    { icon: Briefcase, title: t('pricing_benefit_jobs'), description: t('pricing_benefit_jobs_desc') },
    { icon: MessageSquare, title: t('pricing_benefit_community'), description: t('pricing_benefit_community_desc') },
    { icon: Award, title: t('pricing_benefit_certs'), description: t('pricing_benefit_certs_desc') },
    { icon: Calendar, title: t('pricing_benefit_content'), description: t('pricing_benefit_content_desc') },
    { icon: BookMarked, title: t('pricing_benefit_notes'), description: t('pricing_benefit_notes_desc') },
    { icon: Globe, title: t('pricing_benefit_africa'), description: t('pricing_benefit_africa_desc') },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              {t('pricing_hero_title')} <span className="text-primary">{t('pricing_hero_title_highlight')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {t('pricing_hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {/* Free Tier */}
              <Card className="relative overflow-hidden border border-border">
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">{t('pricing_free_title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('pricing_free_desc')}
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">$0</span>
                    <span className="text-muted-foreground text-lg">/{t('pricing_month')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('pricing_no_card')}
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button size="lg" variant="outline" className="w-full mb-6 text-lg h-14" onClick={() => navigate('/auth')}>
                    {t('pricing_create_free')}
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {t('pricing_included')}
                    </p>
                    {[t('pricing_free_f1'), t('pricing_free_f2'), t('pricing_free_f3'), t('pricing_free_f4'), t('pricing_free_f5')].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                          <Check className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Premium Tier - $15 */}
              <Card className="relative overflow-hidden border-2 border-primary shadow-xl">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                  {t('pricing_popular')}
                </div>
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">{t('pricing_premium_title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('pricing_premium_desc')}
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">${pricePerMonth}</span>
                    <span className="text-muted-foreground text-lg">/{t('pricing_month')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('pricing_cancel_anytime')}
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button size="lg" className="w-full mb-6 text-lg h-14" onClick={() => handleSubscribe('membership')} disabled={loading && loadingTier === 'membership'}>
                    {loading && loadingTier === 'membership' ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t('pricing_processing')}
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        {t('pricing_get_started')}
                      </>
                    )}
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {t('pricing_everything_plus')}
                    </p>
                    {[t('pricing_prem_f1'), t('pricing_prem_f2'), t('pricing_prem_f3'), t('pricing_prem_f4')].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-700" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Mentorship Plus Tier - $30 */}
              <Card className="relative overflow-hidden border-2 border-secondary/50 bg-gradient-to-b from-secondary/10 to-background dark:from-secondary/20 dark:to-background">
                <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                  <Users className="h-4 w-4 inline-block mr-1" />
                  1:1 Mentorship
                </div>
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">{t('pricing_mentorship_title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('pricing_mentorship_desc')}
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold text-secondary">$30</span>
                    <span className="text-muted-foreground text-lg">/{t('pricing_month')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('pricing_cancel_anytime')}
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button 
                    size="lg" 
                    className="w-full mb-6 text-lg h-14 bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
                    onClick={() => handleSubscribe('mentorship_plus')} 
                    disabled={loading && loadingTier === 'mentorship_plus'}
                  >
                    {loading && loadingTier === 'mentorship_plus' ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t('pricing_processing')}
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5 mr-2" />
                        {t('pricing_get_started')}
                      </>
                    )}
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {t('pricing_everything_membership_plus')}
                    </p>
                    {[t('pricing_mentorship_f1'), t('pricing_mentorship_f2'), t('pricing_mentorship_f3'), t('pricing_mentorship_f4')].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-secondary/20 flex items-center justify-center">
                          <Check className="h-3 w-3 text-secondary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Educational Institution Tier */}
              <Card className="relative overflow-hidden border-2 border-amber-500/50 bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background">
                <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                  <GraduationCap className="h-4 w-4 inline-block mr-1" />
                  {t('pricing_institutions')}
                </div>
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">{t('pricing_edu_title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('pricing_edu_desc')}
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-3xl font-bold text-amber-600">{t('pricing_custom')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('pricing_tailored')}
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full mb-6 text-lg h-14 border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50" 
                    onClick={() => setShowInstitutionDialog(true)}
                  >
                    <Building2 className="h-5 w-5 mr-2" />
                    {t('pricing_contact_team')}
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {t('pricing_everything_membership')}
                    </p>
                    {[t('pricing_edu_f1'), t('pricing_edu_f2'), t('pricing_edu_f3'), t('pricing_edu_f4'), t('pricing_edu_f5')].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center">
                          <Check className="h-3 w-3 text-amber-700" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('pricing_benefits_title')}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('pricing_benefits_subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Partner Highlight */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-4">{t('pricing_partner_badge')}</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {t('pricing_partner_title')}
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                {t('pricing_partner_desc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/jobs')}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  {t('pricing_view_jobs')}
                </Button>
                <Button variant="outline" onClick={() => navigate('/submit-idea')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('pricing_submit_idea')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t('pricing_faq_title')}
              </h2>
              
              <div className="space-y-6">
                {[
                  { q: t('pricing_faq_q1'), a: t('pricing_faq_a1') },
                  { q: t('pricing_faq_q2'), a: t('pricing_faq_a2') },
                  { q: t('pricing_faq_q3'), a: t('pricing_faq_a3') },
                  { q: t('pricing_faq_q4'), a: t('pricing_faq_a4') },
                  { q: t('pricing_faq_q5'), a: t('pricing_faq_a5') },
                  { q: t('pricing_faq_q6'), a: t('pricing_faq_a6') }
                ].map((faq, index) => (
                  <div key={index} className="bg-background rounded-lg p-6 border border-border">
                    <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('pricing_cta_title')}
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              {t('pricing_cta_subtitle')}
            </p>
            <Button size="lg" className="text-lg h-14 px-8" onClick={() => handleSubscribe('membership')} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {t('pricing_processing')}
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  {t('pricing_cta_button')} ${pricePerMonth}/{t('pricing_month')}
                </>
              )}
            </Button>
          </div>
        </section>
      </main>

      <Footer />

      {/* Institution Inquiry Dialog */}
      <Dialog open={showInstitutionDialog} onOpenChange={setShowInstitutionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              Educational Institution Partnership
            </DialogTitle>
            <DialogDescription>
              Tell us about your institution and we'll create a tailored partnership plan for your students.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleInstitutionSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="institutionName">Institution Name *</Label>
                <AutocompleteInput
                  id="institutionName"
                  placeholder="Start typing to see suggestions..."
                  value={institutionForm.institutionName}
                  onChange={(value) => setInstitutionForm(prev => ({ ...prev, institutionName: value }))}
                  suggestions={AFRICAN_UNIVERSITIES}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institutionType">Type *</Label>
                <Select 
                  value={institutionForm.institutionType} 
                  onValueChange={(value) => setInstitutionForm(prev => ({ ...prev, institutionType: value }))}
                >
                  <SelectTrigger id="institutionType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="high-school">High School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Your Name *</Label>
                <Input
                  id="contactName"
                  placeholder="Full name"
                  value={institutionForm.contactName}
                  onChange={(e) => setInstitutionForm(prev => ({ ...prev, contactName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email Address *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="you@institution.edu"
                  value={institutionForm.contactEmail}
                  onChange={(e) => setInstitutionForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone Number *</Label>
                <PhoneInput
                  id="contactPhone"
                  value={institutionForm.contactPhone}
                  onChange={(value) => setInstitutionForm(prev => ({ ...prev, contactPhone: value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedStudents">Estimated Students *</Label>
                <Input
                  id="estimatedStudents"
                  placeholder="e.g., 500"
                  value={institutionForm.estimatedStudents}
                  onChange={(e) => setInstitutionForm(prev => ({ ...prev, estimatedStudents: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Additional Information *</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your institution and what you're looking for..."
                value={institutionForm.message}
                onChange={(e) => setInstitutionForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                required
              />
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-amber-800 dark:text-amber-200">What your students will get:</p>
              <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                <li>• Bespoke pricing tailored to your institution</li>
                <li>• Tailored enablement events (workshops, hackathons)</li>
                <li>• Topic-driven mentorship at scale</li>
                <li>• Dedicated ACFE Career Centre for your students</li>
                <li>• Automatic Spectrogram talent profiles on course completion</li>
              </ul>
            </div>

            <div ref={turnstileRef} className="flex justify-center" />
            
            <Button type="submit" className="w-full" disabled={institutionLoading || !turnstileToken}>
              {institutionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Partnership Inquiry'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
