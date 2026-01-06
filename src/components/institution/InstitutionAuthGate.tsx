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
      .filter(word => !['the', 'of', 'and', 'for'].includes(word.toLowerCase()))
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
        <div className="max-w-5xl mx-auto">
          
          {/* Header with institution branding */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-4 mb-6">
              {institution.logo_url ? (
                <img 
                  src={institution.logo_url} 
                  alt={institution.name}
                  className="h-20 w-20 lg:h-24 lg:w-24 object-contain rounded-2xl bg-white p-2 shadow-lg border"
                />
              ) : (
                <div className="h-20 w-20 lg:h-24 lg:w-24 rounded-2xl bg-primary/10 flex items-center justify-center border shadow-lg">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
              )}
              <span className="text-2xl text-muted-foreground/30 font-light hidden sm:block">×</span>
              <div className="hidden sm:block">
                <img 
                  src="/acfe-logo.png" 
                  alt="ACFE" 
                  className="h-10 lg:h-12 object-contain"
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
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powered by <span className="font-semibold text-foreground">A Cloud For Everyone (ACFE)</span>
            </p>
          </div>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            
            {/* Left: Institution info and benefits */}
            <div className="space-y-6">
              {/* Institution mission card */}
              {institution.description && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {institution.logo_url && (
                        <img 
                          src={institution.logo_url} 
                          alt="" 
                          className="h-10 w-10 object-contain rounded-lg bg-white p-1"
                        />
                      )}
                      <div>
                        <h3 className="font-bold text-foreground">About {acronym}</h3>
                        <p className="text-xs text-muted-foreground">Our Mission</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {institution.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Benefits list */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    What You'll Get Access To
                  </h3>
                  <ul className="space-y-4">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <benefit.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-foreground">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Trust indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Verified Institution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Secure Access</span>
                </div>
              </div>
            </div>

            {/* Right: Sign up/Sign in card */}
            <Card className="lg:sticky lg:top-8 shadow-xl border-2">
              <CardContent className="p-8">
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

          {/* Bottom: Partnership note */}
          <div className="mt-12 text-center">
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
