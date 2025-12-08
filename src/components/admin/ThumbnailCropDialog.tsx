import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Crop, RotateCcw, RotateCw, Loader2, ZoomIn } from 'lucide-react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useToast } from '@/hooks/use-toast';

interface ThumbnailCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgSrc: string;
  onSave: (croppedBlob: Blob) => void;
  onCancel: () => void;
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
}: ThumbnailCropDialogProps) => {
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [zoom, setZoom] = useState([1]);
  const [rotation, setRotation] = useState([0]);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

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
    }
  }, [open]);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop Thumbnail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex justify-center bg-muted rounded-lg p-4 min-h-[300px]">
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
                      style={{ maxHeight: '400px', maxWidth: '100%' }}
                    />
                  </ReactCrop>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-48 space-y-6">
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

              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                <p className="font-medium mb-1">16:9 aspect ratio</p>
                <p>Drag the crop area to select the best portion of your image</p>
              </div>
            </div>
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
