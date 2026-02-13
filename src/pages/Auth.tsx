import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Globe, Mail, ArrowLeft, Lock } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { PasswordInput } from '@/components/ui/password-input';

import acfeIcon from '@/assets/acfe-icon.png';
import { Navbar } from '@/components/Navbar';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { UNIVERSITIES } from '@/data/universities';
import { AFRICAN_CITIES } from '@/data/cities';
import { toast } from 'sonner';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

// Password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

// Signup form validation schema
const baseSignupSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  age: z.string().min(1, 'Please select your age'),
  gender: z.enum(['male', 'female'], { required_error: 'Please select your gender' }),
  university: z.string().min(2, 'Please enter your university or college').max(200),
  city: z.string().min(2, 'Please enter your city').max(100),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  cloudBrands: z.array(z.string()).optional(),
  emailConsent: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const mentorSignupSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  age: z.string().min(1, 'Please select your age'),
  gender: z.enum(['male', 'female'], { required_error: 'Please select your gender' }),
  university: z.string().min(2, 'Please enter your university or college').max(200),
  city: z.string().min(2, 'Please enter your city').max(100),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  cloudBrands: z.array(z.string()).optional(),
  emailConsent: z.boolean().optional(),
  mentorBio: z.string()
    .min(100, 'Please provide at least 100 characters describing your experience')
    .max(2000, 'Bio must be less than 2000 characters')
    .refine((val) => {
      const lowerVal = val.toLowerCase();
      const hasRelevantContent = 
        lowerVal.includes('experience') || 
        lowerVal.includes('work') || 
        lowerVal.includes('mentor') || 
        lowerVal.includes('teach') || 
        lowerVal.includes('year') ||
        lowerVal.includes('skill') ||
        lowerVal.includes('help') ||
        lowerVal.includes('guide') ||
        lowerVal.includes('career') ||
        lowerVal.includes('professional') ||
        lowerVal.includes('industry') ||
        lowerVal.includes('student') ||
        lowerVal.includes('learn');
      return hasRelevantContent;
    }, { message: 'Please include details about your experience, skills, or mentoring goals' }),
  portfolioLinks: z.string().max(1000).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Sign-in schema
const signInSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setLanguage } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  
  // Track if we're in the middle of a successful auth to prevent UI flicker
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Auth flow states
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [authStep, setAuthStep] = useState<'form' | 'verify-email'>('form');
  const [emailForVerification, setEmailForVerification] = useState('');
  
  // Check if this is a mentor signup path
  const isMentorSignup = searchParams.get('role') === 'mentor';
  
  // Get redirect URL from query params
  const getDefaultRedirect = () => {
    if (isMentorSignup) return '/mentor-application-status';
    return '/dashboard';
  };
  
  const rawRedirect = searchParams.get('redirect');
  const redirectUrl = rawRedirect ? decodeURIComponent(rawRedirect) : getDefaultRedirect();
  
  // Detect auth token in URL (from email verification link)
  const hasAuthToken = searchParams.has('token') || searchParams.has('access_token') || 
                       window.location.hash.includes('access_token');

  // Turnstile CAPTCHA state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    gender: '' as 'male' | 'female' | '',
    university: '',
    city: '',
    linkedinUrl: '',
    cloudBrands: [] as string[],
    emailConsent: false,
    termsAccepted: false,
    wantsMentor: false,
    mentorBio: '',
    portfolioLinks: '',
    mentorPledge: false,
    preferredLanguage: 'en' as 'en' | 'fr',
  });

  const [resendCooldown, setResendCooldown] = useState(0);
  const [signupCompleted, setSignupCompleted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize Turnstile when on signup mode and form step
  useEffect(() => {
    if (mode !== 'signup' || authStep !== 'form') {
      setTurnstileToken(null);
      if (turnstileWidgetId.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(turnstileWidgetId.current);
        } catch (e) {
          console.warn('Failed to remove Turnstile widget:', e);
        }
        turnstileWidgetId.current = null;
      }
      return;
    }

    const initTurnstile = () => {
      if (!turnstileRef.current) return;
      if (!(window as any).turnstile) return;
      if (turnstileWidgetId.current) return;
      
      try {
        turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setTurnstileToken(token);
          },
          'expired-callback': () => {
            setTurnstileToken(null);
          },
          'error-callback': () => {
            setTurnstileToken(null);
          },
          theme: 'auto',
        });
      } catch (error) {
        console.error('Failed to render Turnstile widget:', error);
      }
    };

    const initTimeout = setTimeout(() => {
      if ((window as any).turnstile) {
        initTurnstile();
      } else {
        const checkTurnstile = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(checkTurnstile);
            initTurnstile();
          }
        }, 100);
        setTimeout(() => clearInterval(checkTurnstile), 10000);
      }
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (turnstileWidgetId.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(turnstileWidgetId.current);
        } catch (e) {
          console.warn('Failed to remove Turnstile widget on cleanup:', e);
        }
        turnstileWidgetId.current = null;
      }
    };
  }, [mode, authStep]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Redirect when user is authenticated
  useEffect(() => {
    if (user && !isRedirecting) {
      setIsRedirecting(true);
      navigate(redirectUrl, { replace: true });
    }
  }, [user, navigate, redirectUrl, isRedirecting]);
  
  // Show loading if auth is initializing or we have a token in URL
  if (authLoading || hasAuthToken || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
        <Navbar />
        <div className="flex items-center justify-center p-4 pt-20 min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {hasAuthToken ? 'Completing sign in...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const validateSignupForm = () => {
    try {
      if (isMentorSignup) {
        mentorSignupSchema.parse(formData);
      } else {
        baseSignupSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateSignInForm = () => {
    try {
      signInSchema.parse({ email: formData.email, password: formData.password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handle sign-in with password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignInForm()) return;
    
    setSubmitting(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    
    if (error) {
      setSubmitting(false);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email before signing in. Check your inbox for a confirmation link.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    
    // Success — auth state listener will update `user`, triggering the redirect useEffect
    if (data.session) {
      toast.success('Welcome back!');
    }
    setSubmitting(false);
  };

  // Handle signup with password
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (submitting || signupCompleted) return;
    
    if (!validateSignupForm()) return;
    
    if (!formData.termsAccepted) {
      setErrors(prev => ({ ...prev, termsAccepted: 'You must accept the terms of service to continue' }));
      return;
    }

    if (isMentorSignup && !formData.mentorPledge) {
      setErrors(prev => ({ ...prev, mentorPledge: 'You must confirm your intent to become a mentor and accept the terms' }));
      return;
    }

    if (!turnstileToken) {
      toast.error('Please complete the security verification');
      return;
    }

    setSubmitting(true);
    
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    
    // Sign up with password
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) {
      setSubmitting(false);
      if (error.message.includes('rate limit') || error.status === 429) {
        // Mark as completed so user can't resubmit
        setSignupCompleted(true);
        toast.info('Your account was likely created. Please wait a few minutes, then check your inbox for the verification email.');
        setEmailForVerification(formData.email);
        setAuthStep('verify-email');
      } else if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        toast.error('An account with this email already exists. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Check for duplicate account
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setSubmitting(false);
      toast.error('An account with this email already exists. Please sign in instead.');
      return;
    }

    if (data.user) {
      // Update profile with additional fields
      const updateData: Record<string, string> = {};
      if (formData.linkedinUrl) updateData.linkedin_url = formData.linkedinUrl;
      if (formData.university) updateData.university = formData.university;
      if (formData.gender) updateData.gender = formData.gender;
      updateData.preferred_language = formData.preferredLanguage || 'en';
      
      // If session exists (auto-confirm enabled), update profile directly
      if (data.session) {
        await supabase.from('profiles').update(updateData).eq('id', data.user.id);
        
        // Handle mentor application
        if (isMentorSignup) {
          const reasonParts = [];
          if (formData.mentorBio) reasonParts.push(`Bio: ${formData.mentorBio}`);
          if (formData.portfolioLinks) reasonParts.push(`Portfolio/Links: ${formData.portfolioLinks}`);
          
          await supabase.from('mentor_role_requests').insert({
            user_id: data.user.id,
            reason: reasonParts.length > 0 ? reasonParts.join('\n\n') : 'Applied during registration',
            status: 'pending'
          });
        }
        
        setIsRedirecting(true);
        navigate(redirectUrl, { replace: true });
      } else {
        // Email verification required — mark signup as completed to prevent resubmission
        setSignupCompleted(true);
        setLanguage(formData.preferredLanguage);
        setEmailForVerification(formData.email);
        setAuthStep('verify-email');
      }
    }
    
    setSubmitting(false);
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    setSubmitting(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailForVerification,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    setSubmitting(false);
    setResendCooldown(60); // 60-second cooldown
    
    if (error) {
      if (error.message.includes('rate limit') || (error as any).status === 429) {
        toast.info('Please wait a few minutes before requesting another email. Check your spam folder in the meantime.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Verification email resent. Check your inbox.');
    }
  };

  // Email Verification Screen (for password signup)
  if (authStep === 'verify-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
        <Navbar />
        <div className="flex items-center justify-center p-4 pt-20">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a confirmation link to <strong>{emailForVerification}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to verify your account and start learning.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  After verifying, you can sign in with your password.
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?{' '}
                  <button 
                    onClick={handleResendVerification} 
                    disabled={submitting || resendCooldown > 0}
                    className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
                  >
                    {submitting ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
                  </button>
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your spam folder if you don't see it.
                </p>
                <button 
                  onClick={() => { setAuthStep('form'); setEmailForVerification(''); }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto mt-4"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to sign in
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
      <Navbar />
      <div className="flex items-center justify-center p-4 pt-20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={acfeIcon} alt="ACFE Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl">Welcome to A Cloud for Everyone</CardTitle>
          <CardDescription>
            {mode === 'signin' 
              ? 'Sign in to your account' 
              : (isMentorSignup ? 'Apply to become a mentor at ACFE' : 'Create your account to start learning')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as 'signin' | 'signup'); setErrors({}); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </Label>
                    <Link 
                      to="/auth/reset-password" 
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="signin-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                {/* Password fields for signup */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    showStrength
                    required
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <PasswordInput
                    id="signup-confirm-password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone</Label>
                  <PhoneInput
                    id="signup-phone"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    required
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-age">Age</Label>
                    <Select value={formData.age} onValueChange={(value) => setFormData({ ...formData, age: value })}>
                      <SelectTrigger id="signup-age">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="under-18">Under 18</SelectItem>
                        <SelectItem value="18-24">18-24</SelectItem>
                        <SelectItem value="25-34">25-34</SelectItem>
                        <SelectItem value="35-44">35-44</SelectItem>
                        <SelectItem value="45-54">45-54</SelectItem>
                        <SelectItem value="55+">55+</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value: 'male' | 'female') => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger id="signup-gender">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-university">Which university or college do you attend?</Label>
                  <AutocompleteInput
                    id="signup-university"
                    placeholder="Start typing to see suggestions..."
                    value={formData.university}
                    onChange={(value) => setFormData({ ...formData, university: value })}
                    suggestions={UNIVERSITIES}
                    required
                  />
                  {errors.university && <p className="text-sm text-destructive">{errors.university}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-city">Which city are you based in?</Label>
                  <AutocompleteInput
                    id="signup-city"
                    placeholder="Start typing to see suggestions..."
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    suggestions={AFRICAN_CITIES}
                    required
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-linkedin">LinkedIn Profile URL (Optional)</Label>
                  <Input
                    id="signup-linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  />
                  {errors.linkedinUrl && <p className="text-sm text-destructive">{errors.linkedinUrl}</p>}
                </div>

                <div className="space-y-3">
                  <Label>Which of these Cloud brands do you know?</Label>
                  <div className="space-y-2">
                    {['Google Cloud', 'Microsoft Azure', 'Amazon Web Services', 'Oracle Cloud', 'IBM Cloud'].map((brand) => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand}`}
                          checked={formData.cloudBrands.includes(brand)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ 
                                ...formData, 
                                cloudBrands: [...formData.cloudBrands, brand] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                cloudBrands: formData.cloudBrands.filter(b => b !== brand) 
                              });
                            }
                          }}
                        />
                        <label 
                          htmlFor={`brand-${brand}`}
                          className="text-sm cursor-pointer"
                        >
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Language Preference Selection */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Preferred Language</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose the language for your account, emails, and content where available.
                  </p>
                  <RadioGroup
                    value={formData.preferredLanguage}
                    onValueChange={(value: 'en' | 'fr') => setFormData({ ...formData, preferredLanguage: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="en" id="lang-en" />
                      <Label htmlFor="lang-en" className="cursor-pointer flex items-center gap-2">
                        <span className="text-lg">🇬🇧</span> English
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fr" id="lang-fr" />
                      <Label htmlFor="lang-fr" className="cursor-pointer flex items-center gap-2">
                        <span className="text-lg">🇫🇷</span> Français
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="email-consent"
                    checked={formData.emailConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, emailConsent: checked as boolean })}
                  />
                  <label 
                    htmlFor="email-consent"
                    className="text-sm text-muted-foreground cursor-pointer leading-tight"
                  >
                    I agree to receive email updates from A Cloud for Everyone, including information about training programs and bootcamps.
                  </label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms-consent"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, termsAccepted: checked as boolean });
                      if (checked) {
                        setErrors(prev => {
                          const { termsAccepted, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className={errors.termsAccepted ? 'border-destructive' : ''}
                  />
                  <label 
                    htmlFor="terms-consent"
                    className={`text-sm cursor-pointer leading-tight ${errors.termsAccepted ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    I accept the{' '}
                    <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
                    {' '}*
                  </label>
                </div>
                {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted}</p>}

                {/* Mentor-specific fields */}
                {isMentorSignup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mentor-bio">
                        Tell us about yourself <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Share your career journey, why you want to mentor, and why you'd be a great fit for ACFE (minimum 100 characters)
                      </p>
                      <textarea
                        id="mentor-bio"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="I am a software engineer with 5+ years of experience in cloud technologies. I want to mentor because..."
                        value={formData.mentorBio}
                        onChange={(e) => setFormData({ ...formData, mentorBio: e.target.value })}
                        maxLength={2000}
                        required
                      />
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${formData.mentorBio.length < 100 ? 'text-muted-foreground' : 'text-green-600'}`}>
                          {formData.mentorBio.length}/100 minimum
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formData.mentorBio.length}/2000
                        </span>
                      </div>
                      {errors.mentorBio && <p className="text-sm text-destructive">{errors.mentorBio}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolio-links">
                        Portfolio, Works, Awards or Achievements
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Share links to your portfolio, published works, certifications, awards, or any achievements for our team to review
                      </p>
                      <textarea
                        id="portfolio-links"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="https://github.com/yourprofile&#10;https://medium.com/@yourname&#10;AWS Solutions Architect Certified"
                        value={formData.portfolioLinks}
                        onChange={(e) => setFormData({ ...formData, portfolioLinks: e.target.value })}
                      />
                      {errors.portfolioLinks && <p className="text-sm text-destructive">{errors.portfolioLinks}</p>}
                    </div>

                    <div className="flex items-start space-x-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Checkbox
                        id="mentor-pledge"
                        checked={formData.mentorPledge}
                        onCheckedChange={(checked) => {
                          setFormData({ ...formData, mentorPledge: checked as boolean });
                          if (checked) {
                            setErrors(prev => {
                              const { mentorPledge, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                        className={errors.mentorPledge ? 'border-destructive' : ''}
                      />
                      <div>
                        <label 
                          htmlFor="mentor-pledge"
                          className={`text-sm font-medium cursor-pointer ${errors.mentorPledge ? 'text-destructive' : ''}`}
                        >
                          I confirm I want to become a mentor <span className="text-destructive">*</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          I pledge to abide by ACFE's{' '}
                          <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Use</a>
                          {' '}and{' '}
                          <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
                          I understand my application will be reviewed by the ACFE team.
                        </p>
                      </div>
                    </div>
                    {errors.mentorPledge && <p className="text-sm text-destructive">{errors.mentorPledge}</p>}
                  </>
                )}

                {!isMentorSignup && (
                  <p className="text-sm text-muted-foreground text-center">
                    All accounts start as learner accounts. You can request mentor access after signing up.
                  </p>
                )}

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="flex justify-center">
                  <div ref={turnstileRef} className="min-h-[65px]" />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold" 
                  disabled={submitting || signupCompleted || !formData.termsAccepted || (isMentorSignup && !formData.mentorPledge) || !turnstileToken}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isMentorSignup ? 'SUBMIT MENTOR APPLICATION' : 'REGISTER')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
