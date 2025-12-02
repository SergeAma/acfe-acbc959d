import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Crop, RotateCcw, RotateCw, Pencil, ImageIcon, Frame } from 'lucide-react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ProfileFrame } from '@/contexts/AuthContext';

interface ProfilePhotoEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgSrc: string;
  currentFrame: ProfileFrame;
  onSave: (croppedBlob: Blob, frame: ProfileFrame) => void;
  onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

const frameColors: Record<ProfileFrame, { ring: string; text: string; label: string }> = {
  none: { ring: 'ring-border', text: '', label: 'Original' },
  hiring: { ring: 'ring-purple-500', text: '#HIRING', label: '#Hiring' },
  open_to_work: { ring: 'ring-green-500', text: '#OPENTOWORK', label: '#OpenToWork' },
  looking_for_cofounder: { ring: 'ring-orange-500', text: '#COFOUNDER', label: '#CoFounder' },
};

export const ProfilePhotoEditor = ({
  open,
  onOpenChange,
  imgSrc,
  currentFrame,
  onSave,
  onCancel,
}: ProfilePhotoEditorProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [activeTab, setActiveTab] = useState<'crop' | 'frames'>('crop');
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [zoom, setZoom] = useState([1]);
  const [rotation, setRotation] = useState([0]);
  const [selectedFrame, setSelectedFrame] = useState<ProfileFrame>(currentFrame);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, 1);
    setCrop(initialCrop);
    setCompletedCrop(initialCrop); // Initialize completedCrop so save works immediately
  }, []);

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

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation[0] * Math.PI) / 180);
    ctx.scale(zoom[0], zoom[0]);
    ctx.translate(-outputSize / 2, -outputSize / 2);
    
    const scale = outputSize / pixelCrop.width;
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
        'image/jpeg',
        0.9
      );
    });
  };

  const handleSave = async () => {
    if (!imgRef.current || !completedCrop) return;
    const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
    onSave(croppedBlob, selectedFrame);
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
            Edit Profile Photo
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'crop' | 'frames')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crop" className="flex items-center gap-2">
              <Crop className="h-4 w-4" />
              Crop & Adjust
            </TabsTrigger>
            <TabsTrigger value="frames" className="flex items-center gap-2">
              <Frame className="h-4 w-4" />
              Frames
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crop" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex justify-center bg-muted rounded-lg p-4">
                {imgSrc && (
                  <div style={{ transform: `scale(${zoom[0]}) rotate(${rotation[0]}deg)` }}>
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                      aspect={1}
                      circularCrop
                    >
                      <img
                        ref={imgRef}
                        alt="Crop preview"
                        src={imgSrc}
                        onLoad={onImageLoad}
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
          </TabsContent>

          <TabsContent value="frames" className="space-y-4">
            <div className="flex justify-center py-4">
              <div className="relative">
                <img
                  src={imgSrc}
                  alt="Preview"
                  className={`w-48 h-48 rounded-full object-cover ring-4 ${frameColors[selectedFrame].ring}`}
                />
                {selectedFrame !== 'none' && (
                  <div
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-bold text-white ${
                      selectedFrame === 'hiring'
                        ? 'bg-purple-500'
                        : selectedFrame === 'open_to_work'
                        ? 'bg-green-500'
                        : 'bg-orange-500'
                    }`}
                  >
                    {frameColors[selectedFrame].text}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center gap-4 flex-wrap">
              {(Object.keys(frameColors) as ProfileFrame[]).map((frame) => (
                <button
                  key={frame}
                  onClick={() => setSelectedFrame(frame)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-colors ${
                    selectedFrame === frame ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={imgSrc}
                      alt={frame}
                      className={`w-16 h-16 rounded-full object-cover ring-2 ${frameColors[frame].ring}`}
                    />
                    {frame !== 'none' && (
                      <div
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded text-[8px] font-bold text-white ${
                          frame === 'hiring'
                            ? 'bg-purple-500'
                            : frame === 'open_to_work'
                            ? 'bg-green-500'
                            : 'bg-orange-500'
                        }`}
                      >
                        {frameColors[frame].text}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium">{frameColors[frame].label}</span>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!completedCrop}>
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
