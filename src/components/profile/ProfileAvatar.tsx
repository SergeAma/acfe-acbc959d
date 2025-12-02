import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { ProfileFrame } from '@/contexts/AuthContext';

interface ProfileAvatarProps {
  src?: string;
  name?: string;
  frame?: ProfileFrame;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
};

const ringClasses: Record<ProfileFrame, string> = {
  none: '',
  hiring: 'ring-4 ring-purple-500',
  open_to_work: 'ring-4 ring-green-500',
  looking_for_cofounder: 'ring-4 ring-orange-500',
};

const badgeText: Record<ProfileFrame, string> = {
  none: '',
  hiring: '#HIRING',
  open_to_work: '#OPENTOWORK',
  looking_for_cofounder: '#COFOUNDER',
};

const badgeColors: Record<ProfileFrame, string> = {
  none: '',
  hiring: 'bg-purple-500',
  open_to_work: 'bg-green-500',
  looking_for_cofounder: 'bg-orange-500',
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
        <AvatarFallback className={size === 'lg' ? 'text-2xl' : ''}>
          <User className={size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-8 w-8' : 'h-4 w-4'} />
        </AvatarFallback>
      </Avatar>
      {frame !== 'none' && (
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded text-[8px] font-bold text-white whitespace-nowrap ${badgeColors[frame]}`}
        >
          {badgeText[frame]}
        </div>
      )}
    </div>
  );
};
