import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Heart, DollarSign, Building2 } from 'lucide-react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'error-callback'?: () => void; theme?: string }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const donationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email'),
  company: z.string().max(100).optional(),
  reason: z.string().min(1, 'Please share why you want to support us').max(500, 'Maximum 500 characters'),
  amount: z.number().min(10, 'Minimum donation is $10').max(10000, 'Maximum donation is $10,000'),
});

type DonationFormData = z.infer<typeof donationSchema>;

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestedAmounts = [10, 25, 50, 100];

export const DonationDialog = ({ open, onOpenChange }: DonationDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const form = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      reason: '',
      amount: 10,
    },
  });

  useEffect(() => {
    if (!open) {
      setCaptchaToken(null);
      return;
    }

    const loadTurnstile = () => {
      if (window.turnstile && captchaContainerRef.current) {
        setCaptchaLoading(true);
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }
        widgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaLoading(false);
          },
          'error-callback': () => {
            setCaptchaLoading(false);
            toast({
              title: "Verification Error",
              description: "Please try again.",
              variant: "destructive",
            });
          },
          theme: 'light',
        });
        setCaptchaLoading(false);
      }
    };

    // Check if script is already loaded
    if (window.turnstile) {
      setTimeout(loadTurnstile, 100);
    } else {
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.onload = () => setTimeout(loadTurnstile, 100);
        document.body.appendChild(script);
      } else {
        setTimeout(loadTurnstile, 500);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [open, toast]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue('amount', amount);
  };

  const onSubmit = async (data: DonationFormData) => {
    if (!captchaToken) {
      toast({
        title: "Verification required",
        description: "Please complete the security check.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('create-donation-checkout', {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          company: data.company || null,
          reason: data.reason,
          amountCents: Math.round(data.amount * 100),
          captchaToken,
        },
      });

      if (error) throw error;

      if (result?.url) {
        window.open(result.url, '_blank');
        onOpenChange(false);
        toast({
          title: "Redirecting to payment",
          description: "A new tab has opened for secure payment processing.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Support ACFE
          </DialogTitle>
          <DialogDescription>
            Your monthly donation helps sponsor internships and provide resources to learners across Africa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Company <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why do you want to support ACFE? <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Share your reason for supporting our mission..." 
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Monthly Amount (USD) <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-4 gap-2">
                {suggestedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => handleAmountSelect(amount)}
                    className="h-11"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min={10}
                          max={10000}
                          placeholder="Custom amount"
                          className="pl-9"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 10;
                            field.onChange(value);
                            setSelectedAmount(suggestedAmounts.includes(value) ? value : null);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cloudflare Turnstile CAPTCHA */}
            <div className="flex justify-center">
              <div ref={captchaContainerRef} className="min-h-[65px]" />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !captchaToken}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Donate ${form.watch('amount')}/month
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment processed by Stripe. You can cancel anytime.
            </p>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
