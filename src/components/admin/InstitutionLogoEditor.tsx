import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Crop, RotateCcw, RotateCw, Pencil, Loader2, Upload } from 'lucide-react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useToast } from '@/hooks/use-toast';

interface InstitutionLogoEditorProps {
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

export const InstitutionLogoEditor = ({
  open,
  onOpenChange,
  imgSrc,
  onSave,
  onCancel,
}: InstitutionLogoEditorProps) => {
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [zoom, setZoom] = useState([1]);
  const [rotation, setRotation] = useState([0]);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset state when dialog opens with new image
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
    const initialCrop = centerAspectCrop(width, height, 1);
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
    setImageError(false);
  }, []);

  const onImageError = useCallback(() => {
    setImageError(true);
    toast({
      title: 'Image failed to load',
      description: 'Please try uploading a different image',
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
    
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    // Fill with white background for transparent images
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation[0] * Math.PI) / 180);
    ctx.scale(zoom[0], zoom[0]);
    ctx.translate(-outputSize / 2, -outputSize / 2);
    
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputSize,
      outputSize
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
        'image/png',
        0.95
      );
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!imgRef.current || !completedCrop) {
        toast({
          title: 'Cannot save',
          description: 'Please adjust the crop area first',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      onSave(croppedBlob);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try uploading a new image';
      toast({
        title: 'Failed to process image',
        description: message,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Institution Logo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex justify-center bg-muted rounded-lg p-4">
              {imgSrc && (
                <div style={{ transform: `scale(${zoom[0]}) rotate(${rotation[0]}deg)` }}>
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                    aspect={1}
                  >
                    <img
                      ref={imgRef}
                      alt="Crop preview"
                      src={imgSrc}
                      crossOrigin="anonymous"
                      onLoad={onImageLoad}
                      onError={onImageError}
                      style={{ maxHeight: '300px' }}
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
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation([rotation[0] + 90])}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Zoom</label>
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!completedCrop || saving || imageError}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Logo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
