import { useSignedContentUrl } from '@/hooks/use-signed-content-url';
import { SecureVideoPlayer } from '@/components/learning/SecureVideoPlayer';
import { ExternalVideoPlayer } from '@/components/learning/ExternalVideoPlayer';
import { Button } from '@/components/ui/button';
import { Loader2, File, Download, AlertCircle } from 'lucide-react';
import { getVideoEmbedInfo } from '@/lib/video-utils';

interface SecureVideoContentProps {
  contentId: string;
  videoUrl: string;
  enrollmentId: string;
  userEmail?: string;
  hasActiveSubscription?: boolean;
  isPreviewMode?: boolean;
  onBookmark?: (timestamp: number) => void;
  onVideoComplete?: () => void;
}

export const SecureVideoContent = ({
  contentId,
  videoUrl,
  enrollmentId,
  userEmail,
  hasActiveSubscription = false,
  isPreviewMode = false,
  onBookmark,
  onVideoComplete,
}: SecureVideoContentProps) => {
  const { signedUrl, isLoading, error, isExternal } = useSignedContentUrl({
    contentId,
    originalUrl: videoUrl,
    urlType: 'video',
    enabled: !!contentId && !!videoUrl,
  });

  if (isLoading) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p>Unable to load video</p>
        {error && <p className="text-sm">{error}</p>}
      </div>
    );
  }

  // Check if it's an external video (YouTube, Vimeo, etc.)
  const embedInfo = getVideoEmbedInfo(signedUrl);
  if (isExternal || embedInfo.isExternal) {
    return (
      <ExternalVideoPlayer
        key={contentId} // Force clean remount on content change
        videoUrl={signedUrl}
        contentId={contentId}
        enrollmentId={enrollmentId}
        userEmail={userEmail}
        hasActiveSubscription={hasActiveSubscription}
        isPreviewMode={isPreviewMode}
        onVideoComplete={onVideoComplete}
      />
    );
  }

  return (
    <SecureVideoPlayer
      videoUrl={signedUrl}
      contentId={contentId}
      enrollmentId={enrollmentId}
      onBookmark={onBookmark}
      onVideoComplete={onVideoComplete}
    />
  );
};

interface SecureFileContentProps {
  contentId: string;
  fileUrl: string;
  fileName: string | null;
}

export const SecureFileContent = ({
  contentId,
  fileUrl,
  fileName,
}: SecureFileContentProps) => {
  const { signedUrl, isLoading, error } = useSignedContentUrl({
    contentId,
    originalUrl: fileUrl,
    urlType: 'file',
    enabled: !!contentId && !!fileUrl,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <File className="h-8 w-8 text-primary" />
          <div>
            <p className="font-medium">{fileName || 'File'}</p>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <File className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">{fileName || 'File'}</p>
            <p className="text-sm text-destructive">Unable to load file</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <File className="h-8 w-8 text-primary" />
        <div>
          <p className="font-medium">{fileName || 'File'}</p>
          <p className="text-sm text-muted-foreground">Downloadable file</p>
        </div>
      </div>
      <Button asChild>
        <a href={signedUrl} download target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4 mr-2" />
          Download
        </a>
      </Button>
    </div>
  );
};
