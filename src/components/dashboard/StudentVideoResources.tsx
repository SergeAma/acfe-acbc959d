import { useCallback } from 'react';
import { Play, ChevronRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import walkthroughThumbnail from '@/assets/walkthrough-thumbnail.png';

interface VideoResource {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  // Use /view URL for opening in new tab (not /preview which is blocked in iframes)
  viewUrl: string;
  thumbnail?: string;
}

// Extensible video resources array for students
const VIDEO_RESOURCES: VideoResource[] = [
  {
    id: 'acfe-walkthrough',
    title: 'Welcome to ACFE: Platform Walkthrough',
    titleFr: 'Bienvenue sur ACFE: Présentation de la Plateforme',
    description: 'Learn how to navigate the platform and make the most of your learning journey.',
    descriptionFr: 'Apprenez à naviguer sur la plateforme et à tirer le meilleur parti de votre parcours d\'apprentissage.',
    viewUrl: 'https://drive.google.com/file/d/1iyoiuHjCdADe8AyKT-CMPStolKgYqDDs/view?usp=sharing',
    thumbnail: walkthroughThumbnail,
  },
  // Future videos can be added here
];

export const StudentVideoResources = () => {
  const { t } = useLanguage();
  const isFrench = t('sign_in') === 'Se Connecter';

  const handleOpenVideo = useCallback((viewUrl: string) => {
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {VIDEO_RESOURCES.map((video) => (
        <button
          key={video.id}
          onClick={() => handleOpenVideo(video.viewUrl)}
          className="group relative flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-md transition-all text-left"
        >
          {/* Thumbnail / Placeholder */}
          <div className="relative aspect-video bg-muted flex items-center justify-center">
            {video.thumbnail ? (
              <img 
                src={video.thumbnail} 
                alt={isFrench ? video.titleFr : video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
            )}
            {/* Play button overlay - always visible */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
            {/* External link indicator */}
            <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
              <ExternalLink className="h-3 w-3 text-white" />
            </div>
          </div>
          
          {/* Text Content */}
          <div className="p-3 flex-1">
            <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {isFrench ? video.titleFr : video.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {isFrench ? video.descriptionFr : video.description}
            </p>
          </div>
          
          {/* Watch indicator */}
          <div className="px-3 pb-3">
            <span className="inline-flex items-center text-xs text-primary font-medium">
              {isFrench ? 'Regarder' : 'Watch'}
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
