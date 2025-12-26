import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserCog, RefreshCw } from 'lucide-react';

interface UserStatusManagerProps {
  userId: string;
  userName: string;
  currentRole: string;
  currentStatus: string;
  onUpdate: () => void;
}

export const UserStatusManager = ({
  userId,
  userName,
  currentRole,
  currentStatus,
  onUpdate,
}: UserStatusManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reinstating, setReinstating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleReinstateAsMentor = async () => {
    if (!user?.id) return;
    
    setReinstating(true);
    const { error } = await supabase.rpc('reinstate_mentor', {
      _admin_id: user.id,
      _user_id: userId,
    });

    if (error) {
      toast({
        title: 'Failed to reinstate mentor',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Mentor reinstated',
        description: `${userName} has been reinstated as a mentor.`,
      });
      onUpdate();
    }
    setReinstating(false);
  };

  const handleStatusChange = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: selectedStatus })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status updated',
        description: `${userName}'s status has been updated to ${selectedStatus}.`,
      });
      setOpen(false);
      onUpdate();
    }
    setLoading(false);
  };

  const showReinstateButton = currentStatus !== 'active' || currentRole === 'student';
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusBadgeVariant(currentStatus)}>
        {currentStatus}
      </Badge>
      
      {showReinstateButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReinstateAsMentor}
          disabled={reinstating}
          className="text-xs"
        >
          {reinstating ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Reinstate as Mentor
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <UserCog className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Status</DialogTitle>
            <DialogDescription>
              Update account status for {userName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
