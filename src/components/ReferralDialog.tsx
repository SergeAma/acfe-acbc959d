import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, Building2 } from 'lucide-react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReferralDialog = ({ open, onOpenChange }: ReferralDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  // Referrer (person recommending)
  const [referrerFirstName, setReferrerFirstName] = useState('');
  const [referrerLastName, setReferrerLastName] = useState('');
  const [referrerEmail, setReferrerEmail] = useState('');
  const [referrerCompany, setReferrerCompany] = useState('');
  
  // Referred (person/institution being recommended)
  const [referredFirstName, setReferredFirstName] = useState('');
  const [referredLastName, setReferredLastName] = useState('');
  const [referredCompany, setReferredCompany] = useState('');
  const [referredEmail, setReferredEmail] = useState('');

  useEffect(() => {
    if (open) {
      // Load Turnstile script
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.turnstile) {
          const container = document.getElementById('referral-captcha-container');
          if (container) {
            window.turnstile.render(container, {
              sitekey: TURNSTILE_SITE_KEY,
              callback: (token: string) => setCaptchaToken(token),
              'error-callback': () => setCaptchaToken(null),
            });
          }
        }
      };

      return () => {
        document.body.removeChild(script);
        setCaptchaToken(null);
      };
    }
  }, [open]);

  const resetForm = () => {
    setReferrerFirstName('');
    setReferrerLastName('');
    setReferrerEmail('');
    setReferrerCompany('');
    setReferredFirstName('');
    setReferredLastName('');
    setReferredCompany('');
    setReferredEmail('');
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('submit-referral', {
        body: {
          referrer: {
            firstName: referrerFirstName,
            lastName: referrerLastName,
            email: referrerEmail,
            company: referrerCompany,
          },
          referred: {
            firstName: referredFirstName,
            lastName: referredLastName,
            company: referredCompany,
            email: referredEmail,
          },
          captchaToken,
        },
      });

      if (error) throw error;

      toast.success('Thank you for your recommendation! We will reach out soon.');
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Referral submission error:', error);
      toast.error(error.message || 'Failed to submit recommendation');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = 
    referrerFirstName && 
    referrerLastName && 
    referrerEmail && 
    referredFirstName && 
    referredLastName && 
    referredCompany && 
    referredEmail && 
    captchaToken;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Recommend an Institution or Sponsor</DialogTitle>
          <DialogDescription>
            Help us grow by introducing us to educational institutions or potential sponsors.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Referrer Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <UserPlus className="h-5 w-5" />
              <h3 className="font-semibold">Your Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referrer-first-name">First Name *</Label>
                <Input
                  id="referrer-first-name"
                  value={referrerFirstName}
                  onChange={(e) => setReferrerFirstName(e.target.value)}
                  required
                  placeholder="Your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referrer-last-name">Last Name *</Label>
                <Input
                  id="referrer-last-name"
                  value={referrerLastName}
                  onChange={(e) => setReferrerLastName(e.target.value)}
                  required
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrer-email">Email *</Label>
              <Input
                id="referrer-email"
                type="email"
                value={referrerEmail}
                onChange={(e) => setReferrerEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrer-company">Company</Label>
              <Input
                id="referrer-company"
                value={referrerCompany}
                onChange={(e) => setReferrerCompany(e.target.value)}
                placeholder="Your company (optional)"
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Referred Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-secondary">
              <Building2 className="h-5 w-5" />
              <h3 className="font-semibold">Institution/Sponsor Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referred-first-name">Contact First Name *</Label>
                <Input
                  id="referred-first-name"
                  value={referredFirstName}
                  onChange={(e) => setReferredFirstName(e.target.value)}
                  required
                  placeholder="Contact's first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referred-last-name">Contact Last Name *</Label>
                <Input
                  id="referred-last-name"
                  value={referredLastName}
                  onChange={(e) => setReferredLastName(e.target.value)}
                  required
                  placeholder="Contact's last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referred-company">Institution/Company Name *</Label>
              <Input
                id="referred-company"
                value={referredCompany}
                onChange={(e) => setReferredCompany(e.target.value)}
                required
                placeholder="Name of institution or company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referred-email">Email Address *</Label>
              <Input
                id="referred-email"
                type="email"
                value={referredEmail}
                onChange={(e) => setReferredEmail(e.target.value)}
                required
                placeholder="contact@institution.com"
              />
            </div>
          </div>

          {/* CAPTCHA */}
          <div id="referral-captcha-container" className="flex justify-center"></div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Recommendation'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
