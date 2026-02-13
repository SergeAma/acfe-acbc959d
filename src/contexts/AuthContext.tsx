import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
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

// Pending signup data stored temporarily until OTP verification
interface PendingSignupData {
  email: string;
  fullName: string;
  linkedinUrl?: string;
  wantsMentor?: boolean;
  university?: string;
  mentorBio?: string;
  portfolioLinks?: string;
  preferredLanguage?: 'en' | 'fr';
  gender?: 'male' | 'female';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  // OTP-based authentication
  sendOtp: (email: string) => Promise<{ error: AuthError | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | null }>;
  // Signup with OTP (sends code after collecting profile data)
  signUpWithOtp: (
    email: string, 
    fullName: string, 
    linkedinUrl?: string, 
    wantsMentor?: boolean, 
    university?: string, 
    mentorBio?: string, 
    portfolioLinks?: string, 
    preferredLanguage?: 'en' | 'fr', 
    gender?: 'male' | 'female'
  ) => Promise<{ error: AuthError | null }>;
  // Complete signup after OTP verification
  completeSignup: (email: string, token: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Pending signup data (for OTP verification flow)
  pendingSignup: PendingSignupData | null;
  clearPendingSignup: () => void;
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
  // isInitialized removed — auth listener now uses [] deps to avoid cleanup issues
  const [simulatedRole, setSimulatedRoleState] = useState<SimulatableRole>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignupData | null>(null);
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

  const clearPendingSignup = () => {
    setPendingSignup(null);
  };

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
      // User may have multiple roles - we prioritize: admin > mentor > student
      const { data: rolesData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      // Role error is non-fatal, we fall back to profile role
      // Determine highest-priority role: admin > mentor > student
      let role: 'admin' | 'mentor' | 'student' = profileData.role || 'student'; // fallback
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
      const profileData = await fetchProfile(user.id, true); // Force refresh
      if (profileData) setProfile(profileData);
    }
  };

  // Set up auth state listener ONCE — must be in a separate effect with [] deps
  // so it never gets cleaned up and re-created during the component lifecycle
  useEffect(() => {
    let mounted = true;

    // FIRST: set up the listener so we don't miss any events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setSimulatedRoleState(null);
          lastProfileFetchRef.current = null;
          clearPendingSignup();
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
                
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('new_signup')) {
                  window.history.replaceState({}, '', window.location.pathname);
                }
              }
            }, 100);
          }
          
          setLoading(false);
        }
      }
    );

    // THEN: check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!mounted) return;
      
      if (sessionError) {
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
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

  // Send magic link to email (for sign-in of existing users)
  const sendOtp = async (email: string) => {
    // Get redirect URL based on current location
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Don't create user on sign-in flow
        emailRedirectTo: redirectUrl, // Redirect to auth page after clicking link
      },
    });

    if (error) {
      // Check if user doesn't exist
      if (error.message.includes('not found') || error.message.includes('Signups not allowed')) {
        toast({
          title: "Account not found",
          description: "No account exists with this email. Please sign up first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send email",
          description: error.message,
          variant: "destructive",
        });
      }
      return { error };
    }

    toast({
      title: "Email sent!",
      description: "Check your email for a verification link.",
    });

    return { error: null };
  };

  // Verify OTP code (kept for backward compatibility, but magic link handles auth automatically)
  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink',
    });

    if (error) {
      toast({
        title: "Invalid link",
        description: "The link is incorrect or has expired.",
        variant: "destructive",
      });
      return { error };
    }

    // Successfully verified - update state immediately
    if (data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      
      // Fetch profile immediately
      const profileData = await fetchProfile(data.user.id, true);
      if (profileData) setProfile(profileData);
    }

    return { error: null };
  };

  // Sign up with OTP - encodes data in URL and sends verification code
  const signUpWithOtp = async (
    email: string, 
    fullName: string, 
    linkedinUrl?: string, 
    wantsMentor?: boolean, 
    university?: string, 
    mentorBio?: string, 
    portfolioLinks?: string, 
    preferredLanguage: 'en' | 'fr' = 'en', 
    gender?: 'male' | 'female'
  ) => {
    // Store pending signup data in state (for UI feedback during this session)
    const signupData: PendingSignupData = {
      email,
      fullName,
      linkedinUrl,
      wantsMentor,
      university,
      mentorBio,
      portfolioLinks,
      preferredLanguage,
      gender,
    };
    
    setPendingSignup(signupData);

    // Encode signup data in URL for cross-context transfer (survives browser/device changes)
    const signupParams = new URLSearchParams({
      new_signup: 'true',
      full_name: fullName,
      preferred_language: preferredLanguage || 'en',
    });
    const redirectUrl = `${window.location.origin}/auth?${signupParams.toString()}`;
    
    // Send magic link to the user's email (this creates the user in Supabase)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Create user on signup flow
        emailRedirectTo: redirectUrl, // Redirect to auth page with signup params
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      clearPendingSignup();
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Verification email sent!",
      description: "Check your email and click the link to complete registration.",
    });

    return { error: null };
  };

  // Complete signup after magic link verification (called automatically by onAuthStateChange)
  const completeSignup = async (email: string, token: string) => {
    // Verify the magic link token
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink',
    });

    if (error) {
      toast({
        title: "Invalid link",
        description: "The link is incorrect or has expired.",
        variant: "destructive",
      });
      return { error };
    }

    // Successfully verified
    if (data.session && data.user) {
      setSession(data.session);
      setUser(data.user);

      // Now update the profile with the stored signup data
      const stored = pendingSignup;
      if (stored) {
        const updateData: Record<string, string> = {};
        if (stored.linkedinUrl) updateData.linkedin_url = stored.linkedinUrl;
        if (stored.university) updateData.university = stored.university;
        if (stored.gender) updateData.gender = stored.gender;
        updateData.preferred_language = stored.preferredLanguage || 'en';
        
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', data.user.id);

        // If user wants to become a mentor, create a mentor request
        if (stored.wantsMentor) {
          try {
            const reasonParts = [];
            if (stored.mentorBio) reasonParts.push(`Bio: ${stored.mentorBio}`);
            if (stored.portfolioLinks) reasonParts.push(`Portfolio/Links: ${stored.portfolioLinks}`);
            
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

        // Note: Welcome emails are now sent via onAuthStateChange SIGNED_IN event
        // This ensures emails are sent after email confirmation, not profile creation

        toast({
          title: "Account created!",
          description: stored.wantsMentor 
            ? "Welcome! Your mentor application will be reviewed by our team." 
            : "Welcome to A Cloud for Everyone. All users start as learners.",
        });
      }

      // Clear pending signup data
      clearPendingSignup();

      // Fetch profile
      const profileData = await fetchProfile(data.user.id, true);
      if (profileData) setProfile(profileData);
    }

    return { error: null };
  };

  const signOut = async () => {
    setSimulatedRoleState(null); // Clear simulation
    clearPendingSignup();
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
      sendOtp,
      verifyOtp,
      signUpWithOtp,
      completeSignup,
      signOut, 
      refreshProfile, 
      pendingSignup,
      clearPendingSignup,
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
