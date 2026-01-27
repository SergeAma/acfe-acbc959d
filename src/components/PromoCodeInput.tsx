import { Ticket, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PromoCodeInputProps {
  /** Current promo code value */
  value: string;
  /** Handler for code changes */
  onChange: (value: string) => void;
  /** Handler to clear the code */
  onClear?: () => void;
  /** Validation result */
  validation?: {
    valid: boolean;
    message: string;
    discountDescription?: string;
  } | null;
  /** Whether validation is in progress */
  isValidating?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the clear button */
  showClear?: boolean;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default';
  /** Whether input is disabled */
  disabled?: boolean;
}

/**
 * Unified promo code input component used across the platform.
 * Provides consistent UI for promo code entry with validation feedback.
 */
export const PromoCodeInput = ({
  value,
  onChange,
  onClear,
  validation,
  isValidating = false,
  placeholder = 'Enter promo code',
  showClear = true,
  className,
  size = 'default',
  disabled = false,
}: PromoCodeInputProps) => {
  const hasValue = value.trim().length > 0;
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          )} />
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className={cn(
              'uppercase',
              size === 'sm' ? 'pl-8 h-9 text-sm' : 'pl-10'
            )}
            disabled={disabled}
          />
        </div>
        {showClear && hasValue && onClear && (
          <Button 
            type="button" 
            variant="outline" 
            size={size === 'sm' ? 'sm' : 'default'}
            onClick={onClear}
            disabled={disabled}
          >
            {size === 'sm' ? <X className="h-3 w-3" /> : 'Clear'}
          </Button>
        )}
      </div>
      
      {/* Validation feedback */}
      {hasValue && isValidating && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Validating code...
        </p>
      )}
      
      {hasValue && !isValidating && validation && (
        <p className={cn(
          'text-xs',
          validation.valid ? 'text-green-600' : 'text-destructive'
        )}>
          {validation.valid ? (
            <>✓ {validation.discountDescription || 'Valid code'} - will apply at checkout</>
          ) : (
            <>✗ {validation.message}</>
          )}
        </p>
      )}
    </div>
  );
};
