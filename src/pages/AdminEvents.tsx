import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ThumbnailDropzone } from '@/components/admin/ThumbnailDropzone';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, Calendar, MapPin, Video, Users, Edit2, Trash2, 
  Loader2, Eye, Copy, ExternalLink, Clock, Mail, Building2, Upload, Link as LinkIcon, GraduationCap
} from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_date: string;
  event_time: string;
  event_type: 'online' | 'in_person';
  event_link: string | null;
  location_name: string | null;
  location_address: string | null;
  send_5day_reminder: boolean;
  send_2day_reminder: boolean;
  send_dayof_reminder: boolean;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  featured_image_url: string | null;
  created_at: string;
  registration_count?: number;
}

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
}

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
}

interface EventMentor {
  id: string;
  mentor_id: string;
  profile: {
    id: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
  };
}

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  event_type: 'online' | 'in_person';
  event_link: string;
  location_name: string;
  location_address: string;
  send_5day_reminder: boolean;
  send_2day_reminder: boolean;
  send_dayof_reminder: boolean;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  featured_image_url: string;
}

const emptyEvent: EventFormData = {
  title: '',
  description: '',
  event_date: '',
  event_time: '',
  event_type: 'in_person',
  event_link: '',
  location_name: '',
  location_address: '',
  send_5day_reminder: true,
  send_2day_reminder: true,
  send_dayof_reminder: true,
  status: 'draft',
  featured_image_url: '',
};

const emptySpeaker = {
  name: '',
  title: '',
  organization: '',
  bio: '',
  photo_url: '',
  linkedin_url: '',
};

const emptySponsor = {
  name: '',
  logo_url: '',
  website_url: '',
};

