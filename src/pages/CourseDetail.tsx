import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, ProfileFrame } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Clock, BarChart, Loader2, CheckCircle, DollarSign, Gift, Ticket, Crown } from 'lucide-react';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { createSafeHtml } from '@/lib/sanitize-html';
import { CoursePrerequisitesDisplay } from '@/components/course/CoursePrerequisitesDisplay';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration_weeks: number;
  is_paid: boolean;
  price_cents: number;
  mentor_id: string;
  mentor: {
    full_name: string;
    bio: string;
    avatar_url: string;
    profile_frame: ProfileFrame;
  };
}

interface PricingOverride {
  enabled: boolean;
  force_free: boolean;
  sponsor_name: string | null;
  sponsor_message: string | null;
}

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [pricingOverride, setPricingOverride] = useState<PricingOverride | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch course basic data first
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !courseData) {
        toast({
          title: "Error",
          description: "Course not found",
          variant: "destructive",
        });
        navigate('/courses');
        return;
      }

      // Fetch mentor data using simplified RPC function for course display
      let mentorData = null;
      if (courseData.mentor_id) {
        const { data: mentor, error: mentorError } = await supabase
          .rpc('get_course_mentor_profile', { course_mentor_id: courseData.mentor_id });
        
        if (!mentorError && mentor && mentor.length > 0) {
          mentorData = mentor[0];
        }
      }

      // Combine course with mentor data
      setCourse({
        ...courseData,
        mentor: mentorData
      } as any);

      // Fetch pricing override settings
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'pricing_override')
        .single();

      if (settingsData?.setting_value) {
        setPricingOverride(settingsData.setting_value as unknown as PricingOverride);
      }

      if (profile) {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', id)
          .eq('student_id', profile.id)
          .single();

        setIsEnrolled(!!enrollmentData);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, profile, navigate, toast]);

  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoValidation, setPromoValidation] = useState<{
    valid: boolean;
    message: string;
    discountDescription?: string;
  } | null>(null);

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoValidation(null);
      return;
    }
    
    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode: code.trim() }
      });
      
      if (error) throw error;
      
      setPromoValidation({
        valid: data.valid,
        message: data.message,
        discountDescription: data.discountDescription
      });
    } catch (error) {
      setPromoValidation({
        valid: false,
        message: "Failed to validate promo code"
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  // Debounced promo code validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (promoCode.trim()) {
        validatePromoCode(promoCode);
      } else {
        setPromoValidation(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [promoCode]);

  const handleEnroll = async () => {
    if (!profile) {
      navigate('/auth');
      return;
    }

    if (profile.role !== 'student') {
      toast({
        title: "Not available",
        description: "Only students can enroll in courses",
        variant: "destructive",
      });
      return;
    }

    setEnrolling(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-course-checkout', {
        body: { courseId: id, promoCode: promoCode.trim() || undefined }
      });

      if (error) throw error;

      if (data.free) {
        // Free enrollment completed
        setIsEnrolled(true);
        toast({
          title: "Success!",
          description: data.message || "You're now enrolled in this course",
        });
      } else if (data.requiresSubscription) {
        // User needs to subscribe first - redirect to pricing with promo code
        toast({
          title: "Subscription Required",
          description: data.message || "Please subscribe to access paid courses",
        });
        // Pass validated promo code to pricing page via URL params
        const pricingUrl = promoCode.trim() && promoValidation?.valid 
          ? `/pricing?promo=${encodeURIComponent(promoCode.trim().toUpperCase())}`
          : '/pricing';
        navigate(pricingUrl);
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }

    setEnrolling(false);
  };

  // Determine display price
  // CRITICAL: All courses require subscription by default unless explicitly overridden
  const getDisplayPrice = () => {
    if (!course) return null;

    const isSponsored = pricingOverride?.enabled && pricingOverride?.force_free;
    
    // Sponsored courses are shown as free
    if (isSponsored) {
      const price = (course.price_cents || 1500) / 100;
      return {
        type: 'sponsored',
        label: 'Free',
        originalPrice: `$${price.toFixed(2)}`,
        sponsor: pricingOverride?.sponsor_name || 'Our Partners',
        message: pricingOverride?.sponsor_message
      };
    }

    // All other courses require subscription
    // Even if is_paid is false, we show subscription required
    return { 
      type: 'subscription', 
      label: 'Subscription Required', 
      originalPrice: null 
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!course) return null;

  const priceInfo = getDisplayPrice();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex gap-2 mb-4">
                <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded">
                  {course.category}
                </span>
                <span className="text-sm bg-secondary/10 text-secondary px-3 py-1 rounded">
                  {course.level}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <div 
                className="text-lg text-muted-foreground rich-text-content"
                dangerouslySetInnerHTML={createSafeHtml(course.description)}
              />
            </div>

            {/* Prerequisites Section */}
            <CoursePrerequisitesDisplay courseId={course.id} />

            {/* What you'll learn section - to be added by mentor in course builder */}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {/* Price Display */}
                <div className="mb-6 text-center">
                  {priceInfo?.type === 'sponsored' && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
                      <Gift className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-700 font-medium">
                        Sponsored by {priceInfo.sponsor}
                      </p>
                      {priceInfo.message && (
                        <div 
                          className="text-xs text-green-600 mt-2 rich-text-content prose prose-sm prose-green max-w-none [&_p]:mb-1 [&_p]:mt-1"
                          dangerouslySetInnerHTML={{ __html: priceInfo.message }}
                        />
                      )}
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span className="text-lg line-through text-muted-foreground">
                          {priceInfo.originalPrice}
                        </span>
                        <span className="text-2xl font-bold text-green-600">Free</span>
                      </div>
                    </div>
                  )}
                  
                  {priceInfo?.type === 'subscription' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-primary" />
                        <Badge variant="default" className="text-sm">
                          Subscription Required
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Subscribe to access all courses
                      </p>
                    </div>
                  )}
                </div>

                {isEnrolled ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">You're enrolled!</p>
                    </div>
                    <Link to={`/courses/${course.id}/learn`}>
                      <Button className="w-full">
                        Start Learning
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priceInfo?.type === 'subscription' && (
                      <div className="space-y-2">
                        {showPromoInput ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter promo code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              className="uppercase"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setShowPromoInput(false);
                                setPromoCode('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowPromoInput(true)}
                            className="flex items-center gap-1 text-sm text-primary hover:underline mx-auto"
                          >
                            <Ticket className="h-3 w-3" />
                            Have a promo code?
                          </button>
                        )}
                        {promoCode && promoValidation && (
                          <p className={`text-xs text-center ${promoValidation.valid ? 'text-green-600' : 'text-destructive'}`}>
                            {promoValidation.valid ? (
                              <>✓ {promoValidation.discountDescription || 'Valid code'} - will be applied at checkout</>
                            ) : (
                              <>✗ {promoValidation.message}</>
                            )}
                          </p>
                        )}
                        {promoCode && validatingPromo && (
                          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Validating code...
                          </p>
                        )}
                      </div>
                    )}
                    <Button onClick={handleEnroll} disabled={enrolling} className="w-full" size="lg">
                      {enrolling ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {priceInfo?.type === 'subscription' ? 'Enroll Now' : 'Enroll Now'}
                    </Button>
                    {priceInfo?.type === 'subscription' && (
                      <p className="text-xs text-center text-muted-foreground">
                        Requires active subscription. <Link to="/pricing" className="text-primary hover:underline">View plans</Link>
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>{course.duration_weeks} weeks duration</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <BarChart className="h-5 w-5 text-muted-foreground" />
                    <span>{course.level} level</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to={`/mentors/${course.mentor_id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <ProfileAvatar
                      src={course.mentor?.avatar_url}
                      name={course.mentor?.full_name || 'Mentor'}
                      frame={course.mentor?.profile_frame || 'none'}
                      size="md"
                    />
                    <div>
                      <h3 className="font-semibold">
                        {course.mentor?.full_name || 'Course Mentor'}
                      </h3>
                      <p className="text-xs text-primary">Click to view profile</p>
                    </div>
                  </div>
                  {course.mentor?.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{course.mentor.bio}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
