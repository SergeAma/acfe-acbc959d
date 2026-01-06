import { Link } from "react-router-dom";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import acfeLogo from "@/assets/acfe-logo.png";
import spectrogramLogo from "@/assets/spectrogram-logo.png";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="sm:col-span-2">
            <Link to="/home" className="inline-block mb-4">
              <img src={acfeLogo} alt="A Cloud for Everyone" className="h-16 w-auto" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              {t('footer.tagline')}
            </p>
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-muted-foreground text-xs mb-2">
                {t('footer.initiativeBy')}
              </p>
              <a 
                href="https://spectrogramconsulting.com/home" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              >
                <img src={spectrogramLogo} alt="Spectrogram Consulting" className="h-10 w-auto" />
              </a>
              <p className="text-muted-foreground text-xs mt-2">
                The Brew Eagle House, 163 City Rd, London EC1V 1NR
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Spectrogram Consulting® trading name under Spectrogram UK LTD, Company number 09577536.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/home" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/partners" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.partners')}
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.jobs')}
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.courses')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:hidden">
            <h4 className="font-semibold text-foreground mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.contactUs')}</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contact@acloudforeveryone.org"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  contact@acloudforeveryone.org
                </a>
              </li>
              <li className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => window.open('https://www.instagram.com/acloudforeveryone/', '_blank', 'noopener,noreferrer')}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </button>
                <a
                  href="https://www.linkedin.com/company/a-cloud-for-everyone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} A Cloud for Everyone. {t('footer.rights')}
          </p>
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
