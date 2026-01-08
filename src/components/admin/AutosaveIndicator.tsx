import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutosaveStatus } from '@/hooks/useAutosave';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSaved?: Date | null;
  className?: string;
}

export function AutosaveIndicator({ status, lastSaved, className }: AutosaveIndicatorProps) {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs transition-all duration-300',
      className
    )}>
      {status === 'idle' && lastSaved && (
        <>
          <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Saved {formatLastSaved(lastSaved)}
          </span>
        </>
      )}
      
      {status === 'pending' && (
        <>
          <Cloud className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
          <span className="text-muted-foreground">Unsaved changes</span>
        </>
      )}
      
      {status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="text-primary">Saving...</span>
        </>
      )}
      
      {status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}
