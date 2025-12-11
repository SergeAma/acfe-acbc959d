import { useState } from 'react';

// Map of well-known companies to their domains for logo fetching
const COMPANY_DOMAINS: Record<string, string> = {
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'apple': 'apple.com',
  'meta': 'meta.com',
  'facebook': 'facebook.com',
  'netflix': 'netflix.com',
  'twitter': 'twitter.com',
  'x': 'x.com',
  'linkedin': 'linkedin.com',
  'salesforce': 'salesforce.com',
  'oracle': 'oracle.com',
  'ibm': 'ibm.com',
  'intel': 'intel.com',
  'adobe': 'adobe.com',
  'spotify': 'spotify.com',
  'uber': 'uber.com',
  'airbnb': 'airbnb.com',
  'stripe': 'stripe.com',
  'paypal': 'paypal.com',
  'shopify': 'shopify.com',
  'slack': 'slack.com',
  'zoom': 'zoom.us',
  'atlassian': 'atlassian.com',
  'dropbox': 'dropbox.com',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'cloudflare': 'cloudflare.com',
  'twilio': 'twilio.com',
  'mongodb': 'mongodb.com',
  'datadog': 'datadoghq.com',
  'snowflake': 'snowflake.com',
  'samsung': 'samsung.com',
  'sony': 'sony.com',
  'nvidia': 'nvidia.com',
  'amd': 'amd.com',
  'cisco': 'cisco.com',
  'hp': 'hp.com',
  'dell': 'dell.com',
  'vmware': 'vmware.com',
  'sap': 'sap.com',
  'accenture': 'accenture.com',
  'deloitte': 'deloitte.com',
  'pwc': 'pwc.com',
  'kpmg': 'kpmg.com',
  'ey': 'ey.com',
  'mckinsey': 'mckinsey.com',
  'bcg': 'bcg.com',
  'bain': 'bain.com',
  'aws': 'aws.amazon.com',
  'gcp': 'cloud.google.com',
  'azure': 'azure.microsoft.com',
  'digitalocean': 'digitalocean.com',
  'heroku': 'heroku.com',
  'vercel': 'vercel.com',
  'netlify': 'netlify.com',
  'supabase': 'supabase.com',
  'firebase': 'firebase.google.com',
  'mtn': 'mtn.com',
  'safaricom': 'safaricom.co.ke',
  'vodacom': 'vodacom.co.za',
  'flutterwave': 'flutterwave.com',
  'paystack': 'paystack.com',
  'interswitch': 'interswitchgroup.com',
  'andela': 'andela.com',
  'jumia': 'jumia.com',
  'konga': 'konga.com',
  'takealot': 'takealot.com',
};

const getDomainForCompany = (company: string): string | null => {
  const normalized = company.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return COMPANY_DOMAINS[normalized] || null;
};

interface CompanyLogoProps {
  company: string;
  showName?: boolean;
}

const CompanyLogo = ({ company, showName = true }: CompanyLogoProps) => {
  const [imageError, setImageError] = useState(false);
  const domain = getDomainForCompany(company);
  
  if (!domain || imageError) {
    return (
      <span className="px-2 py-1 text-xs bg-muted rounded-md text-muted-foreground">
        {company}
      </span>
    );
  }

  const logoUrl = `https://logo.clearbit.com/${domain}`;
  
  return (
    <div className="flex items-center gap-1.5" title={company}>
      <img
        src={logoUrl}
        alt={`${company} logo`}
        className="h-5 w-5 object-contain rounded"
        onError={() => setImageError(true)}
      />
      {showName && (
        <span className="text-xs text-muted-foreground">{company}</span>
      )}
    </div>
  );
};

interface CompanyLogosProps {
  companies: string[];
  maxDisplay?: number;
  showNames?: boolean;
  className?: string;
}

export const CompanyLogos = ({ 
  companies, 
  maxDisplay = 5, 
  showNames = false,
  className = '' 
}: CompanyLogosProps) => {
  if (!companies || companies.length === 0) return null;
  
  const displayCompanies = companies.slice(0, maxDisplay);
  const remainingCount = companies.length - maxDisplay;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-muted-foreground">Has worked with:</span>
      {displayCompanies.map((company, index) => (
        <CompanyLogo key={index} company={company} showName={showNames} />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};
