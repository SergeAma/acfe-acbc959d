import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import acfeIcon from '@/assets/acfe-icon.png';
import { Navbar } from '@/components/Navbar';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

const emailSchema = z.string().email('Please enter a valid email address').max(255);

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, sendOtp, verifyOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Get redirect URL from query params, default to courses
  const redirectUrl = searchParams.get('redirect') || '/courses';

  // Turnstile CAPTCHA state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Initialize Turnstile on email step
  useEffect(() => {
    if (step !== 'email') {
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Validate email
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
      return;
    }

    // Check Turnstile
    if (!turnstileToken) {
      toast.error('Please complete the security verification');
      return;
    }

    setLoading(true);
    const { error } = await sendOtp(email);
    setLoading(false);

    if (!error) {
      setStep('otp');
      setCountdown(60); // 60 second cooldown for resend
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(email, otpCode);
    setLoading(false);

    if (!error) {
      navigate(redirectUrl, { replace: true });
    } else {
      setOtpCode(''); // Clear on error
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    const { error } = await sendOtp(email);
    setLoading(false);

    if (!error) {
      setCountdown(60);
      setOtpCode('');
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtpCode('');
  };

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
              {step === 'email' 
                ? 'Enter your email to sign in or create an account' 
                : `Enter the 6-digit code sent to ${email}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      className="pl-10"
                      required
                      autoFocus
                    />
                  </div>
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="flex justify-center">
                  <div ref={turnstileRef} className="min-h-[65px]" />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !email || !turnstileToken}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Continue with Email'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  We'll send you a 6-digit code to verify your email. 
                  No password required.
                </p>
              </form>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
