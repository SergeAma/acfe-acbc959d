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
import { ArrowLeft, DollarSign, Gift, Loader2, Save, Ticket, Plus, Copy, Check, BarChart3, TrendingUp, Edit2, Power } from 'lucide-react';
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
  times_redeemed: number;
  max_redemptions: number | null;
  active: boolean;
  created: number;
  trial_days: number;
}

interface CouponAnalytics {
  total_coupons: number;
  active_coupons: number;
  total_redemptions: number;
  top_coupon: Coupon | null;
}

const TRIAL_OPTIONS = [
  { value: '3', label: '3 Days' },
  { value: '7', label: '1 Week' },
  { value: '14', label: '2 Weeks' },
  { value: '30', label: '1 Month' },
];

const formatTrialDays = (days: number) => {
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days === 7) return "1 week";
  if (days === 14) return "2 weeks";
  if (days === 30) return "1 month";
  return `${days} days`;
};

export const AdminPricing = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(true); // Start true for initial load
  const [couponsInitialized, setCouponsInitialized] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  
  // Subscription pricing state
  const [subscriptionPriceCents, setSubscriptionPriceCents] = useState<number>(1000);
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPriceValue, setTempPriceValue] = useState('10');
  const [savingPrice, setSavingPrice] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);
  
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
  const [newCouponTrialDays, setNewCouponTrialDays] = useState('7');

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
        const { data, error } = await supabase.functions.invoke('get-subscription-price');
        if (error) throw error;
        if (data?.priceCents) {
          setSubscriptionPriceCents(data.priceCents);
          setTempPriceValue((data.priceCents / 100).toString());
        }
      } catch (error) {
        console.error('Error fetching subscription price:', error);
      }
      setLoadingPrice(false);
    };

    fetchSettings();
    fetchSubscriptionPrice();
    if (!couponsInitialized) {
      fetchCoupons(true);
    }
  }, [authLoading, profile, couponsInitialized]);

  const fetchCoupons = async (isInitialLoad = false) => {
    // Only show loading spinner on initial load
    if (isInitialLoad) {
      setLoadingCoupons(true);
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        console.error('No access token available');
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
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('update-subscription-price', {
        body: { priceCents },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setSubscriptionPriceCents(priceCents);
      setEditingPrice(false);
      toast({
        title: "Price updated",
        description: `Subscription price set to $${priceValue.toFixed(2)}/month`,
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

    setCreatingCoupon(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-coupon', {
        body: { 
          code: newCouponCode.trim(),
          name: newCouponName.trim() || undefined,
          trialDays: parseInt(newCouponTrialDays),
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Coupon Created",
        description: data.message,
      });
      
      setNewCouponCode('');
      setNewCouponName('');
      setNewCouponTrialDays('7');
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
                Create discount codes with custom trial periods. After the trial, learners are charged normally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="coupon_code">Coupon Code</Label>
                    <Input
                      id="coupon_code"
                      placeholder="e.g., FREEWEEK"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>
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
                </div>
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
                            {formatTrialDays(coupon.trial_days)} free
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
                        className="flex items-center justify-between p-3 bg-muted/20 border border-dashed rounded-lg opacity-60"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono font-bold line-through">{coupon.code}</code>
                          <Badge variant="secondary" className="text-xs">
                            {formatTrialDays(coupon.trial_days)} free
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {coupon.times_redeemed} redemptions
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Default Pricing
              </CardTitle>
              <CardDescription>
                Set the monthly subscription price for all paid courses. Mentors can set their courses as free or paid.
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
