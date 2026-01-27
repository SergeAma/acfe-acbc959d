import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import mentorWalkthroughThumbnail from '@/assets/mentor-walkthrough-thumbnail.png';
import buildingCourseThumbnail from '@/assets/building-course-thumbnail.png';
import gettingStartedMentorThumbnail from '@/assets/getting-started-mentor-thumbnail.png';

interface VideoResource {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  embedUrl: string;
  thumbnail?: string;
}

// Extensible video resources array - add new videos here
const VIDEO_RESOURCES: VideoResource[] = [
  {
    id: 'walkthrough',
    title: 'Welcome to ACFE: Mentor Basics',
    titleFr: 'Bienvenue sur ACFE: Les Bases du Mentor',
    description: 'A complete walkthrough of the mentor platform',
    descriptionFr: 'Une présentation complète de la plateforme mentor',
    embedUrl: 'https://drive.google.com/file/d/1eAYdL3_k_xZmmWSs80xNUBmhvcbBCyBM/preview',
    thumbnail: mentorWalkthroughThumbnail,
  },
  {
    id: 'getting-started-mentor',
    title: 'Getting Started As ACFE Mentor',
    titleFr: 'Débuter en tant que Mentor ACFE',
    description: 'Everything you need to know to start mentoring',
    descriptionFr: 'Tout ce que vous devez savoir pour commencer à mentorer',
    embedUrl: 'https://drive.google.com/file/d/1oXwddexExAET87vwtCnR4oNb-m4XEHDb/preview',
    thumbnail: gettingStartedMentorThumbnail,
  },
  {
    id: 'building-first-course',
    title: 'Building Your First Course On ACFE',
    titleFr: 'Créer Votre Premier Cours sur ACFE',
    description: 'Learn how to build engaging courses step by step',
    descriptionFr: 'Apprenez à créer des cours captivants étape par étape',
    embedUrl: 'https://drive.google.com/file/d/13EtjM3xJOn7BbmJujyscE1guUvspul2f/preview',
    thumbnail: buildingCourseThumbnail,
  },
];

export const MentorVideoResources = () => {
  const { t } = useLanguage();
  const isFrench = t('sign_in') === 'Se Connecter';
  const [selectedVideo, setSelectedVideo] = useState<VideoResource | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VIDEO_RESOURCES.map((video) => (
          <button
            key={video.id}
            onClick={() => setSelectedVideo(video)}
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
            
            {/* Text Content */}
            <div className="p-2.5 sm:p-3 flex-1">
              <h4 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {isFrench ? video.titleFr : video.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
                {isFrench ? video.descriptionFr : video.description}
              </p>
            </div>
            
            {/* Watch indicator */}
            <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
              <span className="inline-flex items-center text-xs text-primary font-medium">
                {isFrench ? 'Regarder' : 'Watch'}
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Video Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>
              {selectedVideo && (isFrench ? selectedVideo.titleFr : selectedVideo.title)}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video bg-black">
            {selectedVideo && (
              <iframe
                src={selectedVideo.embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={selectedVideo.title}
              />
            )}
          </div>
          <div className="p-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedVideo && (isFrench ? selectedVideo.descriptionFr : selectedVideo.description)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
