import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Instagram, Linkedin, Menu, X, GraduationCap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink } from "@/components/NavLink";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useUserInstitutions } from "@/hooks/useInstitution";
import acfeLogo from "@/assets/acfe-logo.png";

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: userInstitutions = [] } = useUserInstitutions();

  const navLinks = [
    { to: "/home", label: "Home" },
    { to: "/partners", label: "Partners" },
    { to: "/jobs", label: "Jobs" },
    { to: "/pricing", label: "Pricing" },
    { to: "/career-centre", label: "Career Centre" },
    { to: "/startups", label: "Startups" },
  ];

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo - Top Left */}
        <Link to="/home" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
          <img src={acfeLogo} alt="A Cloud for Everyone" className="h-16 sm:h-24 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </NavLink>
          ))}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors">
                  <ProfileAvatar
                    src={profile?.avatar_url || undefined}
                    name={profile?.full_name || undefined}
                    frame={profile?.profile_frame || 'none'}
                    size="sm"
                  />
                  <span className="hidden lg:inline">Account</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-[100]">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                {userInstitutions.length > 0 && (
                  <DropdownMenuItem asChild>
                    <Link to={`/career-centre/${userInstitutions[0].institution_slug}`} className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Career Centre
                    </Link>
                  </DropdownMenuItem>
                )}
                {profile?.role === "student" && (
                  <DropdownMenuItem asChild>
                    <Link to="/courses">Browse Courses</Link>
                  </DropdownMenuItem>
                )}
                {(profile?.role === "mentor" || profile?.role === "admin") && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/courses">Manage Courses</Link>
                  </DropdownMenuItem>
                )}
                {profile?.role === "admin" && (
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
            <Link to="/auth" className="text-sm font-bold text-foreground hover:text-primary transition-colors">
              Account
            </Link>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('https://www.instagram.com/acloudforeveryone/', '_blank', 'noopener,noreferrer')}
              className="text-foreground hover:text-primary transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </button>
            <a
              href="https://www.linkedin.com/company/a-cloud-for-everyone"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {userInstitutions.length > 0 && (
                  <Link
                    to={`/career-centre/${userInstitutions[0].institution_slug}`}
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2 flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Career Centre
                  </Link>
                )}
                {profile?.role === "student" && (
                  <Link
                    to="/courses"
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Browse Courses
                  </Link>
                )}
                {(profile?.role === "mentor" || profile?.role === "admin") && (
                  <Link
                    to="/admin/courses"
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Manage Courses
                  </Link>
                )}
                {profile?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2 text-left flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="text-sm font-bold text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Account
              </Link>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <button
                onClick={() => {
                  window.open('https://www.instagram.com/acloudforeveryone/', '_blank', 'noopener,noreferrer');
                  setMobileMenuOpen(false);
                }}
                className="text-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </button>
              <a
                href="https://www.linkedin.com/company/a-cloud-for-everyone"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
