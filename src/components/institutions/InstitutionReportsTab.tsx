import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, Calendar, BarChart3, CheckCircle2, Mail, Megaphone, Download, FileText 
} from 'lucide-react';

interface InstitutionStats {
  totalStudents?: number;
  totalEnrollments?: number;
  totalCertificates?: number;
  totalCompletedCourses?: number;
  spectrogramProfiles?: number;
}

interface Student {
  status: string;
}

interface InstitutionReportsTabProps {
  stats: InstitutionStats | undefined;
  students: Student[];
  eventsCount: number;
  announcementsCount: number;
  onExport: () => void;
}

export const InstitutionReportsTab = ({
  stats,
  students,
  eventsCount,
  announcementsCount,
  onExport,
}: InstitutionReportsTabProps) => {
  const activeStudents = students.filter(s => s.status === 'active').length;
  const pendingStudents = students.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Institution Report</h3>
          <p className="text-sm text-muted-foreground">
            Export comprehensive data about institution activity
          </p>
        </div>
        <Button onClick={onExport} className="rounded-full">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Total Students
              </TableCell>
              <TableCell className="text-right">{stats?.totalStudents || 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Active Students
              </TableCell>
              <TableCell className="text-right">{activeStudents}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Pending Invitations
              </TableCell>
              <TableCell className="text-right">{pendingStudents}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Course Enrollments
              </TableCell>
              <TableCell className="text-right">{stats?.totalEnrollments || 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Courses Completed
              </TableCell>
              <TableCell className="text-right">{stats?.totalCompletedCourses || 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Certificates Issued
              </TableCell>
              <TableCell className="text-right">{stats?.totalCertificates || 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Talent Profiles Created
              </TableCell>
              <TableCell className="text-right">{stats?.spectrogramProfiles || 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Events Created
              </TableCell>
              <TableCell className="text-right">{eventsCount}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                Announcements Made
              </TableCell>
              <TableCell className="text-right">{announcementsCount}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
