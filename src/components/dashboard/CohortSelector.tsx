import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2 } from 'lucide-react';

interface InstitutionCohort {
  id: string;
  name: string;
  institution_id: string;
  institution: {
    name: string;
    logo_url: string | null;
  };
}

interface CohortSelectorProps {
  selectedCohort: 'general' | string;
  onCohortChange: (cohortId: 'general' | string) => void;
}

export const CohortSelector = ({ selectedCohort, onCohortChange }: CohortSelectorProps) => {
  const { user } = useAuth();

  // Fetch mentor's institution cohorts
  const { data: institutionCohorts } = useQuery({
    queryKey: ['mentor-institution-cohorts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('institution_cohorts')
        .select(`
          id,
          name,
          institution_id,
          institutions!inner (
            name,
            logo_url
          )
        `)
        .eq('mentor_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return (data || []).map(cohort => ({
        id: cohort.id,
        name: cohort.name,
        institution_id: cohort.institution_id,
        institution: {
          name: (cohort.institutions as any).name,
          logo_url: (cohort.institutions as any).logo_url,
        }
      })) as InstitutionCohort[];
    },
    enabled: !!user,
  });

  const hasInstitutionCohorts = institutionCohorts && institutionCohorts.length > 0;

  if (!hasInstitutionCohorts) {
    return null;
  }

  return (
    <Select value={selectedCohort} onValueChange={onCohortChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select cohort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="general">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>General Cohort</span>
          </div>
        </SelectItem>
        {institutionCohorts?.map((cohort) => (
          <SelectItem key={cohort.id} value={cohort.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span>{cohort.institution.name} Cohort</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