export const AdminEvents = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSpeakerDialogOpen, setIsSpeakerDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyEvent);
  const [saving, setSaving] = useState(false);
  
  // Speakers management
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakerForm, setSpeakerForm] = useState(emptySpeaker);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  // Sponsors management
  const [isSponsorDialogOpen, setIsSponsorDialogOpen] = useState(false);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorForm, setSponsorForm] = useState(emptySponsor);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [uploadingSponsorLogo, setUploadingSponsorLogo] = useState(false);

  // Mentors management
  const [isMentorDialogOpen, setIsMentorDialogOpen] = useState(false);
  const [eventMentors, setEventMentors] = useState<EventMentor[]>([]);
  const [availableMentors, setAvailableMentors] = useState<{ id: string; full_name: string; bio: string | null; avatar_url: string | null }[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [loadingMentors, setLoadingMentors] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchEvents();
    }
  }, [profile]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });

    if (error) {
      toast({ title: 'Error loading events', description: error.message, variant: 'destructive' });
    } else {
      // Fetch registration counts
      const eventIds = data?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        const { data: regCounts } = await supabase
          .from('event_registrations')
          .select('event_id')
          .in('event_id', eventIds);
        
        const countMap: Record<string, number> = {};
        regCounts?.forEach(r => {
          countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
        });
        
        setEvents((data || []).map(e => ({
          ...e,
          registration_count: countMap[e.id] || 0
        })) as Event[]);
      } else {
        setEvents((data || []) as Event[]);
      }
    }
    setLoading(false);
  };

  const fetchSpeakers = async (eventId: string) => {
    setLoadingSpeakers(true);
    const { data, error } = await supabase
      .from('event_speakers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order');
    
    if (!error && data) {
      setSpeakers(data as Speaker[]);
    }
    setLoadingSpeakers(false);
  };

  const fetchSponsors = async (eventId: string) => {
    setLoadingSponsors(true);
    const { data, error } = await supabase
      .from('event_sponsors')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order');
    
    if (!error && data) {
      setSponsors(data as Sponsor[]);
    }
    setLoadingSponsors(false);
  };

  const fetchEventMentors = async (eventId: string) => {
    setLoadingMentors(true);
    const { data, error } = await supabase
      .from('event_mentors')
      .select('id, mentor_id, profile:profiles(id, full_name, bio, avatar_url)')
      .eq('event_id', eventId)
      .order('sort_order');
    
    if (!error && data) {
      setEventMentors(data as unknown as EventMentor[]);
    }
    setLoadingMentors(false);
  };

  const fetchAvailableMentors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, bio, avatar_url')
      .eq('role', 'mentor')
      .eq('account_status', 'active')
      .order('full_name');
    
    if (data) {
      setAvailableMentors(data);
    }
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData(emptyEvent);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_time: event.event_time,
      event_type: event.event_type,
      event_link: event.event_link || '',
      location_name: event.location_name || '',
      location_address: event.location_address || '',
      send_5day_reminder: event.send_5day_reminder,
      send_2day_reminder: event.send_2day_reminder,
      send_dayof_reminder: event.send_dayof_reminder,
      status: event.status,
      featured_image_url: event.featured_image_url || '',
    });
    setIsDialogOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleSaveEvent = async () => {
    if (!formData.title || !formData.event_date || !formData.event_time) {
      toast({ title: 'Missing fields', description: 'Title, date, and time are required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    
    const eventData = {
      title: formData.title,
      description: formData.description || null,
      event_date: formData.event_date,
      event_time: formData.event_time,
      event_type: formData.event_type,
      event_link: formData.event_type === 'online' ? formData.event_link : null,
      location_name: formData.event_type === 'in_person' ? formData.location_name : null,
      location_address: formData.event_type === 'in_person' ? formData.location_address : null,
      send_5day_reminder: formData.send_5day_reminder,
      send_2day_reminder: formData.send_2day_reminder,
      send_dayof_reminder: formData.send_dayof_reminder,
      status: formData.status,
      featured_image_url: formData.featured_image_url || null,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);
      
      if (error) {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Event updated!' });
        setIsDialogOpen(false);
        fetchEvents();
      }
    } else {
      const slug = generateSlug(formData.title);
      const { error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          slug,
          created_by: profile?.id,
        });
      
      if (error) {
        toast({ title: 'Create failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Event created!' });
        setIsDialogOpen(false);
        fetchEvents();
      }
    }
    
    setSaving(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event deleted' });
      fetchEvents();
    }
  };

  const handleManageSpeakers = (eventId: string) => {
    setSelectedEventId(eventId);
    setSpeakerForm(emptySpeaker);
    setEditingSpeaker(null);
    fetchSpeakers(eventId);
    setIsSpeakerDialogOpen(true);
  };

  const handleSaveSpeaker = async () => {
    if (!selectedEventId || !speakerForm.name) return;
    
    const speakerData = {
      event_id: selectedEventId,
      name: speakerForm.name,
      title: speakerForm.title || null,
      organization: speakerForm.organization || null,
      bio: speakerForm.bio || null,
      photo_url: speakerForm.photo_url || null,
      linkedin_url: speakerForm.linkedin_url || null,
      sort_order: speakers.length,
    };

    if (editingSpeaker) {
      const { error } = await supabase
        .from('event_speakers')
        .update(speakerData)
        .eq('id', editingSpeaker.id);
      
      if (!error) {
        toast({ title: 'Speaker updated!' });
        setSpeakerForm(emptySpeaker);
        setEditingSpeaker(null);
        fetchSpeakers(selectedEventId);
      }
    } else {
      const { error } = await supabase.from('event_speakers').insert(speakerData);
      if (!error) {
        toast({ title: 'Speaker added!' });
        setSpeakerForm(emptySpeaker);
        fetchSpeakers(selectedEventId);
      }
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    if (!selectedEventId) return;
    await supabase.from('event_speakers').delete().eq('id', speakerId);
    fetchSpeakers(selectedEventId);
  };

  const copyEventUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/events/${slug}`);
    toast({ title: 'URL copied!' });
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(filePath);

      setFormData({ ...formData, featured_image_url: publicUrl });
      toast({ title: 'Thumbnail uploaded!' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleManageSponsors = (eventId: string) => {
    setSelectedEventId(eventId);
    setSponsorForm(emptySponsor);
    setEditingSponsor(null);
    fetchSponsors(eventId);
    setIsSponsorDialogOpen(true);
  };

  const handleSponsorLogoUpload = async (file: File) => {
    setUploadingSponsorLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sponsor-${Date.now()}.${fileExt}`;
      const filePath = `sponsors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(filePath);

      setSponsorForm({ ...sponsorForm, logo_url: publicUrl });
      toast({ title: 'Logo uploaded!' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingSponsorLogo(false);
    }
  };

  const handleSaveSponsor = async () => {
    if (!selectedEventId || !sponsorForm.name) return;
    
    const sponsorData = {
      event_id: selectedEventId,
      name: sponsorForm.name,
      logo_url: sponsorForm.logo_url || null,
      website_url: sponsorForm.website_url || null,
      sort_order: sponsors.length,
    };

    if (editingSponsor) {
      const { error } = await supabase
        .from('event_sponsors')
        .update(sponsorData)
        .eq('id', editingSponsor.id);
      
      if (!error) {
        toast({ title: 'Sponsor updated!' });
        setSponsorForm(emptySponsor);
        setEditingSponsor(null);
        fetchSponsors(selectedEventId);
      }
    } else {
      const { error } = await supabase.from('event_sponsors').insert(sponsorData);
      if (!error) {
        toast({ title: 'Sponsor added!' });
        setSponsorForm(emptySponsor);
        fetchSponsors(selectedEventId);
      }
    }
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!selectedEventId) return;
    await supabase.from('event_sponsors').delete().eq('id', sponsorId);
    fetchSponsors(selectedEventId);
  };

  const handleManageMentors = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedMentorId('');
    fetchEventMentors(eventId);
    fetchAvailableMentors();
    setIsMentorDialogOpen(true);
  };

  const handleAddMentor = async () => {
    if (!selectedEventId || !selectedMentorId) return;
    
    const { error } = await supabase.from('event_mentors').insert({
      event_id: selectedEventId,
      mentor_id: selectedMentorId,
      sort_order: eventMentors.length,
    });
    
    if (!error) {
      toast({ title: 'Mentor added!' });
      setSelectedMentorId('');
      fetchEventMentors(selectedEventId);
    } else if (error.code === '23505') {
      toast({ title: 'Mentor already added', variant: 'destructive' });
    }
  };

  const handleRemoveMentor = async (mentorRecordId: string) => {
    if (!selectedEventId) return;
    await supabase.from('event_mentors').delete().eq('id', mentorRecordId);
    fetchEventMentors(selectedEventId);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Published</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed': return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Event Management</h1>
            <p className="text-muted-foreground">Create and manage platform events</p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-4">Create your first event to get started</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        {getStatusBadge(event.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.event_date), 'MMM d, yyyy')} at {event.event_time}
                        </span>
                        <span className="flex items-center gap-1">
                          {event.event_type === 'online' ? (
                            <><Video className="h-4 w-4" /> Online</>
                          ) : (
                            <><MapPin className="h-4 w-4" /> {event.location_name || 'In Person'}</>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event.registration_count || 0} registered
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyEventUrl(event.slug)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/events/${event.slug}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManageSpeakers(event.id)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Speakers
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManageSponsors(event.id)}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Sponsors
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManageMentors(event.id)}
                      >
                        <GraduationCap className="h-4 w-4 mr-1" />
                        Mentors
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenEdit(event)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>Event Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="All Things Tech Networking Session"
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Join us for an evening of networking..."
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Event Type */}
              <div>
                <Label>Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value: 'online' | 'in_person') => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location / Link */}
              {formData.event_type === 'online' ? (
                <div>
                  <Label>Event Link</Label>
                  <Input
                    value={formData.event_link}
                    onChange={(e) => setFormData({ ...formData, event_link: e.target.value })}
                    placeholder="https://zoom.us/..."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Venue Name</Label>
                    <Input
                      value={formData.location_name}
                      onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                      placeholder="Bertrand Cafe"
                    />
                  </div>
                  <div>
                    <Label>Full Address</Label>
                    <Input
                      value={formData.location_address}
                      onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                      placeholder="Maboneng, Johannesburg"
                    />
                  </div>
                </div>
              )}

              {/* Featured Image */}
              <div>
                <Label>Event Thumbnail</Label>
                <ThumbnailDropzone
                  currentThumbnail={formData.featured_image_url || null}
                  onUpload={handleThumbnailUpload}
                  uploading={uploadingThumbnail}
                  courseTitle={formData.title}
                />
              </div>

              {/* Email Reminders */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Reminders
                </Label>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">5 days before</span>
                    <Switch
                      checked={formData.send_5day_reminder}
                      onCheckedChange={(checked) => setFormData({ ...formData, send_5day_reminder: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">2 days before</span>
                    <Switch
                      checked={formData.send_2day_reminder}
                      onCheckedChange={(checked) => setFormData({ ...formData, send_2day_reminder: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Morning of event</span>
                    <Switch
                      checked={formData.send_dayof_reminder}
                      onCheckedChange={(checked) => setFormData({ ...formData, send_dayof_reminder: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'cancelled' | 'completed') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Speakers Management Dialog */}
        <Dialog open={isSpeakerDialogOpen} onOpenChange={setIsSpeakerDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Speakers</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Add/Edit Speaker Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{editingSpeaker ? 'Edit Speaker' : 'Add Speaker'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Name *"
                    value={speakerForm.name}
                    onChange={(e) => setSpeakerForm({ ...speakerForm, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Title/Role"
                      value={speakerForm.title}
                      onChange={(e) => setSpeakerForm({ ...speakerForm, title: e.target.value })}
                    />
                    <Input
                      placeholder="Organization"
                      value={speakerForm.organization}
                      onChange={(e) => setSpeakerForm({ ...speakerForm, organization: e.target.value })}
                    />
                  </div>
                  <Textarea
                    placeholder="Bio"
                    value={speakerForm.bio}
                    onChange={(e) => setSpeakerForm({ ...speakerForm, bio: e.target.value })}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Photo URL"
                      value={speakerForm.photo_url}
                      onChange={(e) => setSpeakerForm({ ...speakerForm, photo_url: e.target.value })}
                    />
                    <Input
                      placeholder="LinkedIn URL"
                      value={speakerForm.linkedin_url}
                      onChange={(e) => setSpeakerForm({ ...speakerForm, linkedin_url: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSpeaker} disabled={!speakerForm.name}>
                      {editingSpeaker ? 'Update' : 'Add'} Speaker
                    </Button>
                    {editingSpeaker && (
                      <Button variant="outline" onClick={() => {
                        setEditingSpeaker(null);
                        setSpeakerForm(emptySpeaker);
                      }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Speakers List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Current Speakers</h4>
                {loadingSpeakers ? (
                  <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                ) : speakers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No speakers added yet</p>
                ) : (
                  speakers.map((speaker) => (
                    <div key={speaker.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {speaker.photo_url ? (
                          <img src={speaker.photo_url} alt={speaker.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{speaker.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[speaker.title, speaker.organization].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingSpeaker(speaker);
                            setSpeakerForm({
                              name: speaker.name,
                              title: speaker.title || '',
                              organization: speaker.organization || '',
                              bio: speaker.bio || '',
                              photo_url: speaker.photo_url || '',
                              linkedin_url: speaker.linkedin_url || '',
                            });
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSpeaker(speaker.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sponsors Management Dialog */}
        <Dialog open={isSponsorDialogOpen} onOpenChange={setIsSponsorDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Sponsors</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Add/Edit Sponsor Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Company Name *"
                    value={sponsorForm.name}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                  />
                  
                  {/* Logo Upload Section */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Logo</Label>
                    {sponsorForm.logo_url ? (
                      <div className="flex items-center gap-4">
                        <img 
                          src={sponsorForm.logo_url} 
                          alt="Sponsor logo" 
                          className="h-12 w-auto max-w-32 object-contain bg-muted rounded p-1"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSponsorForm({ ...sponsorForm, logo_url: '' })}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Paste logo URL or upload..."
                            value={sponsorForm.logo_url}
                            onChange={(e) => setSponsorForm({ ...sponsorForm, logo_url: e.target.value })}
                            className="pr-20"
                          />
                          <label className="absolute right-1 top-1">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleSponsorLogoUpload(file);
                                e.target.value = '';
                              }}
                            />
                            <Button 
                              type="button" 
                              variant="secondary" 
                              size="sm"
                              className="h-7 px-2"
                              disabled={uploadingSponsorLogo}
                              asChild
                            >
                              <span>
                                {uploadingSponsorLogo ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Input
                    placeholder="Website URL (optional)"
                    value={sponsorForm.website_url}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, website_url: e.target.value })}
                  />
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSponsor} disabled={!sponsorForm.name}>
                      {editingSponsor ? 'Update' : 'Add'} Sponsor
                    </Button>
                    {editingSponsor && (
                      <Button variant="outline" onClick={() => {
                        setEditingSponsor(null);
                        setSponsorForm(emptySponsor);
                      }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sponsors List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Current Sponsors</h4>
                {loadingSponsors ? (
                  <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                ) : sponsors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No sponsors added yet</p>
                ) : (
                  sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.name} className="h-10 w-auto max-w-16 object-contain bg-muted rounded p-1" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{sponsor.name}</p>
                          {sponsor.website_url && (
                            <a 
                              href={sponsor.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkIcon className="h-3 w-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingSponsor(sponsor);
                            setSponsorForm({
                              name: sponsor.name,
                              logo_url: sponsor.logo_url || '',
                              website_url: sponsor.website_url || '',
                            });
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSponsor(sponsor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mentors Management Dialog */}
        <Dialog open={isMentorDialogOpen} onOpenChange={setIsMentorDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Event Mentors</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add registered ACFE mentors who will be participating in this event
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Add Mentor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add Mentor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a mentor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMentors
                        .filter(m => !eventMentors.some(em => em.mentor_id === m.id))
                        .map((mentor) => (
                          <SelectItem key={mentor.id} value={mentor.id}>
                            {mentor.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMentor} disabled={!selectedMentorId}>
                    Add Mentor
                  </Button>
                </CardContent>
              </Card>

              {/* Current Mentors List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Event Mentors</h4>
                {loadingMentors ? (
                  <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                ) : eventMentors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No mentors added yet</p>
                ) : (
                  eventMentors.map((em) => (
                    <div key={em.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {em.profile?.avatar_url ? (
                          <img src={em.profile.avatar_url} alt={em.profile.full_name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{em.profile?.full_name || 'Unknown'}</p>
                          {em.profile?.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{em.profile.bio}</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveMentor(em.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminEvents;
