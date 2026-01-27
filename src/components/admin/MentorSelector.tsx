import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Loader2, Search, User, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Mentor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface MentorSelectorProps {
  selectedMentorId: string | null;
  onMentorSelect: (mentorId: string) => void;
  disabled?: boolean;
}

export const MentorSelector = ({ 
  selectedMentorId, 
  onMentorSelect,
  disabled = false 
}: MentorSelectorProps) => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  useEffect(() => {
    const fetchMentors = async () => {
      const { data, error } = await supabase.rpc('get_public_mentor_profiles');
      
      if (error) {
        console.error('Error fetching mentors:', error);
        setLoading(false);
        return;
      }

      setMentors(data || []);
      
      // Set initial selected mentor if one exists
      if (selectedMentorId && data) {
        const mentor = data.find((m: Mentor) => m.id === selectedMentorId);
        setSelectedMentor(mentor || null);
      }
      
      setLoading(false);
    };

    fetchMentors();
  }, [selectedMentorId]);

  const filteredMentors = mentors.filter(mentor => 
    mentor.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMentor = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    onMentorSelect(mentor.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Course Mentor <span className="text-destructive">*</span>
      </Label>
      
      {/* Currently Selected Mentor */}
      {selectedMentor && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <ProfileAvatar
            src={selectedMentor.avatar_url || undefined}
            name={selectedMentor.full_name}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{selectedMentor.full_name}</p>
            {selectedMentor.bio && (
              <p className="text-xs text-muted-foreground truncate">{selectedMentor.bio}</p>
            )}
          </div>
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search mentors by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {/* Mentor List */}
      <ScrollArea className="h-[200px] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredMentors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {searchQuery ? 'No mentors found' : 'No mentors available'}
            </p>
          ) : (
            filteredMentors.map((mentor) => (
              <button
                key={mentor.id}
                type="button"
                onClick={() => handleSelectMentor(mentor)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-muted/50 ${
                  selectedMentor?.id === mentor.id ? 'bg-primary/10 border border-primary/30' : ''
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ProfileAvatar
                  src={mentor.avatar_url || undefined}
                  name={mentor.full_name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{mentor.full_name}</p>
                  {mentor.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{mentor.bio}</p>
                  )}
                </div>
                {selectedMentor?.id === mentor.id && (
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      
      <p className="text-xs text-muted-foreground">
        Select the mentor who will be credited for this course. This is required before publishing.
      </p>
    </div>
  );
};
