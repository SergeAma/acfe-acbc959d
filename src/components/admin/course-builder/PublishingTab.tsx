import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Award, DollarSign, Clock, Building2, Zap, Globe, EyeOff, Save, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedMediaInput } from '../UnifiedMediaInput';

/**
 * Publishing Tab
 * 
 * TAB 3 of 3 in simplified course builder
 * Contains: Price, Certificates, Availability, Duration, Intro Media
 * 
 * Business settings separated from content creation.
 */

interface Course {
  id: string;
  is_published: boolean;
  certificate_enabled: boolean;
  is_paid: boolean;
  price_cents: number;
  duration_weeks: number | null;
  drip_enabled: boolean;
  drip_schedule_type: string | null;
  drip_release_day: number | null;
  institution_id: string | null;
  description_video_url: string | null;
  description_audio_url: string | null;
}

interface Institution {
  id: string;
  name: string;
}

interface PublishingTabProps {
  course: Course;
  institutions: Institution[];
  onUpdate: (updates: Partial<Course>) => void;
}

export const PublishingTab = ({ course, institutions, onUpdate }: PublishingTabProps) => {
  const { toast } = useToast();
  const { isActualAdmin } = useAuth();
  
  // Local state for inputs
  const [priceCents, setPriceCents] = useState(course.price_cents);
  const [durationWeeks, setDurationWeeks] = useState(course.duration_weeks);
  const [dripScheduleType, setDripScheduleType] = useState(course.drip_schedule_type || 'week');
  const [dripReleaseDay, setDripReleaseDay] = useState(course.drip_release_day ?? 3);
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Toggle handlers
  const handleToggle = async (field: keyof Course, value: boolean) => {
    const { error } = await supabase
      .from('courses')
      .update({ [field]: value })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Error', description: `Failed to update ${field}`, variant: 'destructive' });
    } else {
      onUpdate({ [field]: value });
    }
  };

  const handleTogglePublish = async () => {
    setTogglingPublish(true);
    const newStatus = !course.is_published;

    const { error } = await supabase
      .from('courses')
      .update({ is_published: newStatus })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to change publish status', variant: 'destructive' });
    } else {
      onUpdate({ is_published: newStatus });
      toast({ 
        title: newStatus ? 'Published!' : 'Unpublished', 
        description: newStatus ? 'Your course is now live' : 'Course moved to draft' 
      });
    }
    setTogglingPublish(false);
  };

  const handleSavePrice = async () => {
    setSavingPrice(true);
    const { error } = await supabase
      .from('courses')
      .update({ price_cents: priceCents })
      .eq('id', course.id);

    if (!error) {
      onUpdate({ price_cents: priceCents });
      toast({ title: 'Saved', description: `Price set to $${(priceCents / 100).toFixed(0)}` });
    }
    setSavingPrice(false);
  };

  const handleSaveDuration = async () => {
    setSavingDuration(true);
    const { error } = await supabase
      .from('courses')
      .update({ duration_weeks: durationWeeks })
      .eq('id', course.id);

    if (!error) {
      onUpdate({ duration_weeks: durationWeeks });
      toast({ title: 'Saved', description: 'Duration updated' });
    }
    setSavingDuration(false);
  };

  const handleSaveDripSchedule = async () => {
    const { error } = await supabase
      .from('courses')
      .update({ 
        drip_schedule_type: dripScheduleType,
        drip_release_day: dripScheduleType === 'week' ? dripReleaseDay : null 
      })
      .eq('id', course.id);

    if (!error) {
      onUpdate({ drip_schedule_type: dripScheduleType, drip_release_day: dripReleaseDay });
      toast({ title: 'Saved', description: 'Drip schedule updated' });
    }
  };

  const handleInstitutionChange = async (value: string) => {
    const newValue = value === 'all' ? null : value;
    const { error } = await supabase
      .from('courses')
      .update({ institution_id: newValue })
      .eq('id', course.id);

    if (!error) {
      onUpdate({ institution_id: newValue });
      toast({ 
        title: 'Saved', 
        description: newValue ? 'Course restricted to institution' : 'Course available to all' 
      });
    }
  };

  const handleIntroMediaChange = async (media: { url: string; type: 'video' | 'audio' } | null) => {
    const updates: Partial<Course> = {
      description_video_url: null,
      description_audio_url: null,
    };

    if (media) {
      if (media.type === 'video') {
        updates.description_video_url = media.url;
      } else {
        updates.description_audio_url = media.url;
      }
    }

    const { error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', course.id);

    if (error) throw error;
    onUpdate(updates);
  };

  return (
    <div className="space-y-6">
      {/* Publish Status - Most Important */}
      <Card className={course.is_published ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {course.is_published ? (
                <Globe className="h-6 w-6 text-green-500" />
              ) : (
                <EyeOff className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <h3 className="font-semibold text-lg">
                  {course.is_published ? 'Course is Live' : 'Course is Draft'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {course.is_published ? 'Students can enroll and view content' : 'Only you can see this course'}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleTogglePublish}
              disabled={togglingPublish}
              variant={course.is_published ? 'outline' : 'default'}
              size="lg"
            >
              {togglingPublish ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : course.is_published ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {course.is_published ? 'Unpublish' : 'Publish Course'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Intro Media */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Course Introduction Media</CardTitle>
          <CardDescription>Add a video or audio introduction shown on the course page</CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedMediaInput
            currentUrl={course.description_video_url || course.description_audio_url}
            onMediaChange={handleIntroMediaChange}
            contentId={course.id}
            context="description"
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Certificate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Issue certificates</Label>
                <p className="text-sm text-muted-foreground">Students get a certificate on completion</p>
              </div>
              <Switch
                checked={course.certificate_enabled}
                onCheckedChange={(v) => handleToggle('certificate_enabled', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Estimated completion time (weeks)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="52"
                value={durationWeeks || ''}
                onChange={(e) => setDurationWeeks(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g., 4"
              />
              <Button 
                size="sm" 
                onClick={handleSaveDuration}
                disabled={savingDuration || durationWeeks === course.duration_weeks}
              >
                {savingDuration ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pricing - Admin Only */}
        {isActualAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Paid course</Label>
                  <p className="text-sm text-muted-foreground">
                    {course.is_paid ? `$${(priceCents / 100).toFixed(0)}` : 'Free access'}
                  </p>
                </div>
                <Switch
                  checked={course.is_paid}
                  onCheckedChange={(v) => handleToggle('is_paid', v)}
                />
              </div>
              
              {course.is_paid && (
                <div className="pt-3 border-t">
                  <Label>Price (USD)</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={priceCents / 100}
                        onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value || '10') * 100))}
                        className="pl-7"
                      />
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleSavePrice}
                      disabled={savingPrice || priceCents === course.price_cents}
                    >
                      {savingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Availability */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Who can access</Label>
            <Select 
              value={course.institution_id || 'all'} 
              onValueChange={handleInstitutionChange}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ACFE Learners</SelectItem>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name} (Exclusive)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Drip Content */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Content Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Drip Content</Label>
                <p className="text-sm text-muted-foreground">
                  {course.drip_enabled ? 'Release content progressively' : 'All content available immediately'}
                </p>
              </div>
              <Switch
                checked={course.drip_enabled}
                onCheckedChange={(v) => handleToggle('drip_enabled', v)}
              />
            </div>

            {course.drip_enabled && (
              <div className="pt-3 border-t grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Schedule Type</Label>
                  <Select value={dripScheduleType} onValueChange={setDripScheduleType}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="module">By Module</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dripScheduleType === 'week' && (
                  <div>
                    <Label>Release Day</Label>
                    <Select value={dripReleaseDay.toString()} onValueChange={(v) => setDripReleaseDay(parseInt(v))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  onClick={handleSaveDripSchedule}
                  className="md:col-span-2"
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Drip Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
