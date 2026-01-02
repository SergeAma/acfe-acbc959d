import { useState } from 'react';
import { getAudioEmbedInfo, getAudioProviderDisplayName } from '@/lib/audio-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, FileText, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { createSafeHtml } from '@/lib/sanitize-html';

interface SecureAudioContentProps {
  audioUrl: string;
  transcript?: string | null;
}

// Calculate reading time based on word count
const calculateReadingTime = (htmlContent: string): number => {
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

export const SecureAudioContent = ({ audioUrl, transcript }: SecureAudioContentProps) => {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);
  const embedInfo = getAudioEmbedInfo(audioUrl);

  // Determine height based on provider
  const getEmbedHeight = () => {
    switch (embedInfo.provider) {
      case 'spotify':
        return '352px';
      case 'soundcloud':
        return '166px';
      case 'apple_music':
        return '175px';
      case 'youtube_music':
        return '315px';
      default:
        return '152px';
    }
  };

  const renderAudioPlayer = () => {
    if (embedInfo.isExternal && embedInfo.embedUrl) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <Badge variant="secondary">
              {getAudioProviderDisplayName(embedInfo.provider)}
            </Badge>
          </div>
          <div className="relative w-full rounded-lg overflow-hidden">
            <iframe
              src={embedInfo.embedUrl}
              className="w-full border-0"
              style={{ height: getEmbedHeight() }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Audio content"
            />
          </div>
        </div>
      );
    }

    // Direct audio file
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <Badge variant="secondary">Audio</Badge>
        </div>
        <audio controls className="w-full">
          <source src={audioUrl} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderAudioPlayer()}

      {/* Transcript Section */}
      {transcript && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <button
              onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcript / Show Notes
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {calculateReadingTime(transcript)} min read
                </span>
                {isTranscriptExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>
          </CardHeader>
          {isTranscriptExpanded && (
            <CardContent>
              <div 
                className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
                dangerouslySetInnerHTML={createSafeHtml(transcript)}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};
