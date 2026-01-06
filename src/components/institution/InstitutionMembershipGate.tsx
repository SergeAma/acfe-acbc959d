import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, Mail, ArrowLeft, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Institution {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
}

interface InstitutionMembershipGateProps {
  institution: Institution;
}

export const InstitutionMembershipGate = ({ institution }: InstitutionMembershipGateProps) => {
  const { t } = useLanguage();
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              {institution.logo_url ? (
                <img 
                  src={institution.logo_url} 
                  alt={institution.name}
                  className="h-16 w-16 object-contain rounded-xl bg-white p-1.5 shadow-lg border"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-amber-500/10 flex items-center justify-center border shadow-lg">
                  <Building2 className="h-8 w-8 text-amber-500" />
                </div>
              )}
            </div>
            
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Shield className="h-3 w-3 mr-1.5" />
              {t('inst_gate_membership_required')}
            </Badge>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {institution.name} {t('inst_gate_career_centre')}
            </h1>
            <p className="text-muted-foreground">
              {t('inst_gate_exclusive')} {acronym} {t('inst_gate_students')}
            </p>
          </div>

          {/* Main card */}
          <Card className="shadow-xl border-amber-500/20">
            <CardContent className="p-8 text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mx-auto ring-4 ring-amber-500/10">
                <Shield className="h-10 w-10 text-amber-500" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">
                  {t('inst_gate_verification_title')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('inst_gate_verification_desc')}{' '}
                  <strong className="text-foreground">{institution.name}</strong>.
                </p>
              </div>

              {institution.description && (
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <p className="text-sm text-muted-foreground italic">
                    "{institution.description.slice(0, 150)}..."
                  </p>
                </div>
              )}

              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{t('inst_gate_how_access')}</span>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  {t('inst_gate_contact_admin')}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button variant="outline" asChild className="rounded-full">
                  <Link to="/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('inst_gate_return')}
                  </Link>
                </Button>
                <Button variant="ghost" asChild size="sm" className="text-muted-foreground">
                  <Link to="/career-centre">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {t('inst_gate_learn_more')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer note */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            {t('inst_gate_footer')}
          </p>
        </div>
      </div>
    </div>
  );
};
