import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, Heart, Search, Mail, TrendingUp, Users, DollarSign, 
  Send, RefreshCw, ArrowLeft
} from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Donation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  is_recurring: boolean;
  company: string | null;
  reason: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export const AdminDonors = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [selectedDonor, setSelectedDonor] = useState<Donation | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDonations();
    }
  }, [profile]);

  const fetchDonations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching donations",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDonations(data || []);
    }
    setLoading(false);
  };

  const sendReportEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both subject and content",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    
    try {
      const activeDonors = donations.filter(d => d.status === 'active');
      
      const { error } = await supabase.functions.invoke('send-donor-report', {
        body: {
          subject: emailSubject,
          content: emailContent,
          donors: activeDonors.map(d => ({
            email: d.email,
            firstName: d.first_name,
            lastName: d.last_name,
          })),
        },
      });

      if (error) throw error;

      toast({
        title: "Report sent",
        description: `Email sent to ${activeDonors.length} active donors`,
      });
      setEmailDialogOpen(false);
      setEmailSubject('');
      setEmailContent('');
    } catch (error: any) {
      toast({
        title: "Failed to send report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredDonations = donations.filter(donation =>
    donation.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    donation.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    donation.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDonors = donations.filter(d => d.status === 'active');
  const totalMonthlyRevenue = activeDonors.reduce((sum, d) => sum + d.amount_cents, 0);
  const averageDonation = activeDonors.length > 0 ? totalMonthlyRevenue / activeDonors.length : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-secondary/20 text-secondary border-0">Active</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Donor Management</h1>
            <p className="text-muted-foreground">Track and engage with your supporters</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Donors</p>
                  <p className="text-2xl font-bold">{donations.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-secondary/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Donors</p>
                  <p className="text-2xl font-bold">{activeDonors.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/20">
                  <Heart className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-500/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold">${(totalMonthlyRevenue / 100).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-blue-500/10 via-card to-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg. Donation</p>
                  <p className="text-2xl font-bold">${(averageDonation / 100).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search donors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDonations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setEmailDialogOpen(true)} disabled={activeDonors.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send Report to Donors
            </Button>
          </div>
        </div>

        {/* Donors Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Donations</CardTitle>
            <CardDescription>Track donation history and donor information</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No donations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDonations.map((donation) => (
                      <TableRow 
                        key={donation.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedDonor(donation)}
                      >
                        <TableCell className="font-medium">
                          {donation.first_name} {donation.last_name}
                        </TableCell>
                        <TableCell>{donation.email}</TableCell>
                        <TableCell>
                          ${(donation.amount_cents / 100).toFixed(2)}{donation.is_recurring ? '/mo' : ''}
                        </TableCell>
                        <TableCell>{getStatusBadge(donation.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(donation.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Report Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Report to Donors
            </DialogTitle>
            <DialogDescription>
              This email will be sent to {activeDonors.length} active donor{activeDonors.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="ACFE Impact Update - December 2025"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                placeholder="Share updates about how donations are making an impact..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendReportEmail} disabled={sendingEmail}>
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {activeDonors.length} Donors
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Donor Detail Dialog */}
      <Dialog open={!!selectedDonor} onOpenChange={(open) => !open && setSelectedDonor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Donor Profile</DialogTitle>
            <DialogDescription>
              Complete donor information
            </DialogDescription>
          </DialogHeader>
          
          {selectedDonor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Full Name</Label>
                  <p className="font-medium">{selectedDonor.first_name} {selectedDonor.last_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedDonor.status)}</div>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="font-medium">{selectedDonor.email}</p>
              </div>
              
              {selectedDonor.company && (
                <div>
                  <Label className="text-muted-foreground text-xs">Company</Label>
                  <p className="font-medium">{selectedDonor.company}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Amount</Label>
                  <p className="font-medium text-lg">
                    ${(selectedDonor.amount_cents / 100).toFixed(2)}
                    {selectedDonor.is_recurring && <span className="text-sm text-muted-foreground">/mo</span>}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <p className="font-medium">{selectedDonor.is_recurring ? 'Recurring' : 'One-time'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-xs">Date</Label>
                <p className="font-medium">{format(new Date(selectedDonor.created_at), 'MMMM d, yyyy')}</p>
              </div>
              
              {selectedDonor.reason && (
                <div>
                  <Label className="text-muted-foreground text-xs">Reason for Supporting</Label>
                  <p className="text-sm bg-muted/50 p-3 rounded-md mt-1">{selectedDonor.reason}</p>
                </div>
              )}
              
              {selectedDonor.stripe_customer_id && (
                <div>
                  <Label className="text-muted-foreground text-xs">Stripe Customer ID</Label>
                  <p className="font-mono text-xs text-muted-foreground">{selectedDonor.stripe_customer_id}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDonor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
