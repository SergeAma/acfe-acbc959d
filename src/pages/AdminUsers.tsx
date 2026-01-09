import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, ArrowLeft, User, Mail, Calendar, Search, ChevronLeft, ChevronRight, 
  Download, UserX, UserCheck, Users, Eye, FileSignature
} from 'lucide-react';
import { MentorAgreementStatus } from '@/components/mentor/MentorAgreementCard';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserStatusManager } from '@/components/admin/UserStatusManager';
import { StudentProfileDialog } from '@/components/admin/StudentProfileDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  country: string | null;
  account_status: string;
  avatar_url: string | null;
}

interface MentorContract {
  mentor_id: string;
  signature_name: string;
  signature_date: string;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const AdminUsers = () => {
  const { profile, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [mentorContracts, setMentorContracts] = useState<Map<string, MentorContract>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'suspend' | 'activate' | 'delete' | null;
  }>({ open: false, action: null });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ email: string; id: string } | null>(null);
  
  const filter = searchParams.get('filter') || 'all';

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    
    const [usersResult, contractsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at, country, account_status, avatar_url')
        .order('created_at', { ascending: false }),
      supabase
        .from('mentor_contracts')
        .select('mentor_id, signature_name, signature_date')
    ]);

    if (usersResult.error) {
      toast({
        title: "Error fetching users",
        description: usersResult.error.message,
        variant: "destructive",
      });
    } else {
      setUsers(usersResult.data || []);
    }

    if (contractsResult.data) {
      const contractsMap = new Map<string, MentorContract>();
      contractsResult.data.forEach((c) => {
        contractsMap.set(c.mentor_id, c);
      });
      setMentorContracts(contractsMap);
    }
    
    setLoading(false);
  };

  // Export users to CSV
  const exportToCSV = () => {
    const dataToExport = selectedUsers.size > 0 
      ? searchFilteredUsers.filter(u => selectedUsers.has(u.id))
      : searchFilteredUsers;
    
    const headers = ['Name', 'Email', 'Role', 'Country', 'Status', 'Joined'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(user => [
        `"${user.full_name || 'Unknown'}"`,
        `"${user.email}"`,
        user.role,
        `"${user.country || 'N/A'}"`,
        user.account_status,
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export complete',
      description: `Exported ${dataToExport.length} users to CSV.`,
    });
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedUsers.size === 0) return;
    
    setBulkActionLoading(true);
    const userIds = Array.from(selectedUsers);
    
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .in('id', userIds);
    
    if (error) {
      toast({
        title: 'Bulk action failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bulk action complete',
        description: `Updated ${userIds.length} users to ${newStatus} status.`,
      });
      setSelectedUsers(new Set());
      fetchUsers();
    }
    
    setBulkActionLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Select all visible users
  const toggleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  // Select all filtered users
  const selectAllFiltered = () => {
    setSelectedUsers(new Set(searchFilteredUsers.map(u => u.id)));
  };

  // Filter by role
  const roleFilteredUsers = filter === 'all' 
    ? users 
    : users.filter(u => u.role === filter);

  // Filter by search query
  const searchFilteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return roleFilteredUsers;
    const query = searchQuery.toLowerCase();
    return roleFilteredUsers.filter(u => 
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.country?.toLowerCase().includes(query)
    );
  }, [roleFilteredUsers, searchQuery]);

  // Pagination calculations
  const totalItems = searchFilteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = searchFilteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers(new Set());
  }, [filter, searchQuery, itemsPerPage]);

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
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {filter === 'mentor' ? 'Manage Mentors' : filter === 'student' ? 'Manage Students' : 'All Users'}
            </h1>
            <p className="text-muted-foreground">View and manage platform users</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{users.length}</div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {users.filter(u => u.role === 'mentor').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Mentors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {users.filter(u => u.role === 'student').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={filter} onValueChange={(value) => setSearchParams({ filter: value })} className="flex-shrink-0">
              <TabsList>
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="mentor">Mentors</TabsTrigger>
                <TabsTrigger value="student">Students</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedUsers.size > 0 ? `(${selectedUsers.size})` : 'All'}
              </Button>
              
              {selectedUsers.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" disabled={bulkActionLoading}>
                      {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Users className="h-4 w-4 mr-2" />
                      Bulk Actions ({selectedUsers.size})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, action: 'activate' })}>
                      <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                      Activate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, action: 'suspend' })}>
                      <UserX className="h-4 w-4 mr-2 text-yellow-600" />
                      Suspend Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setConfirmDialog({ open: true, action: 'delete' })}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Mark as Deleted
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Selection info bar */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border">
              <span className="text-sm font-medium">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              {selectedUsers.size < searchFilteredUsers.length && (
                <Button variant="link" size="sm" className="h-auto p-0" onClick={selectAllFiltered}>
                  Select all {searchFilteredUsers.length} filtered users
                </Button>
              )}
              <Button variant="link" size="sm" className="h-auto p-0 ml-auto" onClick={() => setSelectedUsers(new Set())}>
                Clear selection
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedUsers.length > 0 && selectedUsers.size === paginatedUsers.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      {filter === 'mentor' && <TableHead>Agreement</TableHead>}
                      <TableHead>Country</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status & Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={filter === 'mentor' ? 8 : 7} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => (
                        <TableRow key={u.id} className={selectedUsers.has(u.id) ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.has(u.id)}
                              onCheckedChange={() => toggleUserSelection(u.id)}
                              aria-label={`Select ${u.full_name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar_url || ''} alt={u.full_name || 'User'} />
                                <AvatarFallback className="text-xs">
                                  {u.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {u.full_name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {u.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'mentor' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          {filter === 'mentor' && (
                            <TableCell>
                              {(() => {
                                const contract = mentorContracts.get(u.id);
                                return (
                                  <MentorAgreementStatus
                                    hasSigned={!!contract}
                                    signatureName={contract?.signature_name}
                                    signatureDate={contract?.signature_date}
                                  />
                                );
                              })()}
                            </TableCell>
                          )}
                          <TableCell>{u.country || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(u.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserStatusManager
                                userId={u.id}
                                userName={u.full_name || 'Unknown'}
                                currentRole={u.role}
                                currentStatus={u.account_status || 'active'}
                                onUpdate={fetchUsers}
                              />
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedProfileUser({ email: u.email, id: u.id });
                                        setProfileDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Quick View Profile</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => setItemsPerPage(Number(value))}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                  <span className="ml-2">
                    ({startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'activate' && 'Activate Selected Users'}
              {confirmDialog.action === 'suspend' && 'Suspend Selected Users'}
              {confirmDialog.action === 'delete' && 'Mark Users as Deleted'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'activate' && (
                <>Are you sure you want to activate {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}? They will regain access to the platform.</>
              )}
              {confirmDialog.action === 'suspend' && (
                <>Are you sure you want to suspend {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}? They will temporarily lose access to the platform.</>
              )}
              {confirmDialog.action === 'delete' && (
                <>Are you sure you want to mark {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} as deleted? This action can be reversed by changing their status back to active.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.action === 'activate') handleBulkStatusUpdate('active');
                if (confirmDialog.action === 'suspend') handleBulkStatusUpdate('paused');
                if (confirmDialog.action === 'delete') handleBulkStatusUpdate('deleted');
              }}
              className={confirmDialog.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialog.action === 'activate' && 'Activate'}
              {confirmDialog.action === 'suspend' && 'Suspend'}
              {confirmDialog.action === 'delete' && 'Mark as Deleted'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Profile Quick View Dialog */}
      {selectedProfileUser && (
        <StudentProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          studentEmail={selectedProfileUser.email}
          studentUserId={selectedProfileUser.id}
        />
      )}
    </div>
  );
};
