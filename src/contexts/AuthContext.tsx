import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export type ProfileFrame = 'none' | 'hiring' | 'open_to_work' | 'looking_for_cofounder';

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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, linkedinUrl?: string, wantsMentor?: boolean, university?: string, mentorBio?: string, portfolioLinks?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  
  // Track last profile fetch to prevent rapid re-fetches
  const lastProfileFetchRef = React.useRef<{ userId: string; timestamp: number } | null>(null);
  const profileFetchInProgressRef = React.useRef<string | null>(null);

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

      // Fetch role from user_roles table (source of truth)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Role error is non-fatal, we fall back to profile role

      // Use role from user_roles if available, fallback to profile role
      const role = roleData?.role || profileData.role;

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
      const profileData = await fetchProfile(user.id, true); // Force refresh
      if (profileData) setProfile(profileData);
    }
  };

  useEffect(() => {
    // Prevent re-initialization
    if (isInitialized) return;
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          if (mounted) {
            setLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (mounted && profileData) setProfile(profileData);
          }
          
          setLoading(false);
          setIsInitialized(true);
        }
      } catch {
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        // Only handle meaningful auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          lastProfileFetchRef.current = null;
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // Only fetch profile on SIGNED_IN, not on every token refresh
          if (event === 'SIGNED_IN' && currentSession?.user) {
            // Defer to prevent deadlock
            setTimeout(() => {
              if (mounted) {
                fetchProfile(currentSession.user.id).then(profileData => {
                  if (mounted && profileData) setProfile(profileData);
                });
              }
            }, 100);
          }
          
          setLoading(false);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isInitialized]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    // Successfully signed in - update state immediately
    if (data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      
      // Fetch profile immediately
      const profileData = await fetchProfile(data.user.id, true);
      if (profileData) setProfile(profileData);
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, linkedinUrl?: string, wantsMentor?: boolean, university?: string, mentorBio?: string, portfolioLinks?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: wantsMentor 
          ? "Welcome! Your mentor application will be reviewed by our team." 
          : "Welcome to A Cloud for Everyone. All users start as learners.",
      });
      
      // Update profile with LinkedIn URL and university if provided
      if (data.user && (linkedinUrl || university)) {
        const updateData: Record<string, string> = {};
        if (linkedinUrl) updateData.linkedin_url = linkedinUrl;
        if (university) updateData.university = university;
        
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', data.user.id);
      }

      // If user wants to become a mentor, create a mentor request with bio and portfolio
      if (wantsMentor && data.user) {
        try {
          const reasonParts = [];
          if (mentorBio) reasonParts.push(`Bio: ${mentorBio}`);
          if (portfolioLinks) reasonParts.push(`Portfolio/Links: ${portfolioLinks}`);
          
          await supabase
            .from('mentor_role_requests')
            .insert({
              user_id: data.user.id,
              reason: reasonParts.length > 0 ? reasonParts.join('\n\n') : 'Applied during registration',
              status: 'pending'
            });
        } catch {
          // Mentor request failure is non-critical
        }
      }

      // Send welcome email automatically
      if (data.user) {
        const firstName = fullName?.split(' ')[0] || 'there';
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: email,
              first_name: firstName,
              role: 'student',
              wants_mentor: wantsMentor || false,
              user_id: data.user.id,
            },
          });
        } catch {
          // Welcome email failure is non-critical
        }
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    toast({
      title: "Signed out",
      description: "You've been successfully signed out",
    });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    }

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    }

    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile, resetPassword, updatePassword }}>
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