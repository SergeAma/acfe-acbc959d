import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, AlertTriangle, AlertCircle, CheckCircle2, Info, 
  ChevronDown, ChevronRight, ExternalLink, Clock, RefreshCw
} from 'lucide-react';

interface AuditFinding {
  id: string;
  title: string;
  description: string;
  status: 'critical' | 'high' | 'medium' | 'low' | 'resolved';
  location?: string;
}

interface AuditPhase {
  phase: string;
  priority: 'critical' | 'high' | 'medium' | 'nice-to-have';
  findings: AuditFinding[];
}

const auditData: AuditPhase[] = [
  {
    phase: 'Phase 1: Critical',
    priority: 'critical',
    findings: [
      {
        id: '1.1',
        title: 'Email HTML Injection in send-institution-inquiry',
        description: 'User inputs interpolated into HTML without escaping. Risk of stored XSS via email.',
        status: 'critical',
        location: 'supabase/functions/send-institution-inquiry/index.ts'
      },
      {
        id: '1.2',
        title: 'Missing HTML Escaping in submit-referral',
        description: 'Referrer/referred names directly in email HTML without sanitization.',
        status: 'critical',
        location: 'supabase/functions/submit-referral/index.ts'
      },
      {
        id: '1.3',
        title: 'Donations Table Allows Unauthenticated Inserts',
        description: 'RLS policy allows anyone to insert. Edge function validates but direct DB access could bypass.',
        status: 'high',
        location: 'Database RLS - donations table'
      },
      {
        id: '1.4',
        title: 'Donation Checkout Missing CAPTCHA Verification',
        description: 'Frontend has CAPTCHA but edge function does not verify token server-side.',
        status: 'high',
        location: 'supabase/functions/create-donation-checkout/index.ts'
      },
      {
        id: '1.5',
        title: 'Leaked Password Protection Disabled',
        description: 'Supabase Auth feature to prevent compromised passwords is not enabled.',
        status: 'medium',
        location: 'Supabase Dashboard → Authentication'
      }
    ]
  },
  {
    phase: 'Phase 2: High Priority',
    priority: 'high',
    findings: [
      {
        id: '2.1',
        title: 'Missing Rate Limiting on Public Edge Functions',
        description: 'Functions like newsletter-signup, submit-referral lack server-side rate limiting.',
        status: 'high',
        location: 'supabase/functions/*'
      },
      {
        id: '2.2',
        title: 'profiles_public View Security',
        description: 'View may expose user data. Verify only non-sensitive columns are included.',
        status: 'medium',
        location: 'Supabase Database View'
      },
      {
        id: '2.3',
        title: 'Admin Contact Data Exposure Risk',
        description: 'Contacts and referrals tables contain PII. Add audit logging for access.',
        status: 'medium',
        location: 'contacts, referrals tables'
      },
      {
        id: '2.4',
        title: 'Hardcoded Turnstile Site Key',
        description: 'CAPTCHA site key should be in environment variable for easier rotation.',
        status: 'low',
        location: 'src/components/DonationDialog.tsx'
      }
    ]
  },
  {
    phase: 'Phase 3: Medium Priority',
    priority: 'medium',
    findings: [
      {
        id: '3.1',
        title: 'Inconsistent Input Validation',
        description: 'Some edge functions lack length limits and format validation.',
        status: 'medium',
        location: 'Various edge functions'
      },
      {
        id: '3.2',
        title: 'Missing Audit Trail for Admin Actions',
        description: 'Mentor approval/rejection, role changes not logged to admin_audit_logs.',
        status: 'medium',
        location: 'Admin action handlers'
      },
      {
        id: '3.3',
        title: 'Inconsistent Error Handling',
        description: 'Some functions expose internal error messages to clients.',
        status: 'low',
        location: 'Edge functions'
      }
    ]
  },
  {
    phase: 'Phase 4: Nice-to-Have',
    priority: 'nice-to-have',
    findings: [
      {
        id: '4.1',
        title: 'Large Files Need Refactoring',
        description: 'AdminInstitutions.tsx, CourseLearn.tsx exceed 800 lines. Split into sub-components.',
        status: 'low',
        location: 'src/pages/*'
      },
      {
        id: '4.2',
        title: 'Database Optimization',
        description: 'Add indexes on frequently queried columns for better performance.',
        status: 'low',
        location: 'Database schema'
      },
      {
        id: '4.3',
        title: 'TypeScript Strict Checks',
        description: 'Replace "any" types with proper interfaces throughout codebase.',
        status: 'low',
        location: 'Various components'
      }
    ]
  }
];

const securityChecklist = [
  { label: 'RLS on all tables', status: true },
  { label: 'Secrets management', status: true },
  { label: 'XSS prevention (DOMPurify)', status: true },
  { label: 'CSRF protection', status: true },
  { label: 'SQL injection prevention', status: true },
  { label: 'Role-based access', status: true },
  { label: 'Input validation', status: 'partial' as const },
  { label: 'Rate limiting', status: false },
  { label: 'Audit logging', status: 'partial' as const },
  { label: 'Email HTML escaping', status: false },
];

const priorityColors = {
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'nice-to-have': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

const statusIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: Info,
  resolved: CheckCircle2,
};

const statusColors = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
  resolved: 'text-emerald-500',
};

export const SecurityAuditPanel = () => {
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['Phase 1: Critical']);
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  const criticalCount = auditData.find(p => p.priority === 'critical')?.findings.filter(f => f.status === 'critical').length || 0;
  const highCount = auditData.flatMap(p => p.findings).filter(f => f.status === 'high').length;
  const totalFindings = auditData.reduce((acc, phase) => acc + phase.findings.length, 0);

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/20 to-orange-500/20">
              <Shield className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Security Audit Report</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2">
          {criticalCount > 0 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
              {criticalCount} Critical
            </Badge>
          )}
          {highCount > 0 && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
              {highCount} High
            </Badge>
          )}
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            {totalFindings} Total Findings
          </Badge>
        </div>

        {/* Security Checklist */}
        <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg bg-muted/30">
          {securityChecklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              {item.status === true ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              ) : item.status === 'partial' ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              )}
              <span className={item.status === true ? 'text-muted-foreground' : 'text-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Findings by Phase */}
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-2">
            {auditData.map((phase) => (
              <Collapsible 
                key={phase.phase}
                open={expandedPhases.includes(phase.phase)}
                onOpenChange={() => togglePhase(phase.phase)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedPhases.includes(phase.phase) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{phase.phase}</span>
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[phase.priority]}`}>
                        {phase.findings.length} items
                      </Badge>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-1.5">
                  {phase.findings.map((finding) => {
                    const StatusIcon = statusIcons[finding.status];
                    return (
                      <div 
                        key={finding.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border/50"
                      >
                        <StatusIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${statusColors[finding.status]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium">{finding.id}</span>
                            <span className="text-sm font-medium truncate">{finding.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {finding.description}
                          </p>
                          {finding.location && (
                            <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono truncate">
                              📁 {finding.location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        {/* View Full Report Link */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs gap-1.5"
          onClick={() => window.open('/docs/thorough-audit.md', '_blank')}
        >
          <ExternalLink className="h-3 w-3" />
          View Full Audit Report
        </Button>
      </CardContent>
    </Card>
  );
};
