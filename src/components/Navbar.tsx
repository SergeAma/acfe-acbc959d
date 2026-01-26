import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LogOut, Instagram, Linkedin, Menu, X, GraduationCap, MessageCircle } from "lucide-react";
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
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useUserInstitutions } from "@/hooks/useInstitution";
import { useCountryFlag } from "@/hooks/useCountryFlag";
import { usePrivateMessages } from "@/hooks/usePrivateMessages";
import { Badge } from "@/components/ui/badge";
import acfeLogo from "@/assets/acfe-logo.png";

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: userInstitutions = [] } = useUserInstitutions();
  const { flag, countryName, loading: flagLoading } = useCountryFlag();
  const { totalUnread } = usePrivateMessages();
  
  // Only mentors and admins can access private messaging
  const canAccessMessages = profile?.role === 'mentor' || profile?.role === 'admin';

  const navLinks = [
    { to: "/home", labelKey: "nav.home" },
    { to: "/partners", labelKey: "nav.partners" },
    { to: "/jobs", labelKey: "nav.jobs" },
    { to: "/pricing", labelKey: "nav.pricing" },
    { to: "/career-centre", labelKey: "nav.careerCentre" },
    { to: "/startups", labelKey: "nav.startups" },
  ];

  return (
    <>
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo with Country Flag */}
        <Link to="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
          <img src={acfeLogo} alt="A Cloud for Everyone" className="h-12 sm:h-16 md:h-20 w-auto" />
          {!flagLoading && (
            <span 
              className="text-2xl sm:text-3xl" 
              title={countryName}
              aria-label={`Visiting from ${countryName}`}
            >
              {flag}
            </span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              {t(link.labelKey)}
            </NavLink>
          ))}

          {user ? (
            <>
              {/* Messages icon for mentors/admins */}
              {canAccessMessages && (
                <Link 
                  to="/dashboard?tab=messages" 
                  className="relative p-2 text-foreground hover:text-primary transition-colors"
                  title={t('nav.messages') || 'Messages'}
                >
                  <MessageCircle className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                    >
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </Badge>
                  )}
                </Link>
              )}
              <NotificationDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors">
                    <ProfileAvatar
                      src={profile?.avatar_url || undefined}
                      name={profile?.full_name || undefined}
                      frame={profile?.profile_frame || 'none'}
                      size="sm"
                    />
                    <span className="hidden lg:inline">{t('nav.account')}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover z-[100]">
                  <DropdownMenuLabel>{t('nav.account')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">{t('nav.dashboard')}</Link>
                  </DropdownMenuItem>
                  {userInstitutions.length > 0 && (
                    <DropdownMenuItem asChild>
                      <Link to={`/career-centre/${userInstitutions[0].institution_slug}`} className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        {t('nav.careerCentre')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {profile?.role === "student" && (
                    <DropdownMenuItem asChild>
                      <Link to="/courses">{t('nav.browseCourses')}</Link>
                    </DropdownMenuItem>
                  )}
                  {(profile?.role === "mentor" || profile?.role === "admin") && (
                    <DropdownMenuItem asChild>
                      <Link to="/mentor/courses">{t('nav.manageCourses')}</Link>
                    </DropdownMenuItem>
                  )}
                  {profile?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">{t('nav.adminPanel')}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile">{t('nav.profileSettings')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth" className="text-sm font-bold text-foreground hover:text-primary transition-colors">
              {t('nav.account')}
            </Link>
          )}

          <LanguageToggle />

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

      {/* Mobile Navigation Menu - Floating Semi-Transparent Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-4 top-16 sm:top-20 z-[60] bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-6 py-6 flex flex-col gap-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t(link.labelKey)}
              </NavLink>
            ))}

            <div className="h-px bg-white/20 my-2" />

            {user ? (
              <>
                {/* Messages link for mentors/admins in mobile menu */}
                {canAccessMessages && (
                  <Link
                    to="/dashboard?tab=messages"
                    className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('nav.messages') || 'Messages'}
                    {totalUnread > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </Badge>
                    )}
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.dashboard')}
                </Link>
                {userInstitutions.length > 0 && (
                  <Link
                    to={`/career-centre/${userInstitutions[0].institution_slug}`}
                    className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <GraduationCap className="h-4 w-4" />
                    {t('nav.careerCentre')}
                  </Link>
                )}
                {profile?.role === "student" && (
                  <Link
                    to="/courses"
                    className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.browseCourses')}
                  </Link>
                )}
                {(profile?.role === "mentor" || profile?.role === "admin") && (
                  <Link
                    to="/mentor/courses"
                    className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.manageCourses')}
                  </Link>
                )}
                {profile?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.adminPanel')}
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.profileSettings')}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10 text-left flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="text-base font-semibold text-white hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.account')}
              </Link>
            )}

            <div className="h-px bg-white/20 my-2" />

            <div className="flex items-center gap-4 px-4 py-2">
              <button
                onClick={() => {
                  window.open('https://www.instagram.com/acloudforeveryone/', '_blank', 'noopener,noreferrer');
                  setMobileMenuOpen(false);
                }}
                className="text-white hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </button>
              <a
                href="https://www.linkedin.com/company/a-cloud-for-everyone"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <div className="ml-auto">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
    {/* Spacer for fixed navbar */}
    <div className="h-16 sm:h-20" />
    </>
  );
};
