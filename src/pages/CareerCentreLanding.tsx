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
import { Check, GraduationCap, Building2, Users, Briefcase, Award, BarChart3, MessageSquare, Globe, Loader2, ArrowRight, Sparkles } from 'lucide-react';
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
    title: "Gated Student Environment",
    description: "Private, branded career centre exclusively for your institution's students"
  }, {
    icon: Briefcase,
    title: "Job Opportunity Surfacing",
    description: "Curated job postings aligned with your students' completed courses and skills"
  }, {
    icon: Award,
    title: "Spectrogram Talent Profiles",
    description: "Graduates automatically create verified talent profiles for employer discovery"
  }, {
    icon: BarChart3,
    title: "Institutional Reporting",
    description: "Track participation, certifications, and job application outcomes"
  }, {
    icon: MessageSquare,
    title: "Focused Discussions",
    description: "Signal-dense conversations around events, courses, and career opportunities"
  }, {
    icon: Globe,
    title: "Africa-Focused Training",
    description: "Content designed specifically for African youth with locally relevant career paths"
  }];
  const stats = [{
    value: "500+",
    label: "Graduates Placed"
  }, {
    value: "50+",
    label: "Partner Institutions"
  }, {
    value: "95%",
    label: "Employment Rate"
  }];
  return <div className="min-h-screen bg-background flex flex-col">
      
      
      <main className="flex-1">
        {/* Hero Section - Bold & Dramatic */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Geometric Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-background to-amber-100/30 dark:from-amber-950/20 dark:via-background dark:to-amber-900/10" />
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
          
          {/* Floating Decorative Elements */}
          <div className="absolute top-20 right-[15%] w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{
          animationDuration: '4s'
        }} />
          <div className="absolute bottom-20 left-[10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{
          animationDuration: '6s',
          animationDelay: '2s'
        }} />
          
          <div className="container relative mx-auto px-4 py-20 md:py-32">
            <div className="max-w-5xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 text-amber-700 dark:text-amber-400 px-5 py-2.5 rounded-full text-sm font-medium mb-8 opacity-0 animate-fade-in" style={{
              animationDelay: '0.1s',
              animationFillMode: 'forwards'
            }}>
                <Sparkles className="h-4 w-4" />
                For Educational Institutions
              </div>
              
              {/* Main Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight mb-6 opacity-0 animate-fade-in" style={{
              animationDelay: '0.2s',
              animationFillMode: 'forwards'
            }}>
                <span className="block text-foreground">Your Institution's</span>
                <span className="block bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                  Career Engine
                </span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mb-10 leading-relaxed opacity-0 animate-fade-in" style={{
              animationDelay: '0.3s',
              animationFillMode: 'forwards'
            }}>
                Transform your graduates into job-ready tech talent with verified credentials 
                and direct pathways to employment.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-16 opacity-0 animate-fade-in" style={{
              animationDelay: '0.4s',
              animationFillMode: 'forwards'
            }}>
                <Button size="lg" className="bg-amber-700 hover:bg-amber-800 text-white h-14 px-8 text-lg rounded-full shadow-lg shadow-amber-700/20 hover:shadow-xl hover:shadow-amber-800/25 transition-all duration-300 hover:-translate-y-0.5" onClick={() => setShowInstitutionDialog(true)}>
                  <Building2 className="h-5 w-5 mr-2" />
                  Partner With ACFE
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all duration-300" onClick={() => document.getElementById('features')?.scrollIntoView({
                behavior: 'smooth'
              })}>
                  Learn More
                </Button>
              </div>
              
              {/* Stats Row */}
              <div className="flex flex-wrap gap-8 md:gap-16 opacity-0 animate-fade-in" style={{
              animationDelay: '0.5s',
              animationFillMode: 'forwards'
            }}>
                {stats.map((stat, index) => <div key={index} className="text-center md:text-left">
                    <div className="text-3xl md:text-4xl font-bold text-amber-600">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>)}
              </div>
            </div>
          </div>
          
          {/* Bottom Wave Decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* Features Grid - Staggered Layout */}
        <section id="features" className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="max-w-3xl mb-16 md:mb-24">
              <span className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-4 block">
                What We Offer
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Everything your students need to <span className="text-amber-600">succeed</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl">
                A private, branded environment designed to accelerate career outcomes for your graduates.
              </p>
            </div>

            {/* Feature Cards - Asymmetric Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {features.map((feature, index) => <Card key={index} className={`group relative overflow-hidden border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 ${index === 0 ? 'lg:col-span-2 lg:row-span-1' : ''}`}>
                  {/* Gradient Border Effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardContent className={`relative p-8 ${index === 0 ? 'lg:flex lg:items-center lg:gap-8' : ''}`}>
                    <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-800/30 flex items-center justify-center mb-6 ${index === 0 ? 'lg:mb-0 lg:flex-shrink-0' : ''} group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-3 group-hover:text-amber-600 transition-colors">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>
        </section>

        {/* Pricing/Partnership Card - Centered & Premium */}
        <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container relative mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-b from-card via-card to-amber-50/20 dark:to-amber-950/10">
                {/* Premium Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-semibold rounded-full shadow-lg">
                  <GraduationCap className="h-4 w-4" />
                  For Institutions
                </div>
                
                <CardHeader className="text-center pt-16 pb-8 px-8">
                  <CardTitle className="text-3xl md:text-4xl mb-4">Educational Partners</CardTitle>
                  <CardDescription className="text-lg max-w-md mx-auto">
                    Empower your students with world-class tech skills and direct career pathways
                  </CardDescription>
                  <div className="mt-8">
                    <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                      Custom Pricing
                    </span>
                    <p className="text-muted-foreground mt-2">Tailored to your institution's needs</p>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-12 px-8">
                  <Button size="lg" className="w-full mb-10 text-lg h-16 bg-amber-700 hover:bg-amber-800 text-white rounded-xl shadow-lg shadow-amber-700/15 hover:shadow-xl hover:shadow-amber-800/20 transition-all duration-300" onClick={() => setShowInstitutionDialog(true)}>
                    <Building2 className="h-5 w-5 mr-2" />
                    Contact ACFE Team
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                  
                  <div className="space-y-4">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-6">
                      Everything in Membership, plus:
                    </p>
                    {["Bespoke pricing for your institution", "Tailored enablement events", "Topic-driven mentorship at scale", "Dedicated ACFE Career Centre", "Spectrogram talent profiles for graduates"].map((feature, index) => <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-base">{feature}</span>
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Bold & Compelling */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-700" />
          <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }} />
          
          <div className="container relative mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
                Ready to Transform Your Students' Careers?
              </h2>
              <p className="text-amber-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                Join leading African institutions already partnering with ACFE to provide 
                world-class tech education and career pathways for their students.
              </p>
              <Button size="lg" className="bg-white hover:bg-amber-50 text-amber-800 h-16 px-10 text-lg rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1" onClick={() => setShowInstitutionDialog(true)}>
                Get Started Today
                <ArrowRight className="h-5 w-5 ml-2" />
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
              <GraduationCap className="h-5 w-5 text-amber-600" />
              Partner With ACFE
            </DialogTitle>
            <DialogDescription>
              Tell us about your institution and we'll create a tailored partnership proposal.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleInstitutionSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="institutionName">Institution Name *</Label>
              <AutocompleteInput id="institutionName" value={institutionForm.institutionName} onChange={value => setInstitutionForm(prev => ({
              ...prev,
              institutionName: value
            }))} suggestions={AFRICAN_UNIVERSITIES} placeholder="Enter institution name" className="mt-1" />
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
              }))} placeholder="First name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" value={institutionForm.lastName} onChange={e => setInstitutionForm(prev => ({
                ...prev,
                lastName: e.target.value
              }))} placeholder="Last name" className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="contactEmail">Work Email *</Label>
              <Input id="contactEmail" type="email" value={institutionForm.contactEmail} onChange={e => setInstitutionForm(prev => ({
              ...prev,
              contactEmail: e.target.value
            }))} placeholder="you@institution.edu" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="contactPhone">Phone Number *</Label>
              <PhoneInput value={institutionForm.contactPhone} onChange={value => setInstitutionForm(prev => ({
              ...prev,
              contactPhone: value || ''
            }))} id="contactPhone" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="estimatedStudents">Estimated Number of Students *</Label>
              <Select value={institutionForm.estimatedStudents} onValueChange={value => setInstitutionForm(prev => ({
              ...prev,
              estimatedStudents: value
            }))}>
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
              <Textarea id="message" value={institutionForm.message} onChange={e => setInstitutionForm(prev => ({
              ...prev,
              message: e.target.value
            }))} placeholder="What outcomes are you looking to achieve for your students?" className="mt-1 min-h-[100px]" />
            </div>

            <div ref={turnstileRef} className="flex justify-center" />

            <Button type="submit" className="w-full bg-amber-700 hover:bg-amber-800" disabled={institutionLoading || !turnstileToken}>
              {institutionLoading ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </> : 'Submit Partnership Inquiry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};