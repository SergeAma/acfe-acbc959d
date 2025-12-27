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
import { ArrowLeft, DollarSign, Gift, Loader2, Save } from 'lucide-react';

interface PricingOverride {
  enabled: boolean;
  force_free: boolean;
  sponsor_name: string | null;
  sponsor_message: string | null;
}

export const AdminPricing = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [pricingOverride, setPricingOverride] = useState<PricingOverride>({
    enabled: false,
    force_free: false,
    sponsor_name: null,
    sponsor_message: null,
  });

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
  }, []);

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
              Control course pricing across the entire platform
            </p>
          </div>

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
