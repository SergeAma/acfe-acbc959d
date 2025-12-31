import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import acfeIcon from '@/assets/acfe-icon.png';
import { Navbar } from '@/components/Navbar';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { AFRICAN_UNIVERSITIES } from '@/data/universities';
import { AFRICAN_CITIES } from '@/data/cities';
const baseAuthSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  age: z.string().min(1, 'Please select your age').optional(),
  university: z.string().min(2, 'Please enter your university or college').max(200),
  city: z.string().min(2, 'Please enter your city').max(100),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  cloudBrands: z.array(z.string()).optional(),
  emailConsent: z.boolean().optional(),
});

const mentorAuthSchema = baseAuthSchema.extend({
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
});

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 
    searchParams.get('mode') === 'forgot' ? 'forgot' :
    searchParams.get('mode') === 'reset' ? 'reset' : 'signin'
  );
  
  // Check if this is a mentor signup path
  const isMentorSignup = searchParams.get('role') === 'mentor';
  
  // Get redirect URL from query params, default to dashboard
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate(redirectUrl);
    }
  }, [user, navigate, redirectUrl]);

  const validateForm = () => {
    try {
      if (mode === 'signup') {
        if (isMentorSignup) {
          mentorAuthSchema.parse(formData);
        } else {
          baseAuthSchema.parse(formData);
        }
      } else {
        baseAuthSchema.pick({ email: true, password: true }).parse(formData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check terms acceptance for signup
    if (mode === 'signup' && !formData.termsAccepted) {
      setErrors(prev => ({ ...prev, termsAccepted: 'You must accept the terms of service to continue' }));
      return;
    }

    // Check mentor pledge for mentor signup
    if (mode === 'signup' && isMentorSignup && !formData.mentorPledge) {
      setErrors(prev => ({ ...prev, mentorPledge: 'You must confirm your intent to become a mentor and accept the terms' }));
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(formData.email, formData.password);
      if (!error) {
        navigate(redirectUrl);
      }
    } else {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      // Only set wantsMentor to true if on the mentor signup path
      const { error } = await signUp(
        formData.email,
        formData.password,
        fullName,
        formData.linkedinUrl,
        isMentorSignup, // Use the path-based flag instead of checkbox
        formData.university,
        isMentorSignup ? formData.mentorBio : undefined,
        isMentorSignup ? formData.portfolioLinks : undefined
      );
      if (!error) {
        navigate(redirectUrl);
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    
    setLoading(true);
    await resetPassword(resetEmail);
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      return;
    }
    
    if (newPassword.length < 6) {
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(newPassword);
    if (!error) {
      setMode('signin');
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
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
            {mode === 'signin' ? 'Sign in to your account' : 
             mode === 'signup' ? (isMentorSignup ? 'Apply to become a mentor at ACFE' : 'Create your account to start learning') :
             mode === 'forgot' ? 'Enter your email to reset your password' :
             'Enter your new password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(mode === 'signin' || mode === 'signup') ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="signup-university">Which university or college do you attend?</Label>
                  <AutocompleteInput
                    id="signup-university"
                    placeholder="Start typing to see suggestions..."
                    value={formData.university}
                    onChange={(value) => setFormData({ ...formData, university: value })}
                    suggestions={AFRICAN_UNIVERSITIES}
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

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
                    I accept the Terms of Service and Privacy Policy *
                  </label>
                </div>
                {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted}</p>}

                {/* Mentor-specific fields - only show on mentor signup path */}
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

                <Button 
                  type="submit" 
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold" 
                  disabled={loading || !formData.termsAccepted || (isMentorSignup && !formData.mentorPledge)}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isMentorSignup ? 'SUBMIT MENTOR APPLICATION' : 'REGISTER')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => setMode('signin')}
              >
                Back to Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};