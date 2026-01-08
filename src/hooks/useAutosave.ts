import { useState, useEffect, useRef, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>(JSON.stringify(data));
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Watch for data changes and trigger autosave
  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);
    
    // Skip if data hasn't changed
    if (currentData === lastDataRef.current) return;

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('pending');

    // Debounce the save
    timeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
      setStatus('saving');
      
      try {
        await onSave(data);
        if (isMountedRef.current) {
          lastDataRef.current = currentData;
          setStatus('saved');
          setLastSaved(new Date());
          
          // Reset to idle after showing "saved" briefly
          setTimeout(() => {
            if (isMountedRef.current) {
              setStatus('idle');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Autosave failed:', error);
        if (isMountedRef.current) {
          setStatus('error');
        }
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, debounceMs, enabled]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setStatus('saving');
    
    try {
      await onSave(data);
      lastDataRef.current = JSON.stringify(data);
      setStatus('saved');
      setLastSaved(new Date());
      
      setTimeout(() => {
        if (isMountedRef.current) {
          setStatus('idle');
        }
      }, 2000);
    } catch (error) {
      console.error('Manual save failed:', error);
      setStatus('error');
      throw error;
    }
  }, [data, onSave]);

  return {
    status,
    lastSaved,
    saveNow,
    isPending: status === 'pending',
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    hasError: status === 'error',
  };
}
