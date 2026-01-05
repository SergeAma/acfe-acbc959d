import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Sparkles, BookOpen, Video, Users, Award, Calendar, Briefcase, MessageSquare, BookMarked, Loader2, Zap, Globe } from 'lucide-react';
export const Pricing = () => {
  const navigate = useNavigate();
  const {
    user,
    profile
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pricePerMonth, setPricePerMonth] = useState(10);
  useEffect(() => {
    // Fetch subscription price from platform settings
    const fetchPrice = async () => {
      const {
        data
      } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', 'subscription_price').single();
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
      // Use courses page to select a course to enroll
      navigate('/courses');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };
  const benefits = [{
    icon: BookOpen,
    title: "Unlimited Course Access",
    description: "Access all crash courses and learning materials uploaded by seasoned mentors across various tech domains"
  }, {
    icon: Video,
    title: "Monthly Live Q&A Sessions",
    description: "Join exclusive monthly live mentoring sessions with industry experts to get your questions answered in real-time"
  }, {
    icon: Users,
    title: "1:1 Expert Sessions",
    description: "Book personalized one-on-one time with world-leading tech experts for career guidance and skill development"
  }, {
    icon: Briefcase,
    title: "Job Opportunities",
    description: "Access exclusive job postings and career opportunities through our founding partner, Spectrogram Consulting"
  }, {
    icon: MessageSquare,
    title: "Community Access",
    description: "Connect with fellow learners, mentors, and industry professionals in our vibrant community forums"
  }, {
    icon: Award,
    title: "Verified Certificates",
    description: "Earn industry-recognized certificates upon course completion to showcase your skills to employers"
  }, {
    icon: Calendar,
    title: "Continuous New Content",
    description: "New crash courses and learning materials are continuously added by our network of seasoned mentors"
  }, {
    icon: BookMarked,
    title: "Notes & Bookmarks",
    description: "Take notes and bookmark important lessons to create your personalized learning reference library"
  }, {
    icon: Globe,
    title: "Africa-Focused Training",
    description: "Content designed specifically for African youth with locally relevant examples and career paths"
  }];
  return <div className="min-h-screen bg-background flex flex-col">
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
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
                    {["Limited access to courses", "Community & job opportunities", "Verified completion certificates", "Notes & bookmarks features", "Mobile-friendly learning"].map((feature, index) => <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                          <Check className="h-3 w-3 text-gray-400" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>)}
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
                    {loading ? <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </> : <>
                        <Zap className="h-5 w-5 mr-2" />
                        Get Started Now
                      </>}
                  </Button>
                  
                  <div className="space-y-3">
                    <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Everything in Free, plus:
                    </p>
                    {["Unlimited access to all courses", "Monthly live Q&A mentoring sessions", "Book 1:1 time with tech experts", "Continuous new crash courses", "Priority community support"].map((feature, index) => <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-700" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>)}
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
              {benefits.map((benefit, index) => <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>)}
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
                Our founding partner, Spectrogram Consulting, provides exclusive job opportunities, 
                career guidance, and up to $500 in funding support for innovative ideas through our 
                Innovators Incubator program.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/jobs')}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  View Job Opportunities
                </Button>
                <Button variant="outline" onClick={() => navigate('/startups')}>Submit Your Startup Idea<Sparkles className="h-4 w-4 mr-2" />
                  Submit Your Idea
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
                {[{
                q: "Can I cancel anytime?",
                a: "Yes! You can cancel your subscription at any time from your dashboard. You'll continue to have access until the end of your current billing period."
              }, {
                q: "Do I get access to all courses?",
                a: "Absolutely. Your ACFE membership gives you unlimited access to every course on the platform, including all new courses added in the future."
              }, {
                q: "How do 1:1 sessions with experts work?",
                a: "Mentors set their availability, and you can book time slots directly from their profile. Session pricing is standardized across the platform for transparency."
              }, {
                q: "Are the certificates recognized?",
                a: "Yes, each certificate includes a unique verification code that employers can use to verify your achievement on our public verification page."
              }, {
                q: "Is this designed for African learners?",
                a: "Yes! ACFE was built specifically for African youth. Our courses, examples, and career paths are tailored to the African tech ecosystem and job market."
              }].map((faq, index) => <div key={index} className="bg-background rounded-lg p-6 border border-border">
                    <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>)}
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
            <Button size="lg" className="text-lg h-14 px-8" onClick={handleSubscribe}>
              <Zap className="h-5 w-5 mr-2" />
              Get ACFE Membership for ${pricePerMonth}/month
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>;
};