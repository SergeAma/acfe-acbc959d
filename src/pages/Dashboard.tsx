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

  // Mentors see the full MentorDashboard for analytics
  // Non-admin mentors can view but not create courses (handled in ContentSubmissionCard)

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

  // For students: only hard-redirect for agreement, not profile completion.
  // Profile completion is handled by OnboardingBanner on the dashboard itself.
  if (dashboardRole === 'student' && !isActualAdmin) {
    if (isProfileComplete && hasSignedAgreement === false) {
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