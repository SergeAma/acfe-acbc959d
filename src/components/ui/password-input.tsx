import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface PasswordInputProps extends React.ComponentProps<"input"> {
  showStrength?: boolean;
}

const getPasswordStrength = (password: string): { level: 'weak' | 'medium' | 'strong'; score: number } => {
  if (!password) return { level: 'weak', score: 0 };
  
  let score = 0;
  
  // Length checks
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { level: 'weak', score: 33 };
  if (score <= 4) return { level: 'medium', score: 66 };
  return { level: 'strong', score: 100 };
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const passwordValue = typeof value === 'string' ? value : '';
    const strength = showStrength ? getPasswordStrength(passwordValue) : null;

    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className,
            )}
            ref={ref}
            value={value}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
        {showStrength && passwordValue && (
          <div className="space-y-1">
            <div className="flex gap-1 h-1.5">
              <div 
                className={cn(
                  "flex-1 rounded-full transition-colors",
                  strength?.level === 'weak' ? "bg-destructive" : 
                  strength?.level === 'medium' ? "bg-yellow-500" : "bg-green-500"
                )} 
              />
              <div 
                className={cn(
                  "flex-1 rounded-full transition-colors",
                  strength?.level === 'medium' ? "bg-yellow-500" : 
                  strength?.level === 'strong' ? "bg-green-500" : "bg-muted"
                )} 
              />
              <div 
                className={cn(
                  "flex-1 rounded-full transition-colors",
                  strength?.level === 'strong' ? "bg-green-500" : "bg-muted"
                )} 
              />
            </div>
            <p className={cn(
              "text-xs",
              strength?.level === 'weak' ? "text-destructive" : 
              strength?.level === 'medium' ? "text-yellow-600 dark:text-yellow-500" : "text-green-600 dark:text-green-500"
            )}>
              {strength?.level === 'weak' && "Weak - Add uppercase, numbers, or symbols"}
              {strength?.level === 'medium' && "Medium - Consider adding more variety"}
              {strength?.level === 'strong' && "Strong password"}
            </p>
          </div>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };