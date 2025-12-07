import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Trash2, Mail, Clock, CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { InviteMentorDialog } from "@/components/admin/InviteMentorDialog";

interface MentorInvitation {
  id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invited_by: string;
}

export default function AdminMentorInvitations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState<MentorInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && profile?.role !== "mentor") {
      fetchInvitations();
    }
  }, [authLoading, profile]);

  const fetchInvitations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mentor_invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive",
      });
    } else {
      // Update expired status for pending invitations
      const updatedData = (data || []).map((inv) => {
        if (inv.status === "pending" && isPast(new Date(inv.expires_at))) {
          return { ...inv, status: "expired" };
        }
        return inv;
      });
      setInvitations(updatedData);
    }
    setLoading(false);
  };

  const handleResend = async (invitation: MentorInvitation) => {
    setActionLoading(invitation.id);
    try {
      // First revoke the old invitation
      await supabase
        .from("mentor_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      // Send a new invitation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-mentor-invitation", {
        body: { email: invitation.email },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to resend invitation");
      }

      toast({
        title: "Invitation resent",
        description: `New invitation sent to ${invitation.email}`,
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!invitationToDelete) return;

    setActionLoading(invitationToDelete);
    try {
      const { error } = await supabase
        .from("mentor_invitations")
        .delete()
        .eq("id", invitationToDelete);

      if (error) throw error;

      toast({
        title: "Invitation revoked",
        description: "The invitation has been removed",
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Failed to revoke",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    }
  };

  const getStatusBadge = (invitation: MentorInvitation) => {
    const isExpired = invitation.status === "pending" && isPast(new Date(invitation.expires_at));
    const status = isExpired ? "expired" : invitation.status;

    switch (status) {
      case "pending":
        const daysLeft = differenceInDays(new Date(invitation.expires_at), new Date());
        const isExpiringSoon = daysLeft <= 2;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
            {isExpiringSoon && (
              <Badge variant="destructive" className="text-xs">
                Expires in {daysLeft <= 0 ? "< 1 day" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
              </Badge>
            )}
          </div>
        );
      case "accepted":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    const isExpired = inv.status === "pending" && isPast(new Date(inv.expires_at));
    const effectiveStatus = isExpired ? "expired" : inv.status;

    if (filter === "all") return true;
    return effectiveStatus === filter;
  });

  const stats = {
    total: invitations.length,
    pending: invitations.filter((i) => i.status === "pending" && !isPast(new Date(i.expires_at))).length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
    expired: invitations.filter((i) => i.status === "expired" || (i.status === "pending" && isPast(new Date(i.expires_at)))).length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Mentor Invitations</h1>
            <p className="text-muted-foreground">Manage mentor invitation requests</p>
          </div>
          <InviteMentorDialog />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Accepted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invitations
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={setFilter} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
                <TabsTrigger value="expired">Expired ({stats.expired})</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invitations found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map((invitation) => {
                    const isExpired = invitation.status === "pending" && isPast(new Date(invitation.expires_at));
                    const effectiveStatus = isExpired ? "expired" : invitation.status;

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{getStatusBadge(invitation)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invitation.status === "accepted"
                            ? format(new Date(invitation.accepted_at!), "MMM d, yyyy")
                            : format(new Date(invitation.expires_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {effectiveStatus !== "accepted" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResend(invitation)}
                                disabled={actionLoading === invitation.id}
                              >
                                {actionLoading === invitation.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Resend
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setInvitationToDelete(invitation.id);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={actionLoading === invitation.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? The recipient will no longer be able to use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
