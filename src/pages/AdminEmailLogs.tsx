import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle, XCircle, Eye, MousePointer, RefreshCw } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  subject: string;
  status: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  contact_id: string | null;
  template_id: string | null;
  sequence_id: string | null;
  contacts?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const AdminEmailLogs = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchLogs();
    }
  }, [profile]);

  const fetchLogs = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('email_logs')
      .select(`
        *,
        contacts (
          email,
          first_name,
          last_name
        )
      `)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "Error fetching email logs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLogs(data || []);
    }
    
    setLoading(false);
  };

  const getStatusBadge = (log: EmailLog) => {
    if (log.error_message) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
    }
    if (log.clicked_at) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><MousePointer className="h-3 w-3" />Clicked</Badge>;
    }
    if (log.opened_at) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><Eye className="h-3 w-3" />Opened</Badge>;
    }
    if (log.status === 'sent') {
      return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Sent</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Mail className="h-3 w-3" />Pending</Badge>;
  };

  const filteredLogs = statusFilter === 'all' 
    ? logs 
    : logs.filter(log => {
        if (statusFilter === 'failed') return log.error_message;
        if (statusFilter === 'clicked') return log.clicked_at;
        if (statusFilter === 'opened') return log.opened_at && !log.clicked_at;
        if (statusFilter === 'sent') return log.status === 'sent' && !log.opened_at;
        return true;
      });

  // Calculate stats
  const totalSent = logs.filter(l => l.status === 'sent').length;
  const totalOpened = logs.filter(l => l.opened_at).length;
  const totalClicked = logs.filter(l => l.clicked_at).length;
  const totalFailed = logs.filter(l => l.error_message).length;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Email Logs</h1>
            <p className="text-muted-foreground">Monitor all sent emails and their delivery status</p>
          </div>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{logs.length}</div>
              <p className="text-sm text-muted-foreground">Total Emails</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{totalSent}</div>
              <p className="text-sm text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{totalOpened}</div>
              <p className="text-sm text-muted-foreground">Opened</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">{totalClicked}</div>
              <p className="text-sm text-muted-foreground">Clicked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{openRate}%</div>
              <p className="text-sm text-muted-foreground">Open Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{totalFailed}</div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All emails" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Emails</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No email logs found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Opened At</TableHead>
                    <TableHead>Clicked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getStatusBadge(log)}</TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {log.subject}
                        {log.error_message && (
                          <p className="text-xs text-red-500 truncate">{log.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.contacts ? (
                          <div>
                            <p className="text-sm">{log.contacts.email}</p>
                            {(log.contacts.first_name || log.contacts.last_name) && (
                              <p className="text-xs text-muted-foreground">
                                {log.contacts.first_name} {log.contacts.last_name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.sent_at ? format(new Date(log.sent_at), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.opened_at ? format(new Date(log.opened_at), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.clicked_at ? format(new Date(log.clicked_at), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
