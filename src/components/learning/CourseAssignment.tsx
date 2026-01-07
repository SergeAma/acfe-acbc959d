import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Upload, Video, FileText, CheckCircle, Clock, AlertCircle, Send, ExternalLink, Link2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createSafeHtml } from '@/lib/sanitize-html';
import { isValidVideoUrl } from '@/lib/video-utils';

interface CourseAssignmentProps {
  courseId: string;
  enrollmentId: string;
  onComplete: (approved: boolean) => void;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  is_required: boolean;
  allow_video: boolean;
  allow_file: boolean;
  allow_text: boolean;
}

interface Submission {
  id: string;
  text_content: string | null;
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  status: 'pending' | 'approved' | 'revision_requested';
  mentor_feedback: string | null;
  submitted_at: string;
}

export const CourseAssignment = ({ courseId, enrollmentId, onComplete }: CourseAssignmentProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [textContent, setTextContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [spectrogramConsent, setSpectrogramConsent] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileUrl, setVideoFileUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoTab, setVideoTab] = useState<'upload' | 'link'>('upload');
  const [videoDurationError, setVideoDurationError] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignment();
  }, [courseId, enrollmentId]);

  const fetchAssignment = async () => {
    setLoading(true);

    // Fetch assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('course_assignments')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle();

    if (assignmentError || !assignmentData) {
      setLoading(false);
      return;
    }

    setAssignment(assignmentData);

    // Check for existing submission
    const { data: submissionData } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (submissionData) {
      const typedSubmission = { ...submissionData, status: submissionData.status as 'pending' | 'approved' | 'revision_requested' };
      setSubmission(typedSubmission);
      setTextContent(submissionData.text_content || '');
      setVideoUrl(submissionData.video_url || '');
      setFileUrl(submissionData.file_url || '');
      setFileName(submissionData.file_name || '');
      
      if (typedSubmission.status === 'approved') {
        onComplete(true);
      }
    }

    setLoading(false);
  };

  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        if (duration > 60) {
          setVideoDurationError(`Video is ${Math.round(duration)} seconds. Maximum allowed is 60 seconds (1 minute).`);
          resolve(false);
        } else {
          setVideoDurationError('');
          resolve(true);
        }
      };
      
      video.onerror = () => {
        // If we can't read metadata, allow upload but warn
        setVideoDurationError('');
        resolve(true);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleVideoFileUpload = async (selectedFile: File) => {
    if (!user || !assignment) return;
    
    // Check file type
    if (!selectedFile.type.startsWith('video/')) {
      toast({ title: 'Error', description: 'Please select a video file', variant: 'destructive' });
      return;
    }
    
    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast({ title: 'Error', description: 'Video must be under 100MB', variant: 'destructive' });
      return;
    }
    
    // Validate duration
    const isValidDuration = await validateVideoDuration(selectedFile);
    if (!isValidDuration) {
      toast({ title: 'Error', description: 'Video must be 1 minute or less', variant: 'destructive' });
      return;
    }
    
    setUploadingVideo(true);
    setVideoFile(selectedFile);

    const fileExt = selectedFile.name.split('.').pop();
    const filePath = `assignments/${user.id}/${assignment.id}/video_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(filePath, selectedFile, { upsert: false });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      toast({ 
        title: 'Upload Error', 
        description: uploadError.message || 'Failed to upload video. Please try again.', 
        variant: 'destructive' 
      });
      setUploadingVideo(false);
      setVideoFile(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('course-files')
      .getPublicUrl(filePath);

    setVideoFileUrl(publicUrl);
    setVideoFileName(selectedFile.name);
    setVideoUrl(''); // Clear link if file uploaded
    setUploadingVideo(false);
    toast({ title: 'Success', description: 'Video uploaded' });
  };

  const handleFileUpload = async (selectedFile: File) => {
    if (!user || !assignment) return;
    
    setUploading(true);
    setFile(selectedFile);

    const fileExt = selectedFile.name.split('.').pop();
    const filePath = `assignments/${user.id}/${assignment.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(filePath, selectedFile, { upsert: false });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      toast({ 
        title: 'Upload Error', 
        description: uploadError.message || 'Failed to upload file. Please try again.', 
        variant: 'destructive' 
      });
      setUploading(false);
      setFile(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('course-files')
      .getPublicUrl(filePath);

    setFileUrl(publicUrl);
    setFileName(selectedFile.name);
    setUploading(false);
    toast({ title: 'Success', description: 'File uploaded' });
  };

  const clearVideoUpload = () => {
    setVideoFile(null);
    setVideoFileUrl('');
    setVideoFileName('');
    setVideoDurationError('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const submitAssignment = async () => {
    if (!assignment || !user) return;
    
    // Determine final video URL (file upload takes precedence)
    const finalVideoUrl = videoFileUrl || videoUrl;
    
    // Validate at least one field is filled
    if (!textContent && !finalVideoUrl && !fileUrl) {
      toast({ 
        title: 'Error', 
        description: 'Please provide at least one type of submission (text, video, or file)', 
        variant: 'destructive' 
      });
      return;
    }

    // Validate Spectrogram consent
    if (!spectrogramConsent) {
      toast({ 
        title: 'Consent Required', 
        description: 'You must agree to share your submission with Spectrogram Consulting to complete this course.', 
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);

    const submissionData = {
      assignment_id: assignment.id,
      student_id: user.id,
      enrollment_id: enrollmentId,
      text_content: textContent || null,
      video_url: finalVideoUrl || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      status: 'pending' as const,
    };

    let result;
    
    if (submission) {
      // Update existing submission
      result = await supabase
        .from('assignment_submissions')
        .update({
          ...submissionData,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', submission.id)
        .select()
        .single();
    } else {
      // Create new submission
      result = await supabase
        .from('assignment_submissions')
        .insert(submissionData)
        .select()
        .single();
    }

    if (result.error) {
      toast({ title: 'Error', description: 'Failed to submit assignment', variant: 'destructive' });
    } else {
      setSubmission(result.data);
      toast({ title: 'Success', description: 'Assignment submitted for review' });
      
      // Send email notification to mentor
      try {
        const { data: courseData } = await supabase
          .from('courses')
          .select('mentor_id, title')
          .eq('id', courseId)
          .single();
        
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (courseData) {
          await supabase.functions.invoke('send-assignment-submission-notification', {
            body: {
              mentorId: courseData.mentor_id,
              studentName: studentProfile?.full_name || 'A student',
              courseTitle: courseData.title,
              assignmentTitle: assignment.title,
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't show error to user as submission was successful
      }
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading assignment...
        </CardContent>
      </Card>
    );
  }

  if (!assignment) {
    return null;
  }

  // Show submission status
  if (submission && submission.status !== 'revision_requested') {
    return (
      <Card>
        <CardHeader className="text-center">
          {submission.status === 'pending' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle>Assignment Submitted</CardTitle>
              <CardDescription>
                Your assignment is being reviewed by your mentor. You'll be notified once it's approved.
              </CardDescription>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Assignment Approved!</CardTitle>
              <CardDescription>
                Great work! Your assignment has been approved.
              </CardDescription>
              {submission.mentor_feedback && (
                <div className="p-4 bg-muted rounded-lg text-left w-full mt-2">
                  <p className="text-sm font-medium mb-1">Mentor Feedback:</p>
                  <p className="text-sm text-muted-foreground">{submission.mentor_feedback}</p>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="font-medium">Your Submission:</p>
            {submission.text_content && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground line-clamp-3">{submission.text_content}</p>
              </div>
            )}
            {submission.video_url && (
              <div className="space-y-2">
                {/* Show video player for direct uploads, link for external URLs */}
                {submission.video_url.includes('supabase') || submission.video_url.includes('course-files') ? (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video 
                      src={submission.video_url} 
                      controls 
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  </div>
                ) : (
                  <a 
                    href={submission.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Video className="h-4 w-4" />
                    Video submission
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
            {submission.file_url && (
              <a 
                href={submission.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                {submission.file_name || 'File submission'}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          {assignment.title}
        </CardTitle>
        <CardDescription>{assignment.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revision requested alert */}
        {submission?.status === 'revision_requested' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Revision Requested</p>
                <p className="text-sm text-amber-700 mt-1">{submission.mentor_feedback}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assignment Instructions</Label>
            <div 
              className="prose prose-sm max-w-none p-4 bg-muted/50 rounded-lg [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:text-sm [&>p]:mb-2 [&>ol]:pl-4 [&>ol]:space-y-1 [&>ul]:pl-4 [&>ul]:space-y-1 [&>li]:text-sm"
              dangerouslySetInnerHTML={createSafeHtml(assignment.instructions)}
            />
          </div>
        )}

        {/* Text submission */}
        {assignment.allow_text && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Written Response
            </Label>
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Write your response here..."
              rows={6}
            />
          </div>
        )}

        {/* Video submission - Upload or Link */}
        {assignment.allow_video && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Submission
              <Badge variant="outline" className="ml-2 font-normal text-xs">Max 1 minute</Badge>
            </Label>
            
            <Tabs value={videoTab} onValueChange={(v) => setVideoTab(v as 'upload' | 'link')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Video
                </TabsTrigger>
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Share Link
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-3">
                {videoFileUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video 
                        src={videoFileUrl} 
                        controls 
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{videoFileName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearVideoUpload}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      id="video-upload"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) handleVideoFileUpload(selectedFile);
                      }}
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {uploadingVideo ? 'Uploading video...' : 'Click to upload a video'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, MOV, WebM (max 100MB, max 1 minute)
                      </p>
                    </label>
                  </div>
                )}
                {videoDurationError && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {videoDurationError}
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="link" className="mt-3 space-y-2">
                <Input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    if (e.target.value) {
                      clearVideoUpload(); // Clear file upload if link is entered
                    }
                  }}
                  placeholder="https://youtube.com/... or https://vimeo.com/..."
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link from YouTube, Vimeo, Loom, or any video hosting platform
                </p>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* File upload */}
        {assignment.allow_file && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              File Upload
            </Label>
            {fileUrl ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{fileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFileUrl(''); setFileName(''); setFile(null); }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileUpload(selectedFile);
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload a file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, PPT, or other documents
                  </p>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Spectrogram consent - mandatory */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-background flex items-center justify-center border">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Spectrogram Consulting Partnership</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your submission will be shared with Spectrogram Consulting's talent network, giving you access to potential job opportunities with their partner companies.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-3 border-t border-primary/10">
            <Checkbox 
              id="spectrogram-consent"
              checked={spectrogramConsent}
              onCheckedChange={(checked) => setSpectrogramConsent(checked === true)}
              className="mt-0.5"
            />
            <label 
              htmlFor="spectrogram-consent" 
              className="text-sm cursor-pointer select-none leading-relaxed"
            >
              <span className="font-medium">I agree</span> to share my submission with Spectrogram Consulting for recruitment and job matching purposes.
              <span className="text-destructive ml-1">*</span>
            </label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button 
          onClick={submitAssignment} 
          className="w-full" 
          disabled={submitting || uploading || uploadingVideo || !spectrogramConsent}
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Submitting...' : submission ? 'Resubmit Assignment' : 'Submit Assignment'}
        </Button>
        {!spectrogramConsent && (
          <p className="text-xs text-muted-foreground text-center">
            You must agree to share with Spectrogram Consulting to complete this course
          </p>
        )}
      </CardFooter>
    </Card>
  );
};
