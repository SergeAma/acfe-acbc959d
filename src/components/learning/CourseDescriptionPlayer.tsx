import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Video, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getVideoEmbedInfo, getProviderDisplayName } from '@/lib/video-utils';
import { getAudioEmbedInfo, getAudioProviderDisplayName } from '@/lib/audio-utils';
import { stripHtml } from '@/lib/html-utils';

interface CourseDescriptionPlayerProps {
  description: string;
  descriptionVideoUrl?: string | null;
  descriptionAudioUrl?: string | null;
  className?: string;
}

export const CourseDescriptionPlayer = ({
  description,
  descriptionVideoUrl,
  descriptionAudioUrl,
  className = '',
}: CourseDescriptionPlayerProps) => {
  const hasVideo = !!descriptionVideoUrl;
  const hasAudio = !!descriptionAudioUrl;
  const hasMedia = hasVideo || hasAudio;
  
  // Default to text if no media, otherwise video if available, then audio
  const defaultTab = hasVideo ? 'video' : hasAudio ? 'audio' : 'text';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderVideoPlayer = () => {
    if (!descriptionVideoUrl) return null;
    
    const embedInfo = getVideoEmbedInfo(descriptionVideoUrl);
    
    if (embedInfo.isExternal && embedInfo.embedUrl) {
      return (
        <div className="space-y-2">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={embedInfo.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Course introduction video"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Video className="h-3 w-3 mr-1" />
              {getProviderDisplayName(embedInfo.provider)}
            </Badge>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <video controls className="w-full rounded-lg">
          <source src={descriptionVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <Badge variant="secondary" className="text-xs">
          <Video className="h-3 w-3 mr-1" />
          Video
        </Badge>
      </div>
    );
  };

  const renderAudioPlayer = () => {
    if (!descriptionAudioUrl) return null;
    
    const embedInfo = getAudioEmbedInfo(descriptionAudioUrl);
    
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
    
    if (embedInfo.isExternal && embedInfo.embedUrl) {
      return (
        <div className="space-y-2">
          <div className="relative w-full rounded-lg overflow-hidden">
            <iframe
              src={embedInfo.embedUrl}
              className="w-full border-0"
              style={{ height: getEmbedHeight() }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Course introduction audio"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Music className="h-3 w-3 mr-1" />
              {getAudioProviderDisplayName(embedInfo.provider)}
            </Badge>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <audio controls className="w-full">
          <source src={descriptionAudioUrl} />
          Your browser does not support the audio element.
        </audio>
        <Badge variant="secondary" className="text-xs">
          <Music className="h-3 w-3 mr-1" />
          Audio
        </Badge>
      </div>
    );
  };

  // If no media available, just show the text description
  if (!hasMedia) {
    return (
      <p className={`text-lg text-muted-foreground ${className}`}>
        {stripHtml(description)}
      </p>
    );
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="text" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Read
          </TabsTrigger>
          {hasVideo && (
            <TabsTrigger value="video" className="gap-1.5">
              <Video className="h-4 w-4" />
              Watch
            </TabsTrigger>
          )}
          {hasAudio && (
            <TabsTrigger value="audio" className="gap-1.5">
              <Music className="h-4 w-4" />
              Listen
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="text" className="mt-0">
          <p className="text-lg text-muted-foreground">
            {stripHtml(description)}
          </p>
        </TabsContent>

        {hasVideo && (
          <TabsContent value="video" className="mt-0">
            {renderVideoPlayer()}
          </TabsContent>
        )}

        {hasAudio && (
          <TabsContent value="audio" className="mt-0">
            {renderAudioPlayer()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
