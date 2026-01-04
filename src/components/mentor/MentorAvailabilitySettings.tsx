import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` },
  ];
}).flat();

export const MentorAvailabilitySettings = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (profile?.id) {
      fetchAvailability();
    }
  }, [profile?.id]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', profile?.id)
        .order('day_of_week');

      if (error) throw error;

      if (data && data.length > 0) {
        setSlots(data.map(slot => ({
          ...slot,
          start_time: slot.start_time.substring(0, 5),
          end_time: slot.end_time.substring(0, 5),
        })));
        setTimezone(data[0].timezone || timezone);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    setSlots([...slots, {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      is_active: true,
    }]);
  };

  const removeSlot = (index: number) => {
    const newSlots = [...slots];
    newSlots.splice(index, 1);
    setSlots(newSlots);
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      // Delete existing slots
      await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_id', profile.id);

      // Insert new slots
      if (slots.length > 0) {
        const { error } = await supabase
          .from('mentor_availability')
          .insert(slots.map(slot => ({
            mentor_id: profile.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            timezone,
            is_active: slot.is_active,
          })));

        if (error) throw error;
      }

      toast.success('Availability saved successfully');
      fetchAvailability();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          1:1 Session Availability
        </CardTitle>
        <CardDescription>
          Set your available time slots for mentorship sessions. Learners will be able to book sessions during these times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Your Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris',
                'Europe/Berlin', 'Europe/Amsterdam', 'Asia/Tokyo', 'Asia/Shanghai',
                'Asia/Singapore', 'Asia/Dubai', 'Australia/Sydney', 'Africa/Lagos',
                'Africa/Johannesburg', 'Africa/Nairobi', 'Africa/Cairo', 'UTC'
              ].map(tz => (
                <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Available Time Slots</Label>
            <Button onClick={addSlot} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Slot
            </Button>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No availability set</p>
              <p className="text-sm">Add time slots when you're available for sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Select
                    value={slot.day_of_week.toString()}
                    onValueChange={(v) => updateSlot(index, 'day_of_week', parseInt(v))}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={slot.start_time}
                    onValueChange={(v) => updateSlot(index, 'start_time', v)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-muted-foreground">to</span>

                  <Select
                    value={slot.end_time}
                    onValueChange={(v) => updateSlot(index, 'end_time', v)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 ml-auto">
                    <Switch
                      checked={slot.is_active}
                      onCheckedChange={(v) => updateSlot(index, 'is_active', v)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Availability
        </Button>
      </CardContent>
    </Card>
  );
};
