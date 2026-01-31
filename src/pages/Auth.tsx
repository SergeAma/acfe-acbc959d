import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Mail, User, GraduationCap, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import acfeIcon from '@/assets/acfe-icon.png';
import { Navbar } from '@/components/Navbar';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { toast } from 'sonner';
import { COUNTRIES, UNIVERSITIES } from '@/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

const emailSchema = z.string().email('Please enter a valid email address').max(255);

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  university: string;
  gender: string;
  // Mentor-specific fields
  bio: string;
  linkedinUrl: string;
}

type AuthStep = 'form' | 'otp';
type AuthMode = 'signin' | 'signup';
type SignupRole = 'student' | 'mentor';

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, sendOtp, verifyOtp } = useAuth();
  
  // Determine initial mode from URL params
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const initialRole = searchParams.get('role') === 'mentor' ? 'mentor' : 'student';
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('form');
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupRole, setSignupRole] = useState<SignupRole>(initialRole);
  const [countdown, setCountdown] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'Kenya',
    university: '',
    gender: '',
    bio: '',
    linkedinUrl: '',
  });
  const [emailError, setEmailError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // Get redirect URL from query params, default to dashboard for signup, courses for signin
  const redirectUrl = searchParams.get('redirect') || (mode === 'signup' ? '/dashboard' : '/courses');

  // Turnstile CAPTCHA state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Initialize Turnstile on form step
  useEffect(() => {
    if (step !== 'form') {
      setTurnstileToken(null);
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
      return;
    }

    const initTurnstile = () => {
      if (!turnstileRef.current || !(window as any).turnstile || turnstileWidgetId.current) return;
      
      turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
        theme: 'auto',
      });
    };

    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (existingScript) {
      setTimeout(initTurnstile, 100);
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = () => setTimeout(initTurnstile, 100);
      document.body.appendChild(script);
    }

    return () => {
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [step]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(redirectUrl, { replace: true });
    }
  }, [user, navigate, redirectUrl]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Update form field
  const updateField = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailError('');
  };

  // Validate signup form
  const validateSignupForm = (): boolean => {
    // Common validations
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    
    try {
      emailSchema.parse(formData.email);
    } catch {
      setEmailError('Please enter a valid email address');
      return false;
    }

    if (!formData.country) {
      toast.error('Please select your country');
      return false;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return false;
    }

    // Mentor-specific validations
    if (signupRole === 'mentor') {
      if (!formData.bio || formData.bio.trim().length < 100) {
        toast.error('Mentor bio must be at least 100 characters');
        return false;
      }
      if (!formData.linkedinUrl) {
        toast.error('LinkedIn profile is required for mentors');
        return false;
      }
    }

    return true;
  };

  // Handle sign-in (existing user - email only)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    try {
      emailSchema.parse(formData.email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
      return;
    }

    if (!turnstileToken) {
      toast.error('Please complete the security verification');
      return;
    }

    setLoading(true);
    const { error } = await sendOtp(formData.email);
    setLoading(false);

    if (!error) {
      setStep('otp');
      setCountdown(60);
    }
  };

  // Handle signup form submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignupForm()) return;

    if (!turnstileToken) {
      toast.error('Please complete the security verification');
      return;
    }

    setLoading(true);

    // Store signup data in sessionStorage for use after OTP verification
    sessionStorage.setItem('pending_signup', JSON.stringify({
      ...formData,
      role: signupRole,
    }));

    // Send OTP - Supabase will create the user if they don't exist
    const { error } = await sendOtp(formData.email);
    setLoading(false);

    if (!error) {
      setStep('otp');
      setCountdown(60);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(formData.email, otpCode);

    if (error) {
      setLoading(false);
      setOtpCode('');
      return;
    }

    // After successful verification, update profile if this was a signup
    const pendingSignup = sessionStorage.getItem('pending_signup');
    if (pendingSignup) {
      try {
        const signupData = JSON.parse(pendingSignup);
        
        // Get the newly authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Update profile with signup data
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: `${signupData.firstName} ${signupData.lastName}`.trim(),
              country: signupData.country,
              university: signupData.university || null,
              gender: signupData.gender || null,
              bio: signupData.bio || null,
              linkedin_url: signupData.linkedinUrl || null,
              preferred_language: 'en',
            })
            .eq('id', authUser.id);

          if (profileError) {
            console.error('Profile update error:', profileError);
          }

          // If mentor signup, create mentor role request
          if (signupData.role === 'mentor') {
            const { error: requestError } = await supabase
              .from('mentor_role_requests')
              .insert({
                user_id: authUser.id,
                reason: signupData.bio,
                status: 'pending',
              });

            if (!requestError) {
              // Notify admins about new mentor request
              const { data: admins } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'admin');

              if (admins && admins.length > 0) {
                const notifications = admins.map(admin => ({
                  user_id: admin.user_id,
                  message: `New mentor application: ${signupData.firstName} ${signupData.lastName} has requested mentor status`,
                  link: '/admin',
                  action_type: 'review_mentor_request',
                }));
                await supabase.from('notifications').insert(notifications);
              }

              // Send confirmation email
              try {
                await supabase.functions.invoke('send-mentor-request-confirmation', {
                  body: {
                    email: formData.email,
                    first_name: signupData.firstName,
                  },
                });
              } catch (emailErr) {
                console.error('Failed to send confirmation email:', emailErr);
              }
            }
          }

          // Send welcome email for new signups
          try {
            await supabase.functions.invoke('send-welcome-email', {
              body: {
                email: formData.email,
                first_name: signupData.firstName,
              },
            });
          } catch (emailErr) {
            console.error('Failed to send welcome email:', emailErr);
          }
        }
      } catch (err) {
        console.error('Error processing signup data:', err);
      } finally {
        sessionStorage.removeItem('pending_signup');
      }
    }

    setLoading(false);
    navigate(redirectUrl, { replace: true });
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    const { error } = await sendOtp(formData.email);
    setLoading(false);

    if (!error) {
      setCountdown(60);
      setOtpCode('');
    }
  };

  const handleBack = () => {
    setStep('form');
    setOtpCode('');
  };

  // Get country names for autocomplete
  const countryNames = COUNTRIES.map(c => c.name);
  const universityNames = UNIVERSITIES;

  // Render OTP verification step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
        <Navbar />
        <div className="flex items-center justify-center p-4 pt-20">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={acfeIcon} alt="ACFE Logo" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl">Verify Your Email</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {formData.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <button 
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="space-y-4">
                  <Label htmlFor="otp" className="sr-only">Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={6} 
                      value={otpCode}
                      onChange={setOtpCode}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className={`text-sm ${
                      countdown > 0 
                        ? 'text-muted-foreground cursor-not-allowed' 
                        : 'text-primary hover:underline'
                    }`}
                  >
                    {countdown > 0 
                      ? `Resend code in ${countdown}s` 
                      : "Didn't receive the code? Resend"
                    }
                  </button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  The code expires in 10 minutes. Check your spam folder if you don't see it.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
      <Navbar />
      <div className="flex items-center justify-center p-4 pt-20 pb-10">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={acfeIcon} alt="ACFE Logo" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl">Welcome to A Cloud for Everyone</CardTitle>
            <CardDescription>
              {mode === 'signin' 
                ? 'Sign in to access your dashboard' 
                : signupRole === 'mentor' 
                  ? 'Apply to become a mentor and share your expertise'
                  : 'Create your account to start learning'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as AuthMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="pl-10"
                        required
                        autoFocus
                      />
                    </div>
                    {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                  </div>

                  <div className="flex justify-center">
                    <div ref={turnstileRef} className="min-h-[65px]" />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !formData.email || !turnstileToken}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Continue with Email
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    We'll send you a 6-digit code to verify your email. No password required.
                  </p>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup">
                {/* Role selector */}
                <div className="flex gap-2 mb-6">
                  <Button
                    type="button"
                    variant={signupRole === 'student' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSignupRole('student')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Learner
                  </Button>
                  <Button
                    type="button"
                    variant={signupRole === 'mentor' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSignupRole('mentor')}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Mentor
                  </Button>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                  </div>

                  {/* Phone (optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (optional)</Label>
                    <PhoneInput
                      id="phone"
                      value={formData.phone}
                      onChange={(value) => updateField('phone', value)}
                    />
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <AutocompleteInput
                      id="country"
                      value={formData.country}
                      onChange={(value) => updateField('country', value)}
                      suggestions={countryNames}
                      placeholder="Select your country"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender (optional)</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* University (for students) */}
                  {signupRole === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="university">University/Institution (optional)</Label>
                      <AutocompleteInput
                        id="university"
                        value={formData.university}
                        onChange={(value) => updateField('university', value)}
                        suggestions={universityNames}
                        placeholder="Enter your university"
                      />
                    </div>
                  )}

                  {/* Mentor-specific fields */}
                  {signupRole === 'mentor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio * (min 100 characters)</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about your expertise, experience, and what you'd like to teach..."
                          value={formData.bio}
                          onChange={(e) => updateField('bio', e.target.value)}
                          rows={4}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.bio.length}/100 characters minimum
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn Profile URL *</Label>
                        <Input
                          id="linkedin"
                          type="url"
                          placeholder="https://linkedin.com/in/yourprofile"
                          value={formData.linkedinUrl}
                          onChange={(e) => updateField('linkedinUrl', e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Terms acceptance */}
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-primary hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  {/* Turnstile */}
                  <div className="flex justify-center">
                    <div ref={turnstileRef} className="min-h-[65px]" />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !formData.email || !turnstileToken || !acceptedTerms}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {signupRole === 'mentor' ? 'Apply as Mentor' : 'Create Account'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {signupRole === 'mentor' 
                      ? 'Your application will be reviewed by our team. We\'ll send you a verification code to confirm your email.'
                      : 'We\'ll send you a 6-digit code to verify your email.'}
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
