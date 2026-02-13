import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export type ProfileFrame = 'none' | 'hiring' | 'open_to_work' | 'looking_for_cofounder';
export type SimulatableRole = 'admin' | 'mentor' | 'student' | 'institution_moderator' | null;

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'mentor' | 'student';
  bio: string | null;
  avatar_url: string | null;
  profile_frame: ProfileFrame;
  country: string | null;
  university: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  github_url: string | null;
  website_url: string | null;
  welcome_email_sent_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Role simulation for admins
  simulatedRole: SimulatableRole;
  setSimulatedRole: (role: SimulatableRole) => void;
  effectiveRole: 'admin' | 'mentor' | 'student';
  isSimulating: boolean;
  isActualAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRoleState] = useState<SimulatableRole>(null);
  const { toast } = useToast();
  
  // Track last profile fetch to prevent rapid re-fetches
  const lastProfileFetchRef = React.useRef<{ userId: string; timestamp: number } | null>(null);
  const profileFetchInProgressRef = React.useRef<string | null>(null);

  // Check if user is actually an admin (not simulated)
  const isActualAdmin = profile?.role === 'admin';

  // Only admins can set a simulated role
  const setSimulatedRole = (role: SimulatableRole) => {
    if (!isActualAdmin) {
      console.warn('Only admins can simulate roles');
      return;
    }
    setSimulatedRoleState(role);
    if (role) {
      toast({
        title: `Viewing as ${role === 'institution_moderator' ? 'Institution Moderator' : role.charAt(0).toUpperCase() + role.slice(1)}`,
        description: 'You are now viewing the app as this role. Click the role switcher to exit.',
      });
    } else {
      toast({
        title: 'Returned to Admin View',
        description: 'You are now viewing as your actual admin role.',
      });
    }
  };

  // Effective role considers simulation (for UI purposes only)
  const effectiveRole: 'admin' | 'mentor' | 'student' = 
    isActualAdmin && simulatedRole && simulatedRole !== 'institution_moderator' 
      ? simulatedRole 
      : (profile?.role || 'student');

  const isSimulating = isActualAdmin && simulatedRole !== null;

  const fetchProfile = async (userId: string, force = false) => {
    // Prevent duplicate/rapid fetches for the same user
    const now = Date.now();
    const lastFetch = lastProfileFetchRef.current;
    
    if (!force && lastFetch && lastFetch.userId === userId && (now - lastFetch.timestamp) < 5000) {
      return profile; // Return existing profile
    }
    
    // Prevent concurrent fetches for the same user
    if (profileFetchInProgressRef.current === userId) {
      return null;
    }
    
    profileFetchInProgressRef.current = userId;
    
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        return null;
      }

      // Fetch ALL roles from user_roles table (source of truth)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      // Determine highest-priority role: admin > mentor > student
      let role: 'admin' | 'mentor' | 'student' = profileData.role || 'student';
      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(r => r.role);
        if (roles.includes('admin')) {
          role = 'admin';
        } else if (roles.includes('mentor')) {
          role = 'mentor';
        } else if (roles.includes('student')) {
          role = 'student';
        }
      }

      lastProfileFetchRef.current = { userId, timestamp: Date.now() };

      return {
        ...profileData,
        role: role as 'admin' | 'mentor' | 'student',
        profile_frame: (profileData.profile_frame as ProfileFrame) || 'none'
      };
    } catch {
      return null;
    } finally {
      profileFetchInProgressRef.current = null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, true);
      if (profileData) setProfile(profileData);
    }
  };

  // Set up auth state listener ONCE
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setSimulatedRoleState(null);
          lastProfileFetchRef.current = null;
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (event === 'SIGNED_IN' && currentSession?.user) {
            setTimeout(async () => {
              if (mounted) {
                const profileData = await fetchProfile(currentSession.user.id);
                if (mounted && profileData) setProfile(profileData);
              }
            }, 100);
          }
          
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession }, error: sessionError }) => {
      if (!mounted) return;
      
      if (sessionError) {
        setLoading(false);
        return;
      }

      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        const profileData = await fetchProfile(existingSession.user.id);
        if (mounted && profileData) setProfile(profileData);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    setSimulatedRoleState(null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    toast({
      title: "Signed out",
      description: "You've been successfully signed out",
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signOut, 
      refreshProfile, 
      simulatedRole,
      setSimulatedRole,
      effectiveRole,
      isSimulating,
      isActualAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
