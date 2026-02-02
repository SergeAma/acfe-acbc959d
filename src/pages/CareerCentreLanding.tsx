import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, GraduationCap, Building2, Users, Briefcase, Award, BarChart3, MessageSquare, Globe, Loader2, FileText, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { UNIVERSITIES } from '@/data/universities';
import { useLanguage } from '@/contexts/LanguageContext';
const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';
export const CareerCentreLanding = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);
  const [brochureOpen, setBrochureOpen] = useState(false);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [institutionForm, setInstitutionForm] = useState({
    institutionName: '',
    institutionType: '',
    firstName: '',
    lastName: '',
    contactEmail: '',
    country: '',
    contactPhone: '',
    estimatedStudents: '',
    message: ''
  });

  // Initialize Turnstile when dialog opens
  useEffect(() => {
    if (!showInstitutionDialog) {
      setTurnstileToken(null);
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
      return;
    }
    const existingScript = document.querySelector('script[src*="turnstile"]');
    const initTurnstile = () => {
      setTimeout(() => {
        if (turnstileRef.current && !turnstileWidgetId.current && (window as any).turnstile) {
          turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(null),
            theme: 'auto'
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
  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionForm.institutionName || !institutionForm.institutionType || !institutionForm.firstName || !institutionForm.contactEmail || !institutionForm.country || !institutionForm.contactPhone || !institutionForm.estimatedStudents) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }
    setInstitutionLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-institution-inquiry', {
        body: {
          ...institutionForm,
          turnstileToken
        }
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
        firstName: '',
        lastName: '',
        contactEmail: '',
        country: '',
        contactPhone: '',
        estimatedStudents: '',
        message: ''
      });
      setTurnstileToken(null);
    } catch (error: any) {
      console.error('Institution inquiry error:', error);
      toast.error(error.message || 'Failed to submit inquiry. Please try again.');
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken(null);
    } finally {
      setInstitutionLoading(false);
    }
  };
  const features = [{
    icon: Users,
    title: t('career_feature_env'),
    description: t('career_feature_env_desc')
  }, {
    icon: Briefcase,
    title: t('career_feature_jobs'),
    description: t('career_feature_jobs_desc')
  }, {
    icon: Award,
    title: t('career_feature_profiles'),
    description: t('career_feature_profiles_desc')
  }, {
    icon: BarChart3,
    title: t('career_feature_reporting'),
    description: t('career_feature_reporting_desc')
  }, {
    icon: MessageSquare,
    title: t('career_feature_discuss'),
    description: t('career_feature_discuss_desc')
  }, {
    icon: Globe,
    title: t('career_feature_africa'),
    description: t('career_feature_africa_desc')
  }];
  return <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-stone-100/50 to-background dark:from-stone-900/10 dark:to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-stone-200 dark:bg-stone-800/30 text-stone-700 dark:text-stone-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <GraduationCap className="h-4 w-4" />
              {t('career_badge')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-amber-700">{t('career_hero_highlight')}</span> {t('career_hero_title')}
              <span className="block text-xl md:text-2xl font-medium text-muted-foreground mt-2">{t('career_powered_by')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              {t('career_hero_subtitle')}
            </p>
            <Button size="lg" onClick={() => setShowInstitutionDialog(true)} className="text-white h-14 px-8 text-lg bg-amber-600 hover:bg-amber-500">
              <Building2 className="h-5 w-5 mr-2" />
              {t('career_partner_cta')}
            </Button>
          </div>
        </section>

        {/* Brochure Section */}
        <section className="py-8 md:py-12 bg-stone-50 dark:bg-stone-900/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Collapsible open={brochureOpen} onOpenChange={setBrochureOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-between gap-2 h-14 text-base border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-amber-600" />
                      <span className="font-medium">View ACFE 2026 Brochure</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${brochureOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-900">
                    <iframe
                      src="/documents/acfe-brochure-2026.pdf"
                      className="w-full"
                      style={{ height: isMobile ? '60vh' : '70vh' }}
                      title="ACFE 2026 Brochure"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    <a 
                      href="/documents/acfe-brochure-2026.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Open PDF in new tab
                    </a>
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('career_features_title')}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('career_features_subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => <Card key={index} className="border-border/50 hover:border-stone-500/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-stone-200 dark:bg-stone-800/30 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-stone-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>)}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('career_cta_title')}
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                {t('career_cta_subtitle')}
              </p>
              <Button size="lg" onClick={() => setShowInstitutionDialog(true)} className="text-white h-14 px-8 text-lg bg-amber-600 hover:bg-amber-500">
                {t('career_cta_button')}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Institution Inquiry Dialog */}
      <Dialog open={showInstitutionDialog} onOpenChange={setShowInstitutionDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-stone-600" />
              {t('career_dialog_title')}
            </DialogTitle>
            <DialogDescription>
              {t('career_dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleInstitutionSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="institutionName">Institution Name *</Label>
              <AutocompleteInput id="institutionName" value={institutionForm.institutionName} onChange={value => setInstitutionForm(prev => ({
              ...prev,
              institutionName: value
            }))} suggestions={UNIVERSITIES} placeholder="Enter institution name" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="institutionType">Institution Type *</Label>
              <Select value={institutionForm.institutionType} onValueChange={value => setInstitutionForm(prev => ({
              ...prev,
              institutionType: value
            }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="college">College / Polytechnic</SelectItem>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="training_center">Training Center</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" value={institutionForm.firstName} onChange={e => setInstitutionForm(prev => ({
                ...prev,
                firstName: e.target.value
              }))} placeholder="First name" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={institutionForm.lastName} onChange={e => setInstitutionForm(prev => ({
                ...prev,
                lastName: e.target.value
              }))} placeholder="Last name" className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="contactEmail">Email Address *</Label>
              <Input id="contactEmail" type="email" value={institutionForm.contactEmail} onChange={e => setInstitutionForm(prev => ({
              ...prev,
              contactEmail: e.target.value
            }))} placeholder="you@institution.edu" className="mt-1" required />
            </div>

            <div>
              <Label htmlFor="country">Country *</Label>
              <AutocompleteInput 
                id="country" 
                value={institutionForm.country} 
                onChange={value => setInstitutionForm(prev => ({
                  ...prev,
                  country: value
                }))} 
                suggestions={['Kenya', 'Nigeria', 'South Africa', 'Ghana', 'Ethiopia', 'Tanzania', 'Uganda', 'Rwanda', 'Egypt', 'Morocco', 'Cameroon', 'Ivory Coast', 'Senegal', 'Democratic Republic of Congo', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Mozambique', 'Angola']} 
                placeholder="Select country" 
                className="mt-1" 
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Phone Number *</Label>
              <PhoneInput value={institutionForm.contactPhone} onChange={value => setInstitutionForm(prev => ({
              ...prev,
              contactPhone: value || ''
              }))} id="contactPhone" className="mt-1" required />
            </div>

            <div>
              <Label htmlFor="estimatedStudents">Estimated Students *</Label>
              <Input 
                id="estimatedStudents" 
                type="number" 
                value={institutionForm.estimatedStudents} 
                onChange={e => setInstitutionForm(prev => ({
                  ...prev,
                  estimatedStudents: e.target.value
                }))} 
                placeholder="e.g. 500" 
                className="mt-1" 
                required 
              />
            </div>

            <div>
              <Label htmlFor="message">Tell us about your goals (optional)</Label>
              <Textarea id="message" value={institutionForm.message} onChange={e => setInstitutionForm(prev => ({
              ...prev,
              message: e.target.value
            }))} placeholder="What outcomes are you looking to achieve for your students?" className="mt-1 min-h-[100px]" />
            </div>

            <div ref={turnstileRef} className="flex justify-center" />

            <Button type="submit" className="w-full bg-stone-500 hover:bg-stone-600" disabled={institutionLoading || !turnstileToken}>
              {institutionLoading ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </> : 'Submit Inquiry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};
export default CareerCentreLanding;