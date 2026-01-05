import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, Gift } from 'lucide-react';

interface CourseBadgeProps {
  isPaid: boolean;
  isSubscribed?: boolean;
  institutionId?: string | null;
  institutionName?: string | null;
  className?: string;
}

/**
 * Displays the appropriate badge for a course:
 * - FREE (green) - Free course available to all
 * - PREMIUM (secondary) - Paid course
 * - Subscribed (primary) - User has already subscribed
 * - EXCLUSIVE TO [INSTITUTION] (amber) - Institution-exclusive course
 */
export const CourseBadge = ({
  isPaid,
  isSubscribed = false,
  institutionId,
  institutionName,
  className = '',
}: CourseBadgeProps) => {
  // Priority: Subscribed > Institution Exclusive > Premium > Free
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
