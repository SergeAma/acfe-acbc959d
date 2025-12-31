import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface FormStep {
  id: string;
  label: string;
  isComplete: boolean;
}

interface FormProgressStepperProps {
  steps: FormStep[];
  className?: string;
}

export function FormProgressStepper({ steps, className }: FormProgressStepperProps) {
  const completedCount = steps.filter(s => s.isComplete).length;
  const totalCount = steps.length;
  const isAllComplete = completedCount === totalCount;
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(completedCount);

  // Trigger celebration animation when all fields are complete
  useEffect(() => {
    if (isAllComplete && prevCompleted < totalCount) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 1500);
      return () => clearTimeout(timer);
    }
    setPrevCompleted(completedCount);
  }, [isAllComplete, completedCount, prevCompleted, totalCount]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Form Progress</span>
          <span className={cn(
            "font-medium transition-all duration-300",
            isAllComplete ? "text-primary" : "text-foreground"
          )}>
            {completedCount}/{totalCount} complete
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden relative">
          <div 
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              isAllComplete ? "bg-primary" : "bg-primary/70"
            )}
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
          {/* Celebration shimmer effect */}
          {showCelebration && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1s_ease-out]" />
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
              step.isComplete 
                ? "bg-primary/10 text-primary" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.isComplete ? (
              <Check className={cn(
                "h-3 w-3",
                showCelebration && "animate-bounce-scale"
              )} style={{ animationDelay: `${index * 100}ms` }} />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Success message */}
      {isAllComplete && (
        <div className={cn(
          "flex items-center gap-2 text-sm text-primary font-medium",
          "animate-fade-in"
        )}>
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-3 w-3" />
          </div>
          <span>All fields complete! Ready to submit.</span>
        </div>
      )}
    </div>
  );
}
