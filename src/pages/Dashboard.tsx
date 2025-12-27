import { useAuth } from '@/contexts/AuthContext';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { MentorDashboard } from '@/components/dashboard/MentorDashboard';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
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