import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, Gift, CheckCircle, PlayCircle } from 'lucide-react';

interface CourseBadgeProps {
  isPaid: boolean;
  isSubscribed?: boolean;
  isCompleted?: boolean;
  isEnrolled?: boolean;
  institutionId?: string | null;
  institutionName?: string | null;
  className?: string;
}

/**
 * Displays the appropriate badge for a course:
 * - COMPLETED (emerald) - User has completed the course (has certificate)
 * - Continue Learning (blue) - User is enrolled but not completed
 * - Subscribed (primary) - User has purchased/subscribed
 * - EXCLUSIVE TO [INSTITUTION] (amber) - Institution-exclusive course
 * - PREMIUM (secondary) - Paid course
 * - FREE (green) - Free course available to all
 */
export const CourseBadge = ({
  isPaid,
  isSubscribed = false,
  isCompleted = false,
  isEnrolled = false,
  institutionId,
  institutionName,
  className = '',
}: CourseBadgeProps) => {
  // Priority: Completed > Continue Learning > Subscribed > Institution Exclusive > Premium > Free
  if (isCompleted) {
    return (
      <Badge className={`bg-emerald-600 text-white hover:bg-emerald-700 ${className}`}>
        <CheckCircle className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    );
  }

  if (isEnrolled && !isCompleted) {
    return (
      <Badge className={`bg-blue-600 text-white hover:bg-blue-700 ${className}`}>
        <PlayCircle className="h-3 w-3 mr-1" />
        Continue Learning
      </Badge>
    );
  }

  if (isSubscribed) {
    return (
      <Badge className={`bg-primary text-primary-foreground ${className}`}>
        <CreditCard className="h-3 w-3 mr-1" />
        Subscribed
      </Badge>
    );
  }

  if (institutionId && institutionName) {
    // Generate acronym from institution name
    const acronym = institutionName
      .split(' ')
      .filter(word => !['of', 'the', 'and', 'for'].includes(word.toLowerCase()))
      .map(word => word[0]?.toUpperCase())
      .join('')
      .slice(0, 4);

    return (
      <Badge className={`bg-amber-500 text-white hover:bg-amber-600 ${className}`}>
        <Building2 className="h-3 w-3 mr-1" />
        Exclusive to {acronym}
      </Badge>
    );
  }

  if (isPaid) {
    return (
      <Badge variant="secondary" className={className}>
        <CreditCard className="h-3 w-3 mr-1" />
        Premium
      </Badge>
    );
  }

  // Free course
  return (
    <Badge className={`bg-green-600 text-white hover:bg-green-700 ${className}`}>
      <Gift className="h-3 w-3 mr-1" />
      Free
    </Badge>
  );
};
