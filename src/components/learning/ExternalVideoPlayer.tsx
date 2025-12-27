import { getVideoEmbedInfo, getProviderDisplayName } from '@/lib/video-utils';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Youtube, Video } from 'lucide-react';

interface ExternalVideoPlayerProps {
  videoUrl: string;
}

export const ExternalVideoPlayer = ({ videoUrl }: ExternalVideoPlayerProps) => {
  const embedInfo = getVideoEmbedInfo(videoUrl);

  if (!embedInfo.embedUrl) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Unable to load video</p>
      </div>
    );
  }

  const getProviderIcon = () => {
    switch (embedInfo.provider) {
      case 'youtube':
        return <Youtube className="h-3.5 w-3.5" />;
      default:
        return <ExternalLink className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedInfo.embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Video player"
        />
      </div>
      <div className="flex items-center justify-end">
        <Badge variant="secondary" className="gap-1.5 text-xs">
          {getProviderIcon()}
          {getProviderDisplayName(embedInfo.provider)}
        </Badge>
      </div>
    </div>
  );
};
