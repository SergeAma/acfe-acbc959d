import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Crop, RotateCcw, RotateCw, Loader2, ZoomIn, Eye } from 'lucide-react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useToast } from '@/hooks/use-toast';

interface ThumbnailCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgSrc: string;
  onSave: (croppedBlob: Blob) => void;
  onCancel: () => void;
  courseTitle?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export const ThumbnailCropDialog = ({
  open,
  onOpenChange,
  imgSrc,
  onSave,
  onCancel,
  courseTitle = 'Course Title',
}: ThumbnailCropDialogProps) => {
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [zoom, setZoom] = useState([1]);
  const [rotation, setRotation] = useState([0]);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Aspect ratio for thumbnails (16:9)
  const ASPECT_RATIO = 16 / 9;

  useEffect(() => {
    if (open) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setZoom([1]);
      setRotation([0]);
      setSaving(false);
      setImageError(false);
      setPreviewUrl(null);
    }
  }, [open]);

  // Update preview when crop changes
  useEffect(() => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const pixelCrop = {
      x: (completedCrop.x / 100) * image.width * scaleX,
      y: (completedCrop.y / 100) * image.height * scaleY,
      width: (completedCrop.width / 100) * image.width * scaleX,
      height: (completedCrop.height / 100) * image.height * scaleY,
    };
    
    const outputWidth = 400;
    const outputHeight = 225;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.save();
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotation[0] * Math.PI) / 180);
    ctx.scale(zoom[0], zoom[0]);
    ctx.translate(-outputWidth / 2, -outputHeight / 2);
    
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );
    ctx.restore();

    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
  }, [completedCrop, zoom, rotation]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, ASPECT_RATIO);
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
    setImageError(false);
  }, []);

  const onImageError = useCallback(() => {
    setImageError(true);
    toast({
      title: 'Image failed to load',
      description: 'Please try a different image',
      variant: 'destructive',
    });
  }, [toast]);

  const getCroppedImg = async (image: HTMLImageElement, crop: CropType): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    };
    
    // Output at 800x450 for optimal thumbnail size
    const outputWidth = 800;
    const outputHeight = 450;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    ctx.save();
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotation[0] * Math.PI) / 180);
    ctx.scale(zoom[0], zoom[0]);
    ctx.translate(-outputWidth / 2, -outputHeight / 2);
    
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );
    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.85
      );
    });
  };

  const handleSave = async () => {
    if (!imgRef.current || !completedCrop) {
      toast({
        title: 'Cannot save',
        description: 'Please adjust the crop area first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      onSave(croppedBlob);
    } catch (error: any) {
      console.error('Error cropping image:', error);
      toast({
        title: 'Failed to process image',
        description: error.message || 'Please try a different image',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  const resetAdjustments = () => {
    setZoom([1]);
    setRotation([0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="crop-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop Thumbnail
          </DialogTitle>
          <p id="crop-dialog-description" className="sr-only">
            Crop and adjust your course thumbnail image. Use the controls to zoom, rotate, and position your image.
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr,auto] gap-6">
          {/* Left side: Crop area */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex justify-center bg-muted rounded-lg p-4 min-h-[280px]">
                {imgSrc && (
                  <div style={{ transform: `scale(${zoom[0]}) rotate(${rotation[0]}deg)` }}>
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                      aspect={ASPECT_RATIO}
                    >
                      <img
                        ref={imgRef}
                        alt="Crop preview"
                        src={imgSrc}
                        onLoad={onImageLoad}
                        onError={onImageError}
                        style={{ maxHeight: '350px', maxWidth: '100%' }}
                      />
                    </ReactCrop>
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-40 space-y-4">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRotation([rotation[0] - 90])}
                    title="Rotate left"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRotation([rotation[0] + 90])}
                    title="Rotate right"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </label>
                  <Slider
                    value={zoom}
                    onValueChange={setZoom}
                    min={0.5}
                    max={2}
                    step={0.1}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Straighten</label>
                  <Slider
                    value={rotation}
                    onValueChange={setRotation}
                    min={-45}
                    max={45}
                    step={1}
                  />
                </div>
                
                <Button variant="ghost" size="sm" onClick={resetAdjustments} className="w-full">
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Right side: Card preview */}
          <div className="md:w-64 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" />
              Card Preview
            </div>
            <Card className="overflow-hidden shadow-lg">
              <div className="aspect-video bg-muted overflow-hidden">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Card preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Preview loading...
                  </div>
                )}
              </div>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm line-clamp-2">{courseTitle}</CardTitle>
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Category
                  </span>
                  <span className="text-[10px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded">
                    Level
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  Course description preview text...
                </p>
                <div className="mt-2">
                  <div className="h-7 bg-primary rounded text-[10px] flex items-center justify-center text-primary-foreground font-medium">
                    View Course
                  </div>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              This is how your thumbnail will appear on course cards
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!completedCrop || saving || imageError}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
