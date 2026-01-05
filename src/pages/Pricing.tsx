import { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Sparkles, BookOpen, Video, Users, Award, Calendar, Briefcase, MessageSquare, BookMarked, Loader2, Zap, Globe, GraduationCap, Building2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { AFRICAN_UNIVERSITIES } from '@/data/universities';

export const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pricePerMonth, setPricePerMonth] = useState(10);
  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [institutionForm, setInstitutionForm] = useState({
    institutionName: '',
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

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth?redirect=/pricing');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout');
      
      if (error) throw error;
      
      if (data?.alreadySubscribed) {
        toast.info("You already have an active subscription!");
        navigate('/dashboard');
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
    }
  };

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institutionForm.institutionName || !institutionForm.contactName || !institutionForm.contactEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setInstitutionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-institution-inquiry', {
        body: institutionForm,
      });
      
      if (error) throw error;
      
      toast.success('Thank you! Our partnerships team will contact you within 2-3 business days.');
      setShowInstitutionDialog(false);
      setInstitutionForm({
        institutionName: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        estimatedStudents: '',
        message: '',
      });
    } catch (error: any) {
      console.error('Institution inquiry error:', error);
      toast.error(error.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setInstitutionLoading(false);
    }
  };

  const benefits = [
    { icon: BookOpen, title: "Unlimited Course Access", description: "Access all crash courses and learning materials uploaded by seasoned mentors across various tech domains" },
    { icon: Video, title: "Monthly Live Q&A Sessions", description: "Join exclusive monthly live mentoring sessions with industry experts to get your questions answered in real-time" },
    { icon: Users, title: "1:1 Expert Sessions", description: "Book personalized one-on-one time with world-leading tech experts for career guidance and skill development" },
    { icon: Briefcase, title: "Job Opportunities", description: "Access exclusive job postings and career opportunities through our founding partner, Spectrogram Consulting" },
    { icon: MessageSquare, title: "Community Access", description: "Connect with fellow learners, mentors, and industry professionals in our vibrant community forums" },
    { icon: Award, title: "Verified Certificates", description: "Earn industry-recognized certificates upon course completion to showcase your skills to employers" },
    { icon: Calendar, title: "Continuous New Content", description: "New crash courses and learning materials are continuously added by our network of seasoned mentors" },
    { icon: BookMarked, title: "Notes & Bookmarks", description: "Take notes and bookmark important lessons to create your personalized learning reference library" },
    { icon: Globe, title: "Africa-Focused Training", description: "Content designed specifically for African youth with locally relevant examples and career paths" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Invest in Your <span className="text-primary">Tech Future</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              One affordable membership unlocks unlimited access to courses, mentorship, 
              community, and career opportunities designed for African tech talent.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Free Tier */}
              <Card className="relative overflow-hidden border border-border">
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">Free Access</CardTitle>
                  <CardDescription className="text-base">
                    Get started with basic features
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">$0</span>
                    <span className="text-muted-foreground text-lg">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    No credit card required
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button size="lg" variant="outline" className="w-full mb-6 text-lg h-14" onClick={() => navigate('/auth')}>
                    Create Free Account
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      What's included:
                    </p>
                    {["Limited access to courses", "Community & job opportunities", "Verified completion certificates", "Notes & bookmarks features", "Mobile-friendly learning"].map((feature, index) => (
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

              {/* Premium Tier */}
              <Card className="relative overflow-hidden border-2 border-primary shadow-xl">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                  Most Popular
                </div>
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">ACFE Membership</CardTitle>
                  <CardDescription className="text-base">
                    Everything you need to launch your tech career
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">${pricePerMonth}</span>
                    <span className="text-muted-foreground text-lg">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Cancel anytime • No hidden fees
                  </p>
                </CardHeader>
                <CardContent className="pb-8">
                  <Button size="lg" className="w-full mb-6 text-lg h-14" onClick={handleSubscribe} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Get Started Now
                      </>
                    )}
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Everything in Free, plus:
                    </p>
                    {["Unlimited access to all courses", "Monthly live Q&A mentoring sessions", "Book 1:1 time with tech experts", "Continuous new crash courses", "Priority community support"].map((feature, index) => (
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

              {/* Educational Institution Tier */}
              <Card className="relative overflow-hidden border-2 border-amber-500/50 bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background">
                <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                  <GraduationCap className="h-4 w-4 inline-block mr-1" />
                  Institutions
                </div>
                <CardHeader className="text-center pt-10 pb-6">
                  <CardTitle className="text-2xl mb-2">Educational Partners</CardTitle>
                  <CardDescription className="text-base">
                    Empower your students with tech skills
                  </CardDescription>
                  <div className="mt-6">
                    <span className="text-3xl font-bold text-amber-600">Custom Pricing</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tailored to your institution's needs
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
                Everything You Get With ACFE Membership
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                We've packed incredible value into one simple membership to accelerate your tech journey
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
              <Badge variant="outline" className="mb-4">Founding Partner</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Career Support from Spectrogram Consulting
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Our founding partner, Spectrogram Consulting, provides exclusive job opportunities, career guidance, and up to $1000 in funding support for innovative ideas through our Innovators Incubator program.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/jobs')}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  View Job Opportunities
                </Button>
                <Button variant="outline" onClick={() => navigate('/submit-idea')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Submit Your Startup Idea
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
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6">
                {[
                  { q: "Can I cancel anytime?", a: "Yes! You can cancel your subscription at any time from your dashboard. You'll continue to have access until the end of your current billing period." },
                  { q: "Do I get access to all courses?", a: "Absolutely. Your ACFE membership gives you unlimited access to every course on the platform, including all new courses added in the future." },
                  { q: "How do 1:1 sessions with experts work?", a: "Mentors set their availability, and you can book time slots directly from their profile. Session pricing is standardized across the platform for transparency." },
                  { q: "Are the certificates recognized?", a: "Yes, each certificate includes a unique verification code that employers can use to verify your achievement on our public verification page." },
                  { q: "Is this designed for African learners?", a: "Yes! ACFE was built specifically for African youth. Our courses, examples, and career paths are tailored to the African tech ecosystem and job market." },
                  { q: "How does the Educational Institution partnership work?", a: "We work with universities, colleges, and high schools across Africa to provide bespoke pricing, dedicated career centres, and tailored mentorship programs for their students. Contact us to learn more!" }
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
              Ready to Start Your Tech Journey?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of African learners building job-ready tech skills with ACFE.
            </p>
            <Button size="lg" className="text-lg h-14 px-8" onClick={handleSubscribe} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Get ACFE Membership for ${pricePerMonth}/month
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
            <div className="space-y-2">
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
                <Label htmlFor="contactPhone">Phone Number</Label>
                <PhoneInput
                  id="contactPhone"
                  value={institutionForm.contactPhone}
                  onChange={(value) => setInstitutionForm(prev => ({ ...prev, contactPhone: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedStudents">Estimated Students</Label>
                <Input
                  id="estimatedStudents"
                  placeholder="e.g., 500"
                  value={institutionForm.estimatedStudents}
                  onChange={(e) => setInstitutionForm(prev => ({ ...prev, estimatedStudents: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Additional Information</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your institution and what you're looking for..."
                value={institutionForm.message}
                onChange={(e) => setInstitutionForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
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
            
            <Button type="submit" className="w-full" disabled={institutionLoading}>
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
