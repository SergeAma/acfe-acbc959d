import { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, Mail, CheckCircle2, XCircle, RotateCcw, Send, Ban, Eye 
} from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  id: string;
  email: string;
  status: string;
  invited_at: string | null;
  joined_at: string | null;
  user_id: string | null;
}

interface InstitutionStudentsTabProps {
  students: Student[];
  studentsLoading: boolean;
  institutionName: string;
  isInviteDialogOpen: boolean;
  setIsInviteDialogOpen: (open: boolean) => void;
  inviteEmails: string;
  setInviteEmails: (emails: string) => void;
  onInvite: (emails: string[]) => void;
  isInviting: boolean;
  onResend: (email: string) => void;
  onRevoke: (studentId: string) => void;
  onReinstate: (studentId: string) => void;
  onViewProfile: (email: string, userId: string | null) => void;
}

export const InstitutionStudentsTab = ({
  students,
  studentsLoading,
  institutionName,
  isInviteDialogOpen,
  setIsInviteDialogOpen,
  inviteEmails,
  setInviteEmails,
  onInvite,
  isInviting,
  onResend,
  onRevoke,
  onReinstate,
  onViewProfile,
}: InstitutionStudentsTabProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>;
      case 'revoked':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Revoked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Mail className="h-4 w-4 mr-2" />
              Invite Students
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Students</DialogTitle>
              <DialogDescription>
                Enter email addresses (one per line) to invite students to {institutionName}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="student1@university.edu&#10;student2@university.edu"
              className="min-h-[150px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const emails = inviteEmails.split('\n').map(e => e.trim()).filter(Boolean);
                  if (emails.length > 0) {
                    onInvite(emails);
                  }
                }}
                disabled={isInviting}
              >
                {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentsLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No students invited yet
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.email}</TableCell>
                <TableCell>{getStatusBadge(student.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {student.invited_at ? format(new Date(student.invited_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {student.joined_at ? format(new Date(student.joined_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {student.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResend(student.email)}
                        title="Resend invitation"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {student.status === 'active' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewProfile(student.email, student.user_id)}
                          title="View profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRevoke(student.id)}
                          title="Revoke access"
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    {student.status === 'revoked' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReinstate(student.id)}
                        title="Reinstate access"
                      >
                        <RotateCcw className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
};
