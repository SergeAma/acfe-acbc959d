import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  email_domain: string | null;
  description: string | null;
  is_active: boolean;
}

export interface InstitutionMembership {
  institution_id: string;
  institution_name: string;
  institution_slug: string;
  institution_logo: string | null;
}

export const useUserInstitutions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-institutions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .rpc('get_user_institutions', { _user_id: user.id });
      
      if (error) throw error;
      return data as InstitutionMembership[];
    },
    enabled: !!user,
  });
};

export const useInstitutionBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['institution', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data as Institution;
    },
    enabled: !!slug,
  });
};

export const useInstitutionMembership = (institutionId: string | undefined) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['institution-membership', institutionId, user?.id],
    queryFn: async () => {
      if (!user || !institutionId) return null;
      
      // First check for active membership by user_id
      const { data: activeMembership, error: activeError } = await supabase
        .from('institution_students')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (activeError) throw activeError;
      if (activeMembership) return activeMembership;
      
      // If no active membership, check for pending invitation by email
      // This grants access to invited users even before claim completes
      if (profile?.email) {
        const { data: pendingInvite, error: pendingError } = await supabase
          .from('institution_students')
          .select('*')
          .eq('institution_id', institutionId)
          .ilike('email', profile.email)
          .eq('status', 'pending')
          .maybeSingle();
        
        if (pendingError) throw pendingError;
        return pendingInvite;
      }
      
      return null;
    },
    enabled: !!user && !!institutionId,
  });
};

export const useInstitutionEvents = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: ['institution-events', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from('institution_events')
        .select('*')
        .eq('institution_id', institutionId)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!institutionId,
  });
};

export const useInstitutionAnnouncements = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: ['institution-announcements', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from('institution_announcements')
        .select('*')
        .eq('institution_id', institutionId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!institutionId,
  });
};

export const useInstitutionThreads = (institutionId: string | undefined) => {
  return useQuery({
    queryKey: ['institution-threads', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from('institution_threads')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!institutionId,
  });
};

export const useAllInstitutions = () => {
  return useQuery({
    queryKey: ['all-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Institution[];
    },
  });
};
