import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Square, RotateCcw, Check, Camera, AlertCircle } from 'lucide-react';

interface VideoRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoRecorded: (file: File) => void;
  maxDurationSeconds?: number;
}

export function VideoRecorderDialog({
  open,
  onOpenChange,
  onVideoRecorded,
  maxDurationSeconds = 180, // 3 minutes default
}: VideoRecorderDialogProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  // Initialize camera when dialog opens
  useEffect(() => {
    if (open) {
      initCamera();
    } else {
      cleanup();
      setStatus('idle');
      setRecordedBlob(null);
      setRecordingTime(0);
      setErrorMessage('');
    }
    return cleanup;
  }, [open, cleanup]);

  const initCamera = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      setStatus('idle');
    } catch (err: any) {
      console.error('Camera access error:', err);
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else {
        setErrorMessage('Unable to access camera. Please check your device settings.');
      }
    }
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    
    // Determine best supported mime type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setStatus('recorded');
      
      // Show preview of recorded video
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
        videoRef.current.play();
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    setStatus('recording');
    setRecordingTime(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        if (newTime >= maxDurationSeconds) {
          stopRecording();
        }
        return newTime;
      });
    }, 1000);
  }, [maxDurationSeconds]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Stop the live stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setStatus('idle');
    initCamera();
  }, []);

  const confirmRecording = useCallback(() => {
    if (!recordedBlob) return;
    
    const extension = recordedBlob.type.includes('webm') ? 'webm' : 'mp4';
    const file = new File([recordedBlob], `recorded-video-${Date.now()}.${extension}`, {
      type: recordedBlob.type,
    });
    
    onVideoRecorded(file);
    onOpenChange(false);
  }, [recordedBlob, onVideoRecorded, onOpenChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Record Your Pitch Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {status === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-3" />
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={initCamera}>
                  Try Again
                </Button>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay={status !== 'recorded'}
                loop={status === 'recorded'}
              />
            )}

            {/* Recording indicator */}
            {status === 'recording' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                REC {formatTime(recordingTime)} / {formatTime(maxDurationSeconds)}
              </div>
            )}

            {/* Recorded badge */}
            {status === 'recorded' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                <Video className="h-4 w-4" />
                {formatTime(recordingTime)} recorded
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {status === 'idle' && !errorMessage && (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Video className="h-5 w-5" />
                Start Recording
              </Button>
            )}

            {status === 'recording' && (
              <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                <Square className="h-5 w-5" />
                Stop Recording
              </Button>
            )}

            {status === 'recorded' && (
              <>
                <Button onClick={retake} variant="outline" size="lg" className="gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Retake
                </Button>
                <Button onClick={confirmRecording} size="lg" className="gap-2">
                  <Check className="h-5 w-5" />
                  Use This Video
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Maximum recording length: {Math.floor(maxDurationSeconds / 60)} minutes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
