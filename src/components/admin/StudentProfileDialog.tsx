import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, MapPin, GraduationCap, Briefcase, Award, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StudentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentEmail: string;
  studentUserId?: string | null;
}

export const StudentProfileDialog = ({
  open,
  onOpenChange,
  studentEmail,
  studentUserId,
}: StudentProfileDialogProps) => {
  const [profileId, setProfileId] = useState<string | null>(studentUserId || null);

  // Try to find profile by email if no user_id
  useEffect(() => {
    if (!studentUserId && studentEmail && open) {
      const findProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', studentEmail)
          .maybeSingle();
        if (data) setProfileId(data.id);
      };
      findProfile();
    } else if (studentUserId) {
      setProfileId(studentUserId);
    }
  }, [studentEmail, studentUserId, open]);

  // Log admin profile view for audit purposes (non-blocking)
  useEffect(() => {
    if (open && profileId) {
      // Use type assertion as the table was just created
      (supabase.from('admin_audit_logs' as any) as any)
        .insert({
          action: 'view_student_profile',
          target_user_id: profileId,
          metadata: { student_email: studentEmail }
        })
        .then(() => {});
    }
  }, [open, profileId, studentEmail]);

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student-profile', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId && open,
  });

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['student-enrollments', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          progress,
          enrolled_at,
          course:courses(id, title, thumbnail_url)
        `)
        .eq('student_id', profileId)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId && open,
  });

  // Fetch certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['student-certificates', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('course_certificates')
        .select(`
          id,
          certificate_number,
          issued_at,
          course:courses(title)
        `)
        .eq('student_id', profileId)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId && open,
  });

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || studentEmail.substring(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>

        {profileLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="py-8 text-center text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{studentEmail}</p>
            <p className="text-sm mt-1">This student hasn't completed their profile yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{profile.full_name || 'Unnamed Student'}</h3>
                <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {profile.role === 'mentor' ? 'Mentor' : 'Student'}
                  </Badge>
                  {profile.country && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.country}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div>
                <h4 className="text-sm font-medium mb-1">About</h4>
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            {/* University */}
            {profile.university && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>{profile.university}</span>
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.skills.slice(0, 10).map((skill: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {profile.skills.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{profile.skills.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Companies */}
            {profile.companies_worked_for && profile.companies_worked_for.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Work Experience
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.companies_worked_for.map((company: string, i: number) => (
                    <span key={i} className="text-sm text-muted-foreground">
                      {company}{i < profile.companies_worked_for.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Course Enrollments */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Course Enrollments ({enrollments.length})
              </h4>
              {enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No course enrollments yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {enrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <span className="truncate flex-1">{enrollment.course?.title || 'Unknown Course'}</span>
                      <Badge variant={enrollment.progress === 100 ? 'default' : 'secondary'} className="ml-2 shrink-0">
                        {enrollment.progress || 0}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificates */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certificates ({certificates.length})
              </h4>
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No certificates earned yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {certificates.map((cert: any) => (
                    <div key={cert.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <div className="truncate flex-1">
                        <span className="font-medium">{cert.course?.title}</span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(cert.issued_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <a
                        href={`/certificate/${cert.certificate_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Social Links */}
            {(profile.linkedin_url || profile.twitter_url || profile.github_url || profile.website_url) && (
              <div>
                <h4 className="text-sm font-medium mb-2">Links</h4>
                <div className="flex flex-wrap gap-3">
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      LinkedIn
                    </a>
                  )}
                  {profile.twitter_url && (
                    <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Twitter
                    </a>
                  )}
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      GitHub
                    </a>
                  )}
                  {profile.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p>Member since {profile.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Unknown'}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
