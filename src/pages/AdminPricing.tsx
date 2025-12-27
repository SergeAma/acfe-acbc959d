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
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, DollarSign, Gift, Loader2, Save, Ticket, Plus, Copy, Check, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

export const AdminPricing = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  
  const [pricingOverride, setPricingOverride] = useState<PricingOverride>({
    enabled: false,
    force_free: false,
    sponsor_name: null,
    sponsor_message: null,
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponName, setNewCouponName] = useState('');

  useEffect(() => {
    if (!authLoading && profile?.role !== 'mentor') {
      navigate('/dashboard');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
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

    fetchSettings();
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('list-coupons', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.coupons) {
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
    setLoadingCoupons(false);
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
          name: newCouponName.trim() || '1 Week Free Trial'
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
      fetchCoupons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    }
    setCreatingCoupon(false);
  };

  const handleDeactivateCoupon = async (promotionCodeId: string, code: string) => {
    setDeactivatingId(promotionCodeId);
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
      
      fetchCoupons();
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Pricing Settings</h1>
            <p className="text-muted-foreground mt-2">
              Control course pricing and discount codes
            </p>
          </div>

          {/* Coupon Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Discount Codes
              </CardTitle>
              <CardDescription>
                Create discount codes that give learners 1 week free trial. After the trial, they'll be charged normally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="coupon_code">Coupon Code</Label>
                  <Input
                    id="coupon_code"
                    placeholder="e.g., FREEWEEK, LAUNCH2024"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
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
                  Create 1 Week Free Coupon
                </Button>
              </div>

              {/* Existing Coupons */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Active Coupons</h4>
                {loadingCoupons ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : coupons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active coupons</p>
                ) : (
                  <div className="space-y-2">
                    {coupons.map((coupon) => (
                      <div 
                        key={coupon.id} 
                        className="flex items-center justify-between p-3 bg-background border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <code className="font-mono font-bold text-primary">{coupon.code}</code>
                          <Badge variant="secondary" className="text-xs">
                            {coupon.percent_off}% off
                          </Badge>
                          {coupon.name && (
                            <span className="text-sm text-muted-foreground">{coupon.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {coupon.times_redeemed}/{coupon.max_redemptions || '∞'} used
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
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeactivateCoupon(coupon.id, coupon.code)}
                            disabled={deactivatingId === coupon.id}
                          >
                            {deactivatingId === coupon.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Default Pricing
              </CardTitle>
              <CardDescription>
                All paid courses are priced at $10. Mentors can set their courses as free or paid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <span className="text-4xl font-bold">$10</span>
                <p className="text-sm text-muted-foreground mt-1">per course</p>
              </div>
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
                    <Label htmlFor="sponsor_message">Sponsor Message (optional)</Label>
                    <Input
                      id="sponsor_message"
                      placeholder="e.g., Free during our launch period!"
                      value={pricingOverride.sponsor_message || ''}
                      onChange={(e) => 
                        setPricingOverride(prev => ({
                          ...prev,
                          sponsor_message: e.target.value || null
                        }))
                      }
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      <strong>Preview:</strong> Users will see "Sponsored by {pricingOverride.sponsor_name || 'Our Partners'}" 
                      with the original $10 price crossed out.
                    </p>
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
    </div>
  );
};
