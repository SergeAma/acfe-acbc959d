import { Users, Calendar, BarChart3, CheckCircle2 } from 'lucide-react';

interface InstitutionStats {
  totalStudents?: number;
  totalEnrollments?: number;
  totalCertificates?: number;
  totalCompletedCourses?: number;
  spectrogramProfiles?: number;
}

interface InstitutionOverviewProps {
  activeStudents: number;
  pendingInvites: number;
  stats: InstitutionStats | undefined;
}

export const InstitutionOverview = ({ activeStudents, pendingInvites, stats }: InstitutionOverviewProps) => {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-4 rounded-lg bg-muted/50 text-center">
        <div className="text-2xl font-bold">{activeStudents}</div>
        <div className="text-xs text-muted-foreground">Active Students</div>
      </div>
      <div className="p-4 rounded-lg bg-amber-500/10 text-center">
        <div className="text-2xl font-bold text-amber-600">{pendingInvites}</div>
        <div className="text-xs text-muted-foreground">Pending Invites</div>
      </div>
      <div className="p-4 rounded-lg bg-muted/50 text-center">
        <div className="text-2xl font-bold">{stats?.totalEnrollments || 0}</div>
        <div className="text-xs text-muted-foreground">Course Enrollments</div>
      </div>
      <div className="p-4 rounded-lg bg-muted/50 text-center">
        <div className="text-2xl font-bold">{stats?.totalCertificates || 0}</div>
        <div className="text-xs text-muted-foreground">Certificates Issued</div>
      </div>
      <div className="p-4 rounded-lg bg-muted/50 text-center">
        <div className="text-2xl font-bold">{stats?.totalCompletedCourses || 0}</div>
        <div className="text-xs text-muted-foreground">Courses Completed</div>
      </div>
      <div className="p-4 rounded-lg bg-muted/50 text-center">
        <div className="text-2xl font-bold">{stats?.spectrogramProfiles || 0}</div>
        <div className="text-xs text-muted-foreground">Talent Profiles</div>
      </div>
    </div>
  );
};
