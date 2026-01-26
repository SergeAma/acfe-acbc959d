import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2,
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Maximize2,
  Minimize2,
  Video,
} from 'lucide-react';
import { YouTubeLessonPlayer } from '@/components/learning/YouTubeLessonPlayer';
import { createSafeHtml } from '@/lib/sanitize-html';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  video_url: string | null;
  sort_order: number;
  drip_delay_days: number | null;
  completed?: boolean;
  available?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  content: ContentItem[];
}

interface LessonContentRendererProps {
  currentContent: ContentItem | null;
  sections: Section[];
  enrollmentId: string | null;
  enrolledAt: string | null;
  isFocusMode: boolean;
  setIsFocusMode: (value: boolean) => void;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: (value: boolean) => void;
  onMarkComplete: (contentId: string) => void;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onVideoComplete: () => void;
  isAuthenticated?: boolean;
  hasActiveSubscription?: boolean;
}

// Calculate reading time based on word count (average 200 words per minute)
const calculateReadingTime = (htmlContent: string): number => {
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

export const LessonContentRenderer = ({
  currentContent,
  sections,
  enrollmentId,
  enrolledAt,
  isFocusMode,
  setIsFocusMode,
  isDescriptionExpanded,
  setIsDescriptionExpanded,
  onMarkComplete,
  onNavigateNext,
  onNavigatePrevious,
  onVideoComplete,
  isAuthenticated = true,
  hasActiveSubscription = true,
}: LessonContentRendererProps) => {
  const allContent = sections.flatMap(s => s.content);

  if (!currentContent) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No content available
      </div>
    );
  }

  if (!currentContent.available) {
    const dripDelay = currentContent.drip_delay_days || 0;
    const daysSinceEnrollment = enrolledAt 
      ? Math.floor((Date.now() - new Date(enrolledAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const daysRemaining = dripDelay - daysSinceEnrollment;

    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Content Locked</h3>
        <p className="text-muted-foreground">
          This lesson will be available in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
        </p>
      </div>
    );
  }

  const currentSection = sections.find(s => s.content.some(c => c.id === currentContent.id));

  const renderDescription = () => {
    // Skip showing text_content here for audio - it's displayed as transcript with the audio player
    if (currentContent.content_type === 'audio') {
      if (currentSection?.description) {
        return (
          <Card>
            <CardHeader className="pb-2">
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Module Description
                </CardTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {calculateReadingTime(currentSection.description)} min read
                  </span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>
            </CardHeader>
            {isDescriptionExpanded && (
              <CardContent>
                <div 
                  className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground"
                  dangerouslySetInnerHTML={createSafeHtml(currentSection.description)}
                />
              </CardContent>
            )}
          </Card>
        );
      }
      return null;
    }
    
    // For non-audio content, check if lesson has its own text_content
    const descriptionContent = currentContent.text_content || currentSection?.description;
    if (descriptionContent) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lesson Description
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {calculateReadingTime(descriptionContent)} min read
                </span>
                {isDescriptionExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>
          </CardHeader>
          {isDescriptionExpanded && (
            <CardContent>
              <div 
                className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground"
                dangerouslySetInnerHTML={createSafeHtml(descriptionContent)}
              />
            </CardContent>
          )}
        </Card>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Title and Metadata - Always at Top */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold mb-2">{currentContent.title}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {currentContent.video_url && (
              <span className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                Video Lesson
              </span>
            )}
            {!currentContent.video_url && currentContent.text_content && (
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Text Lesson
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentContent.video_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              {isFocusMode ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
          {!currentContent.completed && (
            <Button onClick={() => onMarkComplete(currentContent.id)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Lesson Description */}
      {renderDescription()}

      {/* YouTube Video Content */}
      {currentContent.video_url && (
        <Card>
          <CardContent className="pt-6">
            <YouTubeLessonPlayer
              videoUrl={currentContent.video_url}
              isAuthenticated={isAuthenticated}
              hasActiveSubscription={hasActiveSubscription}
              onVideoComplete={onVideoComplete}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onNavigatePrevious}
          disabled={allContent.findIndex(c => c.id === currentContent.id) === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={onNavigateNext}
          disabled={
            allContent.findIndex(c => c.id === currentContent.id) === 
            allContent.length - 1
          }
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
