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
  const { user, profile, loading, isActualAdmin } = useAuth();
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

  // Redirect admins to the admin dashboard
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Redirect mentors who haven't signed contract (unless they're an admin simulating)
  if (profile?.role === 'mentor' && !isActualAdmin && hasSignedContract === false) {
    return <Navigate to="/mentor-contract" replace />;
  }

  // For students: first check profile completion, then agreement
  if (profile?.role === 'student' && !isActualAdmin) {
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
        {profile?.role === 'student' ? <StudentDashboard /> : <MentorDashboard />}
      </div>
    </div>
  );
};