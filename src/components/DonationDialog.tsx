import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Heart, DollarSign } from 'lucide-react';

const donationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email'),
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

  const form = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      amount: 10,
    },
  });

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue('amount', amount);
  };

  const onSubmit = async (data: DonationFormData) => {
    setIsSubmitting(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('create-donation-checkout', {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          amountCents: Math.round(data.amount * 100),
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
      <DialogContent className="sm:max-w-md">
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
                    <FormLabel>First Name</FormLabel>
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
                    <FormLabel>Last Name</FormLabel>
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Monthly Amount (USD)</Label>
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
