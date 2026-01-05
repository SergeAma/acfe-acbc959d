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
import { Check, GraduationCap, Building2, Users, Briefcase, Award, BarChart3, MessageSquare, Globe, Loader2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { AFRICAN_UNIVERSITIES } from '@/data/universities';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

export const CareerCentreLanding = () => {
  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);
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
    contactPhone: '',
    estimatedStudents: '',
    message: '',
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

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institutionForm.institutionName || !institutionForm.institutionType || !institutionForm.firstName || !institutionForm.lastName || !institutionForm.contactEmail || !institutionForm.contactPhone || !institutionForm.estimatedStudents || !institutionForm.message) {
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
        firstName: '',
        lastName: '',
        contactEmail: '',
        contactPhone: '',
        estimatedStudents: '',
        message: '',
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

  const features = [
    { icon: Users, title: "Gated Student Environment", description: "Private, branded career centre exclusively for your institution's students" },
    { icon: Briefcase, title: "Job Opportunity Surfacing", description: "Curated job postings aligned with your students' completed courses and skills" },
    { icon: Award, title: "Spectrogram Talent Profiles", description: "Graduates automatically create verified talent profiles for employer discovery" },
    { icon: BarChart3, title: "Institutional Reporting", description: "Track participation, certifications, and job application outcomes" },
    { icon: MessageSquare, title: "Focused Discussions", description: "Signal-dense conversations around events, courses, and career opportunities" },
    { icon: Globe, title: "Africa-Focused Training", description: "Content designed specifically for African youth with locally relevant career paths" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-stone-100/50 to-background dark:from-stone-900/10 dark:to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-stone-200 dark:bg-stone-800/30 text-stone-700 dark:text-stone-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <GraduationCap className="h-4 w-4" />
              For Educational Institutions
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              "Your Institution" <span className="text-stone-600 dark:text-stone-400">Career Development Center</span>
              <span className="block text-xl md:text-2xl font-medium text-muted-foreground mt-2">Powered by ACFE</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Empower your students with job-ready tech skills, verified credentials, and direct pathways 
              to employment through our dedicated institutional partnership program.
            </p>
            <Button 
              size="lg" 
              className="bg-stone-600 hover:bg-stone-700 text-white h-14 px-8 text-lg"
              onClick={() => setShowInstitutionDialog(true)}
            >
              <Building2 className="h-5 w-5 mr-2" />
              Partner With ACFE
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What Your Students Get
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A private, branded environment designed to accelerate career outcomes for your graduates.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <Card key={index} className="border-border/50 hover:border-stone-500/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-stone-200 dark:bg-stone-800/30 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-stone-600 dark:text-stone-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Subscription Box */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto">
              <Card className="relative overflow-hidden border-2 border-stone-500/50 bg-gradient-to-b from-stone-100/50 to-background dark:from-stone-900/20 dark:to-background">
                <div className="absolute top-0 right-0 bg-stone-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                  <GraduationCap className="h-4 w-4 inline-block mr-1" />
                  Institutions
                </div>
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">Educational Partners</CardTitle>
                  <CardDescription className="text-base">
                    Empower your students with tech skills
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-3xl font-bold text-stone-600 dark:text-stone-400">Custom Pricing</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tailored to your institution's needs
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full mb-6 text-lg h-14 border-stone-500 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900/50" 
                    onClick={() => setShowInstitutionDialog(true)}
                  >
                    <Building2 className="h-5 w-5 mr-2" />
                    Contact ACFE Team
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Everything in Membership, plus:
                    </p>
                    {[
                      "Bespoke pricing for your institution",
                      "Tailored enablement events",
                      "Topic-driven mentorship at scale",
                      "Dedicated ACFE Career Centre",
                      "Spectrogram talent profiles for graduates"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center">
                          <Check className="h-3 w-3 text-stone-700 dark:text-stone-300" />
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

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Students' Careers?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join leading African institutions already partnering with ACFE to provide 
                world-class tech education and career pathways for their students.
              </p>
              <Button 
                size="lg" 
                className="bg-stone-600 hover:bg-stone-700 text-white h-14 px-8 text-lg"
                onClick={() => setShowInstitutionDialog(true)}
              >
                Get Started Today
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
              <GraduationCap className="h-5 w-5 text-stone-600 dark:text-stone-400" />
              Partner With ACFE
            </DialogTitle>
            <DialogDescription>
              Tell us about your institution and we'll create a tailored partnership proposal.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleInstitutionSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="institutionName">Institution Name *</Label>
              <AutocompleteInput
                id="institutionName"
                value={institutionForm.institutionName}
                onChange={(value) => setInstitutionForm(prev => ({ ...prev, institutionName: value }))}
                suggestions={AFRICAN_UNIVERSITIES}
                placeholder="Enter institution name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="institutionType">Institution Type *</Label>
              <Select
                value={institutionForm.institutionType}
                onValueChange={(value) => setInstitutionForm(prev => ({ ...prev, institutionType: value }))}
              >
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
                <Input
                  id="firstName"
                  value={institutionForm.firstName}
                  onChange={(e) => setInstitutionForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={institutionForm.lastName}
                  onChange={(e) => setInstitutionForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contactEmail">Work Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={institutionForm.contactEmail}
                onChange={(e) => setInstitutionForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="you@institution.edu"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Phone Number *</Label>
              <PhoneInput
                value={institutionForm.contactPhone}
                onChange={(value) => setInstitutionForm(prev => ({ ...prev, contactPhone: value || '' }))}
                id="contactPhone"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="estimatedStudents">Estimated Number of Students *</Label>
              <Select
                value={institutionForm.estimatedStudents}
                onValueChange={(value) => setInstitutionForm(prev => ({ ...prev, estimatedStudents: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-100">1 - 100</SelectItem>
                  <SelectItem value="101-500">101 - 500</SelectItem>
                  <SelectItem value="501-1000">501 - 1,000</SelectItem>
                  <SelectItem value="1001-5000">1,001 - 5,000</SelectItem>
                  <SelectItem value="5000+">5,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Tell us about your goals *</Label>
              <Textarea
                id="message"
                value={institutionForm.message}
                onChange={(e) => setInstitutionForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="What outcomes are you looking to achieve for your students?"
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div ref={turnstileRef} className="flex justify-center" />

            <Button 
              type="submit" 
              className="w-full bg-stone-600 hover:bg-stone-700"
              disabled={institutionLoading || !turnstileToken}
            >
              {institutionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Inquiry'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CareerCentreLanding;
