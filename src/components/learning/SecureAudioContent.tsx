import { getAudioEmbedInfo, getAudioProviderDisplayName } from '@/lib/audio-utils';
import { Badge } from '@/components/ui/badge';
import { Music } from 'lucide-react';

interface SecureAudioContentProps {
  audioUrl: string;
}

export const SecureAudioContent = ({ audioUrl }: SecureAudioContentProps) => {
  const embedInfo = getAudioEmbedInfo(audioUrl);

  if (embedInfo.isExternal && embedInfo.embedUrl) {
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
