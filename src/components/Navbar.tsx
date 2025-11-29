import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Cloud, LogOut, User, BookOpen, Library, Shield, Instagram, Linkedin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavLink } from '@/components/NavLink';

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo - Top Left */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors">
          <Cloud className="h-8 w-8 text-primary" />
          <span>A Cloud for Everyone</span>
        </Link>

        {/* Navigation Tabs - Top Right */}
        <div className="flex items-center gap-8">
          <NavLink to="/">Home</NavLink>
          <NavLink to="#partners">Partners</NavLink>
          <NavLink to="#jobs">Jobs</NavLink>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  My account
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-[100]">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                {profile?.role === 'student' && (
                  <DropdownMenuItem asChild>
                    <Link to="/courses">Browse Courses</Link>
                  </DropdownMenuItem>
                )}
                {profile?.role === 'mentor' && (
                  <DropdownMenuItem asChild>
                    <Link to="/mentor/courses">My Courses</Link>
                  </DropdownMenuItem>
                )}
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              My account
            </Link>
          )}
          
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
      </div>
    </nav>
  );
};