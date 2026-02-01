import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLearnerAgreement } from '@/hooks/useLearnerAgreement';
import { useMentorContract } from '@/hooks/useMentorContract';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, FileSignature, User, Clock } from 'lucide-react';

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
  current: boolean;
}

export function OnboardingBanner() {
  const { user, profile } = useAuth();
  const { hasSignedAgreement, isProfileComplete } = useLearnerAgreement();
  const { hasSignedContract } = useMentorContract(user?.id);

  if (!user || !profile) return null;

  const isMentor = profile.role === 'mentor';
  const isStudent = profile.role === 'student';
  const isAdmin = profile.role === 'admin';

  // Admin doesn't need onboarding
  if (isAdmin) return null;

  // Build steps based on role
  const steps: OnboardingStep[] = [];

  if (isMentor) {
    steps.push({
      id: 'profile',
      label: 'Complete profile',
      completed: isProfileComplete,
      href: '/profile',
      current: !isProfileComplete,
    });
    steps.push({
      id: 'contract',
      label: 'Sign mentor agreement',
      completed: hasSignedContract === true,
      href: '/mentor-contract',
      current: isProfileComplete && hasSignedContract === false,
    });
  } else if (isStudent) {
    steps.push({
      id: 'profile',
      label: 'Complete profile',
      completed: isProfileComplete,
      href: '/profile',
      current: !isProfileComplete,
    });
    steps.push({
      id: 'agreement',
      label: 'Sign learner agreement',
      completed: hasSignedAgreement === true,
      href: '/learner-agreement',
      current: isProfileComplete && hasSignedAgreement === false,
    });
  }

  // Calculate progress
  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 100;

  // All done? Don't show banner
  if (completedSteps === totalSteps) return null;

  // Find current step
  const currentStep = steps.find(s => s.current);

  return (
    <Alert className="mb-6 border-primary/30 bg-primary/5">
      <FileSignature className="h-5 w-5 text-primary" />
      <AlertTitle className="text-primary font-semibold">
        Complete your onboarding
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{completedSteps} of {totalSteps} steps completed</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex flex-col gap-2 mt-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              ) : step.current ? (
                <Circle className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
              )}
              <span className={`text-sm ${step.completed ? 'text-muted-foreground line-through' : step.current ? 'font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {step.current && step.href && (
                <Link to={step.href}>
                  <Button size="sm" variant="outline" className="ml-auto h-7 text-xs">
                    {step.id === 'profile' ? 'Complete now' : 'Sign now'}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
