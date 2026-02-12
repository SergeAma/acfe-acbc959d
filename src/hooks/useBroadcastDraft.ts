import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DraftFilters {
  country: string;
  language: string;
  gender: string;
  skills: string;
}

interface DraftState {
  subject: string;
  content: string;
  targetRole: string;
  filters: DraftFilters;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  message_content: string;
  created_by: string;
}

const DEFAULT_CONTENT = '<p>Dear {{first_name}},</p><p>Your message here...</p>';

export function useBroadcastDraft(adminId: string | undefined) {
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  const draftRef = useRef<DraftState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load draft on mount
  const loadDraft = useCallback(async (): Promise<DraftState | null> => {
    if (!adminId) return null;
    const { data } = await supabase
      .from('broadcast_drafts')
      .select('*')
      .eq('admin_id', adminId)
      .maybeSingle();

    if (data) {
      const filters = (data.filters || {}) as Record<string, string>;
      const draft: DraftState = {
        subject: data.subject || '',
        content: data.message_content || DEFAULT_CONTENT,
        targetRole: filters.targetRole || 'all',
        filters: {
          country: filters.country || '',
          language: filters.language || '',
          gender: filters.gender || '',
          skills: filters.skills || '',
        },
      };
      setLastSaved(new Date(data.updated_at));
      setDraftLoaded(true);
      return draft;
    }
    setDraftLoaded(true);
    return null;
  }, [adminId]);

  // Save draft
  const saveDraft = useCallback(async (state: DraftState) => {
    if (!adminId) return;
    setSaving(true);
    const filters = {
      targetRole: state.targetRole,
      country: state.filters.country,
      language: state.filters.language,
      gender: state.filters.gender,
      skills: state.filters.skills,
    };

    const payload = {
      admin_id: adminId,
      subject: state.subject,
      message_content: state.content,
      filters,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('broadcast_drafts')
      .upsert(payload, { onConflict: 'admin_id' });

    if (!error) {
      setLastSaved(new Date());
    }
    setSaving(false);
  }, [adminId]);

  // Clear draft after send
  const clearDraft = useCallback(async () => {
    if (!adminId) return;
    await supabase.from('broadcast_drafts').delete().eq('admin_id', adminId);
    setLastSaved(null);
    draftRef.current = null;
  }, [adminId]);

  // Start auto-save interval
  const startAutoSave = useCallback((getState: () => DraftState) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const state = getState();
      // Only save if there's meaningful content
      if (state.subject || state.content !== DEFAULT_CONTENT) {
        saveDraft(state);
      }
    }, 30_000);
  }, [saveDraft]);

  const stopAutoSave = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Templates
  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    const { data } = await supabase
      .from('broadcast_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTemplates(data as Template[]);
    setTemplatesLoaded(true);
  }, [templatesLoaded]);

  const saveTemplate = useCallback(async (name: string, subject: string, content: string) => {
    if (!adminId) return false;
    const { error } = await supabase
      .from('broadcast_templates')
      .insert({ name, subject, message_content: content, created_by: adminId });
    if (error) return false;
    setTemplatesLoaded(false); // force reload
    return true;
  }, [adminId]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('broadcast_templates')
      .delete()
      .eq('id', id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
    return !error;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopAutoSave();
  }, [stopAutoSave]);

  return {
    draftLoaded,
    lastSaved,
    saving,
    loadDraft,
    saveDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
    templates,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
  };
}
