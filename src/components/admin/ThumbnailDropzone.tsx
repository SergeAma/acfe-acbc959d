import { useState, useRef, useCallback } from 'react';
import { Upload, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThumbnailCropDialog } from './ThumbnailCropDialog';

interface ThumbnailDropzoneProps {
  currentThumbnail?: string | null;
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  courseTitle?: string;
}

export const ThumbnailDropzone = ({ 
  currentThumbnail, 
  onUpload, 
  uploading = false,
  courseTitle,
}: ThumbnailDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const openCropDialog = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageSrc(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      openCropDialog(files[0]);
    }
  }, [openCropDialog]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      openCropDialog(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropSave = async (croppedBlob: Blob) => {
    setCropDialogOpen(false);
    setSelectedImageSrc(null);
    // Convert blob to File for the upload handler
    const file = new File([croppedBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
    await onUpload(file);
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setSelectedImageSrc(null);
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200",
            "hover:border-primary/50 hover:bg-primary/5",
            isDragging && "border-primary bg-primary/10 scale-[1.02]",
            uploading && "pointer-events-none opacity-70",
            currentThumbnail ? "p-2" : "p-8"
          )}
        >
          {uploading && (
            <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            </div>
          )}

          {currentThumbnail ? (
            <div className="relative group">
              <img 
                src={currentThumbnail} 
                alt="Course thumbnail" 
                className="w-full aspect-video object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <div className="text-white text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Click or drop to replace</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className={cn(
                "rounded-full p-4 mb-4 transition-colors",
                isDragging ? "bg-primary/20" : "bg-muted"
              )}>
                <Image className={cn(
                  "h-8 w-8 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <p className="text-sm font-medium mb-1">
                {isDragging ? "Drop image here" : "Drag & drop thumbnail"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, WEBP, HEIC • Max 10MB
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You'll be able to crop and adjust before saving
        </p>
      </div>

      {selectedImageSrc && (
        <ThumbnailCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imgSrc={selectedImageSrc}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
          courseTitle={courseTitle}
        />
      )}
    </>
  );
};
