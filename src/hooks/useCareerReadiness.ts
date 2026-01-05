import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CareerReadinessData {
  totalCourses: number;
  completedCourses: number;
  certificates: number;
  assignmentsSubmitted: number;
  quizzesPassed: number;
  spectrogramProfileCreated: boolean;
  isCareerReady: boolean;
}

export const useCareerReadiness = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['career-readiness', user?.id],
    queryFn: async (): Promise<CareerReadinessData> => {
      if (!user) {
        return {
          totalCourses: 0,
          completedCourses: 0,
          certificates: 0,
          assignmentsSubmitted: 0,
          quizzesPassed: 0,
          spectrogramProfileCreated: false,
          isCareerReady: false,
        };
      }

      // Fetch enrollments with progress
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, progress')
        .eq('student_id', user.id);

      const totalCourses = enrollments?.length || 0;
      const completedCourses = enrollments?.filter(e => e.progress === 100).length || 0;

      // Fetch certificates
      const { data: certificates } = await supabase
        .from('course_certificates')
        .select('id, spectrogram_profile_created')
        .eq('student_id', user.id);

      const certificateCount = certificates?.length || 0;
      const spectrogramProfileCreated = certificates?.some(c => c.spectrogram_profile_created) || false;

      // Fetch assignment submissions
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('id, status')
        .eq('student_id', user.id)
        .eq('status', 'approved');

      const assignmentsSubmitted = submissions?.length || 0;

      // Fetch quiz attempts
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('id, passed')
        .eq('student_id', user.id)
        .eq('passed', true);

      const quizzesPassed = quizAttempts?.length || 0;

      // Determine career readiness (at least 1 completed course, 1 certificate, OR spectrogram profile)
      const isCareerReady = completedCourses >= 1 && certificateCount >= 1;

      return {
        totalCourses,
        completedCourses,
        certificates: certificateCount,
        assignmentsSubmitted,
        quizzesPassed,
        spectrogramProfileCreated,
        isCareerReady,
      };
    },
    enabled: !!user,
  });
};

// Get aggregated institution data for admin reporting
export const useInstitutionStats = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: ['institution-stats', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;

      // Get all students in the institution
      const { data: students } = await supabase
        .from('institution_students')
        .select('user_id')
        .eq('institution_id', institutionId)
        .eq('status', 'active');

      if (!students?.length) {
        return {
          totalStudents: 0,
          totalEnrollments: 0,
          totalCertificates: 0,
          totalCompletedCourses: 0,
          spectrogramProfiles: 0,
        };
      }

      const userIds = students.map(s => s.user_id).filter(Boolean) as string[];

      // Get enrollment counts
      const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('student_id', userIds);

      // Get completed courses
      const { count: completedCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('student_id', userIds)
        .eq('progress', 100);

      // Get certificates
      const { data: certs } = await supabase
        .from('course_certificates')
        .select('spectrogram_profile_created')
        .in('student_id', userIds);

      return {
        totalStudents: students.length,
        totalEnrollments: enrollmentCount || 0,
        totalCertificates: certs?.length || 0,
        totalCompletedCourses: completedCount || 0,
        spectrogramProfiles: certs?.filter(c => c.spectrogram_profile_created).length || 0,
      };
    },
    enabled: !!institutionId,
  });
};
