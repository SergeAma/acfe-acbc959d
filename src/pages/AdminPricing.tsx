import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, DollarSign, Gift, Loader2, Save, Ticket, Plus, Copy, Check, BarChart3, TrendingUp, Edit2, Power, RotateCcw, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PricingOverride {
  enabled: boolean;
  force_free: boolean;
  sponsor_name: string | null;
  sponsor_message: string | null;
}

interface Coupon {
  id: string;
  code: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  duration: 'once' | 'repeating' | 'forever' | null;
  duration_in_months: number | null;
  times_redeemed: number;
  max_redemptions: number | null;
  active: boolean;
  created: number;
  trial_days: number | null;
  coupon_type: 'trial' | 'discount';
}

interface CouponAnalytics {
  total_coupons: number;
  active_coupons: number;
  total_redemptions: number;
  top_coupon: Coupon | null;
}

const TRIAL_OPTIONS = [
  { value: '2', label: '48 Hours' },
  { value: '3', label: '3 Days' },
  { value: '7', label: '1 Week' },
  { value: '14', label: '2 Weeks' },
  { value: '30', label: '1 Month' },
];

const DURATION_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'repeating', label: 'Multiple months' },
  { value: 'forever', label: 'Forever' },
];

const MONTHS_OPTIONS = [
  { value: '1', label: '1 month' },
  { value: '2', label: '2 months' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
];

const formatTrialDays = (days: number | null) => {
  if (!days) return "";
  if (days === 1) return "1 day";
  if (days === 2) return "48 hours";
  if (days < 7) return `${days} days`;
  if (days === 7) return "1 week";
  if (days === 14) return "2 weeks";
  if (days === 30) return "1 month";
  return `${days} days`;
};

const formatCouponBadge = (coupon: Coupon): string => {
  if (coupon.coupon_type === 'trial' && coupon.trial_days) {
    return `${formatTrialDays(coupon.trial_days)} free`;
  }
  
  // Discount coupon
  let discountText = '';
  if (coupon.percent_off) {
    discountText = `${coupon.percent_off}% off`;
  } else if (coupon.amount_off) {
    discountText = `$${(coupon.amount_off / 100).toFixed(0)} off`;
  }
  
  let durationText = '';
  if (coupon.duration === 'once') {
    durationText = '(once)';
  } else if (coupon.duration === 'forever') {
    durationText = '(forever)';
  } else if (coupon.duration === 'repeating' && coupon.duration_in_months) {
    durationText = `(${coupon.duration_in_months}mo)`;
  }
  
  return `${discountText} ${durationText}`.trim();
};

export const AdminPricing = () => {
  const navigate = useNavigate();
  const { profile, session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(true); // Start true for initial load
  const [couponsInitialized, setCouponsInitialized] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  
  // Subscription pricing state
  const [subscriptionPriceCents, setSubscriptionPriceCents] = useState<number>(1500);
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPriceValue, setTempPriceValue] = useState('15');
  const [savingPrice, setSavingPrice] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);

  // Mentorship Plus pricing state
  const [mentorshipPlusPriceCents, setMentorshipPlusPriceCents] = useState<number>(3000);
  const [editingMentorshipPrice, setEditingMentorshipPrice] = useState(false);
  const [tempMentorshipPriceValue, setTempMentorshipPriceValue] = useState('30');
  const [savingMentorshipPrice, setSavingMentorshipPrice] = useState(false);
  const [loadingMentorshipPrice, setLoadingMentorshipPrice] = useState(true);

  // 1:1 Session pricing state
  const [sessionPriceCents, setSessionPriceCents] = useState<number>(5000);
  const [sessionEnabled, setSessionEnabled] = useState<boolean>(true);
  const [editingSessionPrice, setEditingSessionPrice] = useState(false);
  const [tempSessionPriceValue, setTempSessionPriceValue] = useState('50');
  const [savingSessionPrice, setSavingSessionPrice] = useState(false);
  const [loadingSessionPrice, setLoadingSessionPrice] = useState(true);
  
  const [pricingOverride, setPricingOverride] = useState<PricingOverride>({
    enabled: false,
    force_free: false,
    sponsor_name: null,
    sponsor_message: null,
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);
  const [couponToDeactivate, setCouponToDeactivate] = useState<{ id: string; code: string } | null>(null);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponName, setNewCouponName] = useState('');
  const [newCouponTrialDays, setNewCouponTrialDays] = useState('2');
  // New coupon type state
  const [newCouponType, setNewCouponType] = useState<'trial' | 'discount'>('trial');
  const [newCouponPercentOff, setNewCouponPercentOff] = useState('');
  const [newCouponDuration, setNewCouponDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [newCouponDurationMonths, setNewCouponDurationMonths] = useState('3');

  // Only redirect if auth is fully loaded AND profile explicitly has non-admin role
  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    if (authLoading || !profile) return;
    if (profile.role !== 'admin') return;
    
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'pricing_override')
        .single();

      if (data?.setting_value) {
        setPricingOverride(data.setting_value as unknown as PricingOverride);
      }
      setLoading(false);
    };

    const fetchSubscriptionPrice = async () => {
      setLoadingPrice(true);
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'subscription_price')
          .single();
        if (data?.setting_value) {
          const priceCents = (data.setting_value as any).price_cents || 1500;
          setSubscriptionPriceCents(priceCents);
          setTempPriceValue((priceCents / 100).toString());
        }
      } catch (error) {
        console.error('Error fetching subscription price:', error);
      }
      setLoadingPrice(false);
    };

    const fetchMentorshipPlusPrice = async () => {
      setLoadingMentorshipPrice(true);
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'mentorship_plus_price')
          .single();
        if (data?.setting_value) {
          const priceCents = (data.setting_value as any).price_cents || 3000;
          setMentorshipPlusPriceCents(priceCents);
          setTempMentorshipPriceValue((priceCents / 100).toString());
        }
      } catch (error) {
        console.error('Error fetching mentorship plus price:', error);
      }
      setLoadingMentorshipPrice(false);
    };

    const fetchSessionPrice = async () => {
      setLoadingSessionPrice(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-session-price');
        if (error) throw error;
        if (data) {
          setSessionPriceCents(data.priceCents || 5000);
          setSessionEnabled(data.enabled !== false);
          setTempSessionPriceValue(((data.priceCents || 5000) / 100).toString());
        }
      } catch (error) {
        console.error('Error fetching session price:', error);
      }
      setLoadingSessionPrice(false);
    };

    fetchSettings();
    fetchSubscriptionPrice();
    fetchMentorshipPlusPrice();
    fetchSessionPrice();
  }, [authLoading, profile]);

  // Separate effect for coupons - waits for session to be fully ready
  useEffect(() => {
    if (authLoading || !profile || profile.role !== 'admin') return;
    if (couponsInitialized) return;
    
    // Only fetch when we have a valid access token
    if (session?.access_token) {
      fetchCoupons(true);
    }
  }, [authLoading, profile, session?.access_token, couponsInitialized]);

  const fetchCoupons = async (isInitialLoad = false) => {
    // Only show loading spinner on initial load
    if (isInitialLoad) {
      setLoadingCoupons(true);
    }
    try {
      // Use session from AuthContext - it's properly managed and refreshed
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        // Session not ready yet - this is expected on initial load
        // Don't retry infinitely, just wait for the useEffect to re-run when session updates
        console.log('No access token available yet');
        if (isInitialLoad) setLoadingCoupons(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('list-coupons', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;
      if (data?.coupons) {
        setCoupons(data.coupons);
      }
      if (data?.analytics) {
        setAnalytics(data.analytics);
      }
      setCouponsInitialized(true);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: "Error loading coupons",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    }
    if (isInitialLoad) setLoadingCoupons(false);
  };

  const handleSavePrice = async () => {
    const priceValue = parseFloat(tempPriceValue);
    if (isNaN(priceValue) || priceValue < 1) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price (minimum $1.00)",
        variant: "destructive",
      });
      return;
    }

    const priceCents = Math.round(priceValue * 100);
    setSavingPrice(true);
    
    try {
      // Call edge function to update Stripe price and sync platform_settings
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('update-subscription-price', {
        body: { priceCents, tier: 'membership' },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setSubscriptionPriceCents(priceCents);
      setEditingPrice(false);
      toast({
        title: "Price updated",
        description: data?.message || `ACFE Membership price set to $${priceValue.toFixed(2)}/month`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update price";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    setSavingPrice(false);
  };

  const handleCancelPriceEdit = () => {
    setTempPriceValue((subscriptionPriceCents / 100).toString());
    setEditingPrice(false);
  };

  const handleSaveMentorshipPrice = async () => {
    const priceValue = parseFloat(tempMentorshipPriceValue);
    if (isNaN(priceValue) || priceValue < 1) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price (minimum $1.00)",
        variant: "destructive",
      });
      return;
    }

    const priceCents = Math.round(priceValue * 100);
    setSavingMentorshipPrice(true);
    
    try {
      // Call edge function to update Stripe price and sync platform_settings
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('update-subscription-price', {
        body: { priceCents, tier: 'mentorship_plus' },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setMentorshipPlusPriceCents(priceCents);
      setEditingMentorshipPrice(false);
      toast({
        title: "Price updated",
        description: data?.message || `Mentorship Plus price set to $${priceValue.toFixed(2)}/month`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update price";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    setSavingMentorshipPrice(false);
  };

  const handleCancelMentorshipPriceEdit = () => {
    setTempMentorshipPriceValue((mentorshipPlusPriceCents / 100).toString());
    setEditingMentorshipPrice(false);
  };

  const handleSaveSessionPrice = async () => {
    const priceValue = parseFloat(tempSessionPriceValue);
    if (isNaN(priceValue) || priceValue < 1) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price (minimum $1.00)",
        variant: "destructive",
      });
      return;
    }

    const priceCents = Math.round(priceValue * 100);
    setSavingSessionPrice(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('update-session-price', {
        body: { priceCents, enabled: sessionEnabled },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setSessionPriceCents(priceCents);
      setEditingSessionPrice(false);
      toast({
        title: "Session price updated",
        description: `1:1 session price set to $${priceValue.toFixed(2)}`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update session price";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    setSavingSessionPrice(false);
  };

  const handleToggleSessionEnabled = async (enabled: boolean) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('update-session-price', {
        body: { enabled },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setSessionEnabled(enabled);
      toast({
        title: enabled ? "Sessions enabled" : "Sessions disabled",
        description: enabled ? "Learners can now book 1:1 sessions" : "1:1 sessions are now disabled",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancelSessionPriceEdit = () => {
    setTempSessionPriceValue((sessionPriceCents / 100).toString());
    setEditingSessionPrice(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('platform_settings')
      .update({ 
        setting_value: JSON.parse(JSON.stringify(pricingOverride)),
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'pricing_override');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Pricing settings have been updated",
      });
    }

    setSaving(false);
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    // Validate discount coupon inputs
    if (newCouponType === 'discount') {
      const percentValue = parseFloat(newCouponPercentOff);
      if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) {
        toast({
          title: "Error",
          description: "Please enter a valid discount percentage (1-100)",
          variant: "destructive",
        });
        return;
      }
    }

    setCreatingCoupon(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      // Build request body based on coupon type
      const requestBody: Record<string, unknown> = {
        code: newCouponCode.trim(),
        name: newCouponName.trim() || undefined,
        couponType: newCouponType,
      };

      if (newCouponType === 'trial') {
        requestBody.trialDays = parseInt(newCouponTrialDays);
      } else {
        requestBody.percentOff = parseFloat(newCouponPercentOff);
        requestBody.duration = newCouponDuration;
        if (newCouponDuration === 'repeating') {
          requestBody.durationInMonths = parseInt(newCouponDurationMonths);
        }
      }

      const { data, error } = await supabase.functions.invoke('create-coupon', {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Coupon Created",
        description: data.message,
      });
      
      // Reset form
      setNewCouponCode('');
      setNewCouponName('');
      setNewCouponTrialDays('2');
      setNewCouponPercentOff('');
      setNewCouponDuration('once');
      setNewCouponDurationMonths('3');
      fetchCoupons(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    }
    setCreatingCoupon(false);
  };

  const handleDeactivateCoupon = async () => {
    if (!couponToDeactivate) return;
    
    const { id: promotionCodeId, code } = couponToDeactivate;
    setDeactivatingId(promotionCodeId);
    setCouponToDeactivate(null);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('deactivate-coupon', {
        body: { promotionCodeId },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Coupon Deactivated",
        description: `"${code}" has been deactivated`,
      });
      
      fetchCoupons(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate coupon",
        variant: "destructive",
      });
    }
    setDeactivatingId(null);
  };

  const handleReactivateCoupon = async (promotionCodeId: string, code: string) => {
    setReactivatingId(promotionCodeId);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('reactivate-coupon', {
        body: { promotionCodeId },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Coupon Reactivated",
        description: `"${code}" is now active again`,
      });
      
      fetchCoupons(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate coupon",
        variant: "destructive",
      });
    }
    setReactivatingId(null);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => c.active);
  const inactiveCoupons = coupons.filter(c => !c.active);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Pricing Settings</h1>
            <p className="text-muted-foreground mt-2">
              Control course pricing and discount codes
            </p>
          </div>

          {/* Analytics Summary */}
          {analytics && analytics.total_coupons > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Coupon Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{analytics.total_coupons}</p>
                    <p className="text-xs text-muted-foreground">Total Coupons</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{analytics.active_coupons}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{analytics.total_redemptions}</p>
                    <p className="text-xs text-muted-foreground">Total Redemptions</p>
                  </div>
                  {analytics.top_coupon && analytics.top_coupon.times_redeemed > 0 && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                        <code className="font-mono font-bold text-sm">{analytics.top_coupon.code}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">Top Coupon ({analytics.top_coupon.times_redeemed} uses)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coupon Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Discount Codes
              </CardTitle>
              <CardDescription>
                Create trial codes (100% off for a period) or discount codes (X% off).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                {/* Coupon Type Selector */}
                <div className="space-y-2">
                  <Label>Coupon Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newCouponType === 'trial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCouponType('trial')}
                      className="flex-1"
                    >
                      Free Trial
                    </Button>
                    <Button
                      type="button"
                      variant={newCouponType === 'discount' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCouponType('discount')}
                      className="flex-1"
                    >
                      Percentage Discount
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="coupon_code">Coupon Code</Label>
                    <Input
                      id="coupon_code"
                      placeholder={newCouponType === 'trial' ? 'e.g., FREEWEEK' : 'e.g., SAVE25'}
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>
                  
                  {newCouponType === 'trial' ? (
                    <div className="space-y-2">
                      <Label htmlFor="trial_duration">Trial Duration</Label>
                      <Select value={newCouponTrialDays} onValueChange={setNewCouponTrialDays}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIAL_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="percent_off">Discount Percentage</Label>
                      <div className="relative">
                        <Input
                          id="percent_off"
                          type="number"
                          min="1"
                          max="100"
                          placeholder="25"
                          value={newCouponPercentOff}
                          onChange={(e) => setNewCouponPercentOff(e.target.value)}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discount Duration (only for discount coupons) */}
                {newCouponType === 'discount' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="discount_duration">Duration</Label>
                      <Select value={newCouponDuration} onValueChange={(v) => setNewCouponDuration(v as 'once' | 'repeating' | 'forever')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newCouponDuration === 'repeating' && (
                      <div className="space-y-2">
                        <Label htmlFor="duration_months">Number of Months</Label>
                        <Select value={newCouponDurationMonths} onValueChange={setNewCouponDurationMonths}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="coupon_name">Name (optional)</Label>
                  <Input
                    id="coupon_name"
                    placeholder="e.g., Launch Promotion"
                    value={newCouponName}
                    onChange={(e) => setNewCouponName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateCoupon} disabled={creatingCoupon} className="w-full">
                  {creatingCoupon ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Coupon
                </Button>
              </div>

              {/* Active Coupons */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Active Coupons</h4>
                {loadingCoupons ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : activeCoupons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active coupons</p>
                ) : (
                  <div className="space-y-2">
                    {activeCoupons.map((coupon) => (
                      <div 
                        key={coupon.id} 
                        className="flex items-center justify-between p-3 bg-background border rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono font-bold text-primary">{coupon.code}</code>
                          <Badge variant="outline" className="text-xs">
                            {formatCouponBadge(coupon)}
                          </Badge>
                          {coupon.name && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">{coupon.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {coupon.times_redeemed}/{coupon.max_redemptions || '∞'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(coupon.code)}
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                            onClick={() => setCouponToDeactivate({ id: coupon.id, code: coupon.code })}
                            disabled={deactivatingId === coupon.id}
                          >
                            {deactivatingId === coupon.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Power className="h-4 w-4 mr-1" />
                            )}
                            Deactivate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive Coupons */}
              {inactiveCoupons.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Inactive Coupons</h4>
                  <div className="space-y-2">
                    {inactiveCoupons.map((coupon) => (
                      <div 
                        key={coupon.id} 
                        className="flex items-center justify-between p-3 bg-muted/20 border border-dashed rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono font-bold text-muted-foreground">{coupon.code}</code>
                          <Badge variant="secondary" className="text-xs">
                            {formatCouponBadge(coupon)}
                          </Badge>
                          {coupon.name && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">{coupon.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {coupon.times_redeemed} redemptions
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleReactivateCoupon(coupon.id, coupon.code)}
                            disabled={reactivatingId === coupon.id}
                          >
                            {reactivatingId === coupon.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-1" />
                            )}
                            Reactivate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                ACFE Membership Pricing
              </CardTitle>
              <CardDescription>
                Set the monthly subscription price for ACFE Membership tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPrice ? (
                <div className="bg-muted/50 rounded-lg p-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : editingPrice ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">$</span>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={tempPriceValue}
                      onChange={(e) => setTempPriceValue(e.target.value)}
                      className="text-2xl font-bold w-32 text-center"
                    />
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSavePrice} 
                      disabled={savingPrice}
                      className="flex-1"
                    >
                      {savingPrice ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Price
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelPriceEdit}
                      disabled={savingPrice}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="bg-muted/50 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/70 transition-colors group relative"
                  onClick={() => setEditingPrice(true)}
                >
                  <span className="text-4xl font-bold">${(subscriptionPriceCents / 100).toFixed(0)}</span>
                  <p className="text-sm text-muted-foreground mt-1">per month subscription</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPrice(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mentorship Plus Pricing */}
          <Card className="border-secondary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-secondary">
                <DollarSign className="h-5 w-5" />
                Mentorship Plus Pricing
              </CardTitle>
              <CardDescription>
                Set the monthly price for the Mentorship Plus tier (includes 1:1 session credits).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMentorshipPrice ? (
                <div className="bg-secondary/10 rounded-lg p-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : editingMentorshipPrice ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-secondary">$</span>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={tempMentorshipPriceValue}
                      onChange={(e) => setTempMentorshipPriceValue(e.target.value)}
                      className="text-2xl font-bold w-32 text-center border-secondary/50"
                    />
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveMentorshipPrice} 
                      disabled={savingMentorshipPrice}
                      className="flex-1 bg-secondary hover:bg-secondary/90"
                    >
                      {savingMentorshipPrice ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Price
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelMentorshipPriceEdit}
                      disabled={savingMentorshipPrice}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="bg-secondary/10 rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/20 transition-colors group relative"
                  onClick={() => setEditingMentorshipPrice(true)}
                >
                  <span className="text-4xl font-bold text-secondary">${(mentorshipPlusPriceCents / 100).toFixed(0)}</span>
                  <p className="text-sm text-muted-foreground mt-1">per month subscription</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMentorshipPrice(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 1:1 Session Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                1:1 Mentor Sessions
              </CardTitle>
              <CardDescription>
                Set the price for one-on-one mentorship sessions. This price applies to all mentors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 1:1 Sessions</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow learners to purchase sessions with mentors
                  </p>
                </div>
                <Switch
                  checked={sessionEnabled}
                  onCheckedChange={handleToggleSessionEnabled}
                />
              </div>

              {sessionEnabled && (
                <>
                  {loadingSessionPrice ? (
                    <div className="bg-muted/50 rounded-lg p-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : editingSessionPrice ? (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">$</span>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={tempSessionPriceValue}
                          onChange={(e) => setTempSessionPriceValue(e.target.value)}
                          className="text-2xl font-bold w-32 text-center"
                        />
                        <span className="text-muted-foreground">/session</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveSessionPrice} 
                          disabled={savingSessionPrice}
                          className="flex-1"
                        >
                          {savingSessionPrice ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Price
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCancelSessionPriceEdit}
                          disabled={savingSessionPrice}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="bg-muted/50 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/70 transition-colors group relative"
                      onClick={() => setEditingSessionPrice(true)}
                    >
                      <span className="text-4xl font-bold">${(sessionPriceCents / 100).toFixed(0)}</span>
                      <p className="text-sm text-muted-foreground mt-1">per 1:1 session</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionPrice(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Sponsorship Override
              </CardTitle>
              <CardDescription>
                Enable this to make all paid courses free for users. Perfect for launch promotions or sponsorships.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Sponsorship</Label>
                  <p className="text-sm text-muted-foreground">
                    Override all paid courses to be free
                  </p>
                </div>
                <Switch
                  checked={pricingOverride.enabled && pricingOverride.force_free}
                  onCheckedChange={(checked) => 
                    setPricingOverride(prev => ({
                      ...prev,
                      enabled: checked,
                      force_free: checked
                    }))
                  }
                />
              </div>

              {pricingOverride.enabled && pricingOverride.force_free && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="sponsor_name">Sponsor Name</Label>
                    <Input
                      id="sponsor_name"
                      placeholder="e.g., Spectrogram Consulting"
                      value={pricingOverride.sponsor_name || ''}
                      onChange={(e) => 
                        setPricingOverride(prev => ({
                          ...prev,
                          sponsor_name: e.target.value || null
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sponsor Message (optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Use the editor below to create a rich message with formatting, links, and more.
                    </p>
                    <RichTextEditor
                      content={pricingOverride.sponsor_message || ''}
                      onChange={(html) => 
                        setPricingOverride(prev => ({
                          ...prev,
                          sponsor_message: html || null
                        }))
                      }
                      placeholder="e.g., Free during our launch period! Thanks to our sponsors..."
                    />
                  </div>

                  {/* Live Preview - Matches CourseDetail display */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Live Preview (as seen by students)</Label>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <Gift className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-700 font-medium text-center">
                        Sponsored by {pricingOverride.sponsor_name || 'Our Partners'}
                      </p>
                      {pricingOverride.sponsor_message && (
                        <div 
                          className="text-xs text-green-600 mt-2 rich-text-content prose prose-sm prose-green max-w-none text-center [&_p]:mb-1 [&_p]:mt-1"
                          dangerouslySetInnerHTML={{ __html: pricingOverride.sponsor_message }}
                        />
                      )}
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="text-lg line-through text-muted-foreground">
                          ${(subscriptionPriceCents / 100).toFixed(2)}
                        </span>
                        <span className="text-2xl font-bold text-green-600">Free</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={!!couponToDeactivate} onOpenChange={(open) => !open && setCouponToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the coupon <strong>"{couponToDeactivate?.code}"</strong>? 
              This action cannot be undone and the coupon will no longer be usable by customers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeactivateCoupon}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
