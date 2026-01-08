import { useAuth, SimulatableRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, Shield, GraduationCap, Users, Building2, 
  CheckCircle2, X
} from 'lucide-react';

const roleOptions: { value: SimulatableRole; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: null, 
    label: 'Admin (Actual)', 
    icon: <Shield className="h-4 w-4" />,
    description: 'Your real admin role'
  },
  { 
    value: 'student', 
    label: 'Student / Learner', 
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'View as a regular learner'
  },
  { 
    value: 'mentor', 
    label: 'Mentor', 
    icon: <Users className="h-4 w-4" />,
    description: 'View as a course mentor'
  },
  { 
    value: 'institution_moderator', 
    label: 'Institution Moderator', 
    icon: <Building2 className="h-4 w-4" />,
    description: 'View as institution staff'
  },
];

export const AdminRoleSwitcher = () => {
  const { isActualAdmin, simulatedRole, setSimulatedRole, isSimulating } = useAuth();

  // Only render for actual admins
  if (!isActualAdmin) return null;

  const currentRole = roleOptions.find(r => r.value === simulatedRole) || roleOptions[0];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isSimulating ? "default" : "outline"}
            size="sm"
            className={`rounded-full shadow-lg gap-2 ${
              isSimulating 
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' 
                : 'bg-background border-2'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isSimulating ? `Viewing as ${currentRole.label}` : 'Admin View'}
            </span>
            {isSimulating && (
              <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-xs">
                Testing
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Admin Role Switcher
          </DropdownMenuLabel>
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            Test the app as different user roles
          </p>
          <DropdownMenuSeparator />
          {roleOptions.map((option) => (
            <DropdownMenuItem
              key={option.value ?? 'admin'}
              onClick={() => setSimulatedRole(option.value)}
              className="flex items-start gap-3 py-3 cursor-pointer"
            >
              <div className={`mt-0.5 ${simulatedRole === option.value ? 'text-primary' : 'text-muted-foreground'}`}>
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  {simulatedRole === option.value && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
          {isSimulating && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSimulatedRole(null)}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <X className="h-4 w-4 mr-2" />
                Exit Test Mode
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
