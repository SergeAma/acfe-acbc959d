import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'mentor' | 'student';
  /** If true, redirects mentors (contributors) to their submission page */
  enforceContributorIsolation?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  enforceContributorIsolation = false 
}: ProtectedRouteProps) => {
  const { user, profile, loading, effectiveRole, isActualAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Enforce contributor (mentor) isolation - they can only access submission page
  // Admins are exempt from this restriction
  if (enforceContributorIsolation && profile?.role === 'mentor' && !isActualAdmin) {
    return <Navigate to="/contributor/submit" replace />;
  }

  // Admins can always access all routes (they might be simulating a role)
  // This ensures admins can test any page regardless of simulated role
  if (requiredRole && !isActualAdmin && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
