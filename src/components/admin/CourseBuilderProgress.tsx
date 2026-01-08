import { Check, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface BuilderStep {
  id: string;
  label: string;
  isComplete: boolean;
  isRequired?: boolean;
  description?: string;
}

interface CourseBuilderProgressProps {
  steps: BuilderStep[];
  className?: string;
}

export function CourseBuilderProgress({ steps, className }: CourseBuilderProgressProps) {
  const completedCount = steps.filter(s => s.isComplete).length;
  const requiredSteps = steps.filter(s => s.isRequired !== false);
  const completedRequiredCount = requiredSteps.filter(s => s.isComplete).length;
  const isPublishReady = completedRequiredCount === requiredSteps.length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Course Setup</span>
          {isPublishReady ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
              Ready to publish
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
              {requiredSteps.length - completedRequiredCount} required left
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <Progress 
        value={progressPercent} 
        className={cn(
          'h-2',
          isPublishReady && '[&>div]:bg-green-500'
        )}
      />

      {/* Step pills */}
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-1.5">
          {steps.map((step) => (
            <Tooltip key={step.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-default',
                    step.isComplete
                      ? 'bg-primary/10 text-primary'
                      : step.isRequired !== false
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.isComplete ? (
                    <Check className="h-3 w-3" />
                  ) : step.isRequired !== false ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{step.label}</p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
                <p className="text-xs mt-1">
                  {step.isComplete ? (
                    <span className="text-green-600">✓ Complete</span>
                  ) : step.isRequired !== false ? (
                    <span className="text-amber-600">Required for publishing</span>
                  ) : (
                    <span className="text-muted-foreground">Optional</span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
