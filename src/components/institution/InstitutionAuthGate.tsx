import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, GraduationCap, Award, Users, Building2, 
  CheckCircle, ArrowRight, Sparkles, BookOpen
} from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
}

interface InstitutionAuthGateProps {
  institution: Institution;
  currentPath: string;
}

export const InstitutionAuthGate = ({ institution, currentPath }: InstitutionAuthGateProps) => {
  // Generate institution acronym from name
  const getAcronym = (name: string) => {
    return name
      .split(' ')
      .filter(word => !['of', 'and', 'for'].includes(word.toLowerCase()))
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  };

  const acronym = getAcronym(institution.name);

  const benefits = [
    { icon: BookOpen, text: 'Exclusive courses curated for your institution' },
    { icon: Award, text: 'Industry-recognized certifications' },
    { icon: Users, text: 'Connect with mentors and peers' },
    { icon: Sparkles, text: 'Access the Talent Network for career opportunities' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 lg:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Header with institution branding - CENTERED */}
          <div className="text-center mb-12">
            {/* Logo row - symmetric sizing */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-24 w-24 rounded-2xl bg-white p-3 shadow-lg border flex items-center justify-center">
                {institution.logo_url ? (
                  <img 
                    src={institution.logo_url} 
                    alt={institution.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-primary" />
                )}
              </div>
              <span className="text-2xl text-muted-foreground/30 font-light">×</span>
              <div className="h-24 w-24 rounded-2xl bg-white p-3 shadow-lg border flex items-center justify-center">
                <img 
                  src="/acfe-logo.png" 
                  alt="ACFE" 
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm bg-primary/5 border-primary/20">
              <Shield className="h-3.5 w-3.5 mr-2" />
              Official Partnership Program
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {institution.name}
            </h1>
            <h2 className="text-xl sm:text-2xl text-primary font-semibold mb-4">
              Career Development Centre
            </h2>
            <p className="text-lg text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">A Cloud For Everyone (ACFE)</span>
            </p>
          </div>

          {/* Main content grid - equal height cards */}
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            
            {/* Left column - stacked cards */}
            <div className="flex flex-col gap-6">
              {/* Institution mission card */}
              <Card className="flex-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-white p-1.5 border flex items-center justify-center shrink-0">
                      {institution.logo_url ? (
                        <img 
                          src={institution.logo_url} 
                          alt="" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="text-center flex-1">
                      <h3 className="font-bold text-foreground">About {acronym}</h3>
                      <p className="text-xs text-muted-foreground">Our Mission</p>
                    </div>
                    <div className="w-10" /> {/* Spacer for symmetry */}
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-center flex-1">
                    {institution.description || `${institution.name} has partnered with ACFE to provide students with world-class career development resources and mentorship opportunities.`}
                  </p>
                </CardContent>
              </Card>

              {/* Benefits list card */}
              <Card className="flex-1">
                <CardContent className="p-6 h-full flex flex-col">
                  <h3 className="font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    What You'll Get Access To
                  </h3>
                  <ul className="space-y-4 flex-1">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <benefit.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-foreground text-sm">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Right: Sign up/Sign in card - matches left column height */}
            <Card className="shadow-xl border-2 h-full">
              <CardContent className="p-8 h-full flex flex-col justify-center">
                <div className="text-center mb-8">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 ring-4 ring-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Join {acronym}'s Career Centre
                  </h3>
                  <p className="text-muted-foreground">
                    Use your institutional email to access exclusive resources
                  </p>
                </div>

                <div className="space-y-4">
                  <Button asChild size="lg" className="w-full rounded-full text-base h-12">
                    <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(currentPath)}`}>
                      Create Your Account
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Already have an account?
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="outline" asChild size="lg" className="w-full rounded-full text-base h-12">
                    <Link to={`/auth?redirect=${encodeURIComponent(currentPath)}`}>
                      Sign In
                    </Link>
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-6">
                  By signing up, you agree to our{' '}
                  <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust indicators - centered */}
          <div className="flex items-center justify-center gap-8 mt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Verified Institution</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Secure Access</span>
            </div>
          </div>

          {/* Bottom: Partnership note - centered */}
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{institution.name}</span> has partnered with 
              ACFE to provide students with world-class career development resources and mentorship.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
