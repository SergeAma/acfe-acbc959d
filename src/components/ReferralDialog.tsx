import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, Building2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { COMPANIES, UNIVERSITIES } from '@/data';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

const AFRICAN_COUNTRIES = [
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

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
  const [referrerCountry, setReferrerCountry] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');
  
  // Referred (person/institution being recommended)
  const [referredFirstName, setReferredFirstName] = useState('');
  const [referredLastName, setReferredLastName] = useState('');
  const [referredCompany, setReferredCompany] = useState('');
  const [referredEmail, setReferredEmail] = useState('');
  const [referredCountry, setReferredCountry] = useState('');
  const [referredPhone, setReferredPhone] = useState('');

  useEffect(() => {
    if (!open) {
      setCaptchaToken(null);
      return;
    }

    const initTurnstile = () => {
      const container = document.getElementById('referral-captcha-container');
      if (window.turnstile && container) {
        window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          'error-callback': () => setCaptchaToken(null),
        });
      }
    };

    // Script is preloaded in index.html - just init when ready
    if (window.turnstile) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(initTurnstile);
    } else {
      // Fallback: wait for script to load
      const checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkTurnstile);
          initTurnstile();
        }
      }, 50);
      setTimeout(() => clearInterval(checkTurnstile), 5000);
    }
  }, [open]);

  const resetForm = () => {
    setReferrerFirstName('');
    setReferrerLastName('');
    setReferrerEmail('');
    setReferrerCompany('');
    setReferrerCountry('');
    setReferrerPhone('');
    setReferredFirstName('');
    setReferredLastName('');
    setReferredCompany('');
    setReferredEmail('');
    setReferredCountry('');
    setReferredPhone('');
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
            country: referrerCountry,
            phone: referrerPhone,
          },
          referred: {
            firstName: referredFirstName,
            lastName: referredLastName,
            company: referredCompany,
            email: referredEmail,
            country: referredCountry,
            phone: referredPhone,
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
    referrerCompany &&
    referrerCountry &&
    referrerPhone &&
    referredFirstName && 
    referredLastName && 
    referredCompany && 
    referredEmail && 
    referredCountry &&
    referredPhone &&
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
              <Label htmlFor="referrer-company">Company <span className="text-destructive">*</span></Label>
              <AutocompleteInput
                id="referrer-company"
                value={referrerCompany}
                onChange={setReferrerCompany}
                suggestions={COMPANIES}
                placeholder="Start typing to see suggestions..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrer-country">Country *</Label>
              <Select value={referrerCountry} onValueChange={setReferrerCountry} required>
                <SelectTrigger id="referrer-country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {AFRICAN_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrer-phone">Phone *</Label>
              <PhoneInput
                id="referrer-phone"
                value={referrerPhone}
                onChange={setReferrerPhone}
                required
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
              <AutocompleteInput
                id="referred-company"
                value={referredCompany}
                onChange={setReferredCompany}
                suggestions={[...UNIVERSITIES, ...COMPANIES]}
                placeholder="Start typing to see suggestions..."
                required
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

            <div className="space-y-2">
              <Label htmlFor="referred-country">Country *</Label>
              <Select value={referredCountry} onValueChange={setReferredCountry} required>
                <SelectTrigger id="referred-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {AFRICAN_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referred-phone">Phone *</Label>
              <PhoneInput
                id="referred-phone"
                value={referredPhone}
                onChange={setReferredPhone}
                required
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
