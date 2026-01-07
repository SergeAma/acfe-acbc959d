import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { MentorDashboard } from '@/components/dashboard/MentorDashboard';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useMentorContract } from '@/hooks/useMentorContract';

export const AdminMentorView = () => {
  const { user, profile, loading } = useAuth();
  const { hasSignedContract, loading: contractLoading } = useMentorContract(user?.id);

  if (loading || contractLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only admins can access this page
  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Mentor View" }]} />
      <div className="container mx-auto px-4 py-4">
        <MentorDashboard />
      </div>
    </div>
  );
};
