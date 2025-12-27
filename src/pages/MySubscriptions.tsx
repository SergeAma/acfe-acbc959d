import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  CreditCard, 
  Loader2, 
  Calendar, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  XCircle
} from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string;
  product_id: string;
  product_name: string;
  price_id: string;
  amount: number;
  currency: string;
  interval: string;
  pause_collection: { behavior: string } | null;
}

export const MySubscriptions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSubscriptions();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      setSubscriptions(data?.subscriptions || []);
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open subscription management",
        variant: "destructive",
      });
    }
    setOpeningPortal(false);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.pause_collection) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <PauseCircle className="h-3 w-3" />
          Paused
        </Badge>
      );
    }
    if (subscription.cancel_at_period_end) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Cancels {new Date(subscription.current_period_end).toLocaleDateString()}
        </Badge>
      );
    }
    if (subscription.status === 'active') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {subscription.status}
      </Badge>
    );
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
      <PageBreadcrumb items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "My Subscriptions" }
      ]} />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">My Subscriptions</h1>
              <p className="text-muted-foreground mt-1">
                Manage your course subscriptions
              </p>
            </div>
            {subscriptions.length > 0 && (
              <Button onClick={handleManageSubscription} disabled={openingPortal}>
                {openingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Manage Billing
              </Button>
            )}
          </div>

          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any active course subscriptions yet.
                </p>
                <Button onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{subscription.product_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-semibold text-foreground">
                            {formatAmount(subscription.amount, subscription.currency)}
                          </span>
                          <span>/ {subscription.interval}</span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(subscription)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {subscription.cancel_at_period_end ? 'Ends' : 'Renews'}: {' '}
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {subscription.pause_collection && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="text-muted-foreground">
                          Your subscription is currently paused. You can resume it anytime from the billing portal.
                        </p>
                      </div>
                    )}

                    {subscription.cancel_at_period_end && (
                      <div className="mt-3 p-3 bg-destructive/10 rounded-lg text-sm">
                        <p className="text-destructive">
                          Your subscription will be cancelled at the end of the billing period. 
                          You can reactivate it from the billing portal.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Card className="border-dashed">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Need to make changes?</h4>
                      <p className="text-sm text-muted-foreground">
                        Update payment method, pause, or cancel subscriptions
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleManageSubscription} disabled={openingPortal}>
                      {openingPortal ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Open Billing Portal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};