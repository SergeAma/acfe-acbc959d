import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2,
  Circle,
  Video,
  Award,
  ClipboardCheck,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  completed?: boolean;
  available?: boolean;
}

interface Section {
  id: string;
  title: string;
  content: ContentItem[];
}

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
}

interface CourseSidebarProps {
  courseTitle: string;
  overallProgress: number;
  sections: Section[];
  currentContentId: string | null;
  certificate: Certificate | null;
  hasQuiz: boolean;
  hasAssignment: boolean;
  showAssessments: boolean;
  onNavigateToContent: (contentId: string) => void;
  onViewCertificate: () => void;
  onShowAssessments: () => void;
}

// File icon component (simplified)
const File = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

export const CourseSidebar = ({
  courseTitle,
  overallProgress,
  sections,
  currentContentId,
  certificate,
  hasQuiz,
  hasAssignment,
  showAssessments,
  onNavigateToContent,
  onViewCertificate,
  onShowAssessments,
}: CourseSidebarProps) => {
  const getContentIcon = (type: string, completed: boolean) => {
    return completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />;
  };

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="text-lg">{courseTitle}</CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {certificate && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={onViewCertificate}
            >
              <Award className="h-4 w-4 mr-2" />
              View Certificate
            </Button>
          )}
          {overallProgress === 100 && !certificate && (hasQuiz || hasAssignment) && (
            <Button 
              variant={showAssessments ? "default" : "outline"}
              size="sm" 
              className="w-full mt-2"
              onClick={onShowAssessments}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Complete Assessments
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="px-4 pb-4">
          {sections.map((section, sectionIdx) => (
            <AccordionItem key={section.id} value={section.id} className="border-b-0">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <span className="text-xs font-semibold text-muted-foreground">{sectionIdx + 1}</span>
                  <span className="text-sm font-medium line-clamp-2">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pl-4">
                  {section.content.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onNavigateToContent(item.id)}
                      disabled={!item.available}
                      className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                        currentContentId === item.id
                          ? 'bg-primary/10 text-primary'
                          : item.available
                          ? 'hover:bg-muted'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {getContentIcon(item.content_type, item.completed || false)}
                      <span className="text-sm flex-1 line-clamp-2">{item.title}</span>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
