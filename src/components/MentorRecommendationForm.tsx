import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

interface FormData {
  firstName: string;
  lastName: string;
  company: string;
  linkedinUrl: string;
  email: string;
}

export const MentorRecommendationForm = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    company: '',
    linkedinUrl: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initCaptcha = () => {
      if (window.turnstile && captchaRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(captchaRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          'error-callback': () => setCaptchaToken(null),
        });
        setCaptchaReady(true);
      }
    };

    if (window.turnstile) {
      initCaptcha();
    } else {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          initCaptcha();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  const resetCaptcha = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setCaptchaToken(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error('Last name is required');
      return false;
    }
    if (!formData.company.trim()) {
      toast.error('Company name is required');
      return false;
    }
    if (!formData.linkedinUrl.trim()) {
      toast.error('LinkedIn profile link is required');
      return false;
    }
    // Basic LinkedIn URL validation
    if (!formData.linkedinUrl.includes('linkedin.com')) {
      toast.error('Please enter a valid LinkedIn profile URL');
      return false;
    }
    // Optional email validation
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('Please enter a valid email address');
        return false;
      }
    }
    if (!captchaToken) {
      toast.error('Please complete the security check');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-mentor-recommendation', {
        body: {
          mentor: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            company: formData.company.trim(),
            linkedinUrl: formData.linkedinUrl.trim(),
            email: formData.email.trim() || null,
          },
          captchaToken,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Thank you for your recommendation!');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit recommendation. Please try again.');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground">
            We appreciate your mentor recommendation. Our team will review and reach out to them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Recommend a Mentor</CardTitle>
        </div>
        <CardDescription className="text-base">
          Know someone who you think would be a great mentor with ACFE? Share their details with us and we will contact them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mentor-firstName">First Name *</Label>
              <Input
                id="mentor-firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mentor-lastName">Last Name *</Label>
              <Input
                id="mentor-lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentor-company">Company Name *</Label>
            <Input
              id="mentor-company"
              placeholder="Tech Company Inc."
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentor-linkedin">LinkedIn Profile *</Label>
            <Input
              id="mentor-linkedin"
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              maxLength={500}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentor-email">Email (Optional)</Label>
            <Input
              id="mentor-email"
              type="email"
              placeholder="mentor@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              maxLength={255}
            />
          </div>

          <div ref={captchaRef} className="flex justify-center" />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !captchaReady}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Submit Recommendation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
