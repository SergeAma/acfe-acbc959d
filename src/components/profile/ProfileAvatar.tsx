import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { ProfileFrame } from '@/contexts/AuthContext';

interface ProfileAvatarProps {
  src?: string;
  name?: string;
  frame?: ProfileFrame;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-40 w-40',
};

const ringClasses: Record<ProfileFrame, string> = {
  none: '',
  hiring: 'ring-2 ring-purple-500',
  open_to_work: 'ring-2 ring-green-500',
  looking_for_cofounder: 'ring-2 ring-orange-500',
};

const badgeText: Record<ProfileFrame, string> = {
  none: '',
  hiring: '#HIRING',
  open_to_work: '#OPEN',
  looking_for_cofounder: '#COFOUNDER',
};

const badgeColors: Record<ProfileFrame, string> = {
  none: '',
  hiring: 'bg-purple-500/80',
  open_to_work: 'bg-green-500/80',
  looking_for_cofounder: 'bg-orange-500/80',
};

export const ProfileAvatar = ({
  src,
  name,
  frame = 'none',
  size = 'md',
  className = '',
}: ProfileAvatarProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <Avatar className={`${sizeClasses[size]} ${ringClasses[frame]}`}>
        <AvatarImage src={src} alt={name} />
        <AvatarFallback className={size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : ''}>
          <User className={size === 'xl' ? 'h-20 w-20' : size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-8 w-8' : 'h-4 w-4'} />
        </AvatarFallback>
      </Avatar>
      {frame !== 'none' && (
        <div
          className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-px rounded text-[6px] font-semibold text-white whitespace-nowrap ${badgeColors[frame]}`}
        >
          {badgeText[frame]}
        </div>
      )}
    </div>
  );
};
