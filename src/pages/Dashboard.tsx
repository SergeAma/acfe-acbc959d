import { useAuth } from '@/contexts/AuthContext';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { MentorDashboard } from '@/components/dashboard/MentorDashboard';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useMentorContract } from '@/hooks/useMentorContract';
import { useLearnerAgreement } from '@/hooks/useLearnerAgreement';
import { useSessionTracking } from '@/hooks/useSessionTracking';

export const Dashboard = () => {
  const { user, profile, loading, isActualAdmin, effectiveRole, isSimulating } = useAuth();
  const { hasSignedContract, loading: contractLoading } = useMentorContract(user?.id);
  const { hasSignedAgreement, isLoading: agreementLoading, isProfileComplete } = useLearnerAgreement();
  
  // Track session for login sharing prevention
  useSessionTracking(user?.id);

  if (loading || contractLoading || agreementLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // CRITICAL: Mentors (contributors) are redirected to submission page only
  // Admins are exempt - they can access the full dashboard
  if (profile?.role === 'mentor' && !isActualAdmin) {
    return <Navigate to="/contributor/submit" replace />;
  }

  // Determine which dashboard to show
  // Admins see MentorDashboard by default (they are also mentors)
  // When simulating, show dashboard based on simulated role
  const dashboardRole = isActualAdmin 
    ? (isSimulating ? effectiveRole : 'mentor') 
    : effectiveRole;

  // Redirect mentors who haven't signed contract (unless they're an admin)
  if (dashboardRole === 'mentor' && !isActualAdmin && hasSignedContract === false) {
    return <Navigate to="/mentor-contract" replace />;
  }

  // For students: first check profile completion, then agreement
  if (dashboardRole === 'student' && !isActualAdmin) {
    // If profile incomplete, redirect to profile page
    if (!isProfileComplete) {
      return <Navigate to="/profile" replace />;
    }
    // If profile complete but agreement not signed, redirect to agreement
    if (hasSignedAgreement === false) {
      return <Navigate to="/learner-agreement" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Dashboard" }]} />
      <div className="container mx-auto px-4 py-4">
        {dashboardRole === 'student' ? <StudentDashboard /> : <MentorDashboard />}
      </div>
    </div>
  );
};