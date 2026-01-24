import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Video, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import walkthroughThumbnail from '@/assets/walkthrough-thumbnail.png';

interface VideoResource {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  embedUrl: string;
  thumbnail?: string;
}

// Extensible video resources array for students
const VIDEO_RESOURCES: VideoResource[] = [
  {
    id: 'acfe-walkthrough',
    title: 'Welcome to ACFE: Platform Walkthrough',
    titleFr: 'Bienvenue sur ACFE: Présentation de la Plateforme',
    description: 'Learn how to navigate the platform and make the most of your learning journey',
    descriptionFr: 'Apprenez à naviguer sur la plateforme et à tirer le meilleur parti de votre parcours d\'apprentissage',
    embedUrl: 'https://drive.google.com/file/d/1DL-RLfI-qR3u_-WQvfvKHUYjY_GqnYDe/preview',
    thumbnail: walkthroughThumbnail,
  },
  // Future videos can be added here
];

export const StudentVideoResources = () => {
  const { t } = useLanguage();
  const isFrench = t('sign_in') === 'Se Connecter';
  const [selectedVideo, setSelectedVideo] = useState<VideoResource | null>(null);

  return (
    <>
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Video className="h-5 w-5 text-primary" />
            {isFrench ? 'Regarder les Ressources Vidéo' : 'Watch Video Resources'}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                    </div>
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
        </CardContent>
      </Card>

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
