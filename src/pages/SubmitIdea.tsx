import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, Video, Lightbulb, DollarSign, Users } from "lucide-react";

// Minimum time (in seconds) user must spend on form before submitting
const MIN_FORM_TIME_SECONDS = 15;
// Minimum description length to ensure thoughtful submissions
const MIN_DESCRIPTION_LENGTH = 50;

export function SubmitIdea() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formLoadTime = useRef<number>(Date.now());
  const { toast } = useToast();

  // Honeypot field - bots will fill this, humans won't see it
  const [honeypot, setHoneypot] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    ideaTitle: "",
    ideaDescription: "",
  });

  // Reset form load time when component mounts
  useEffect(() => {
    formLoadTime.current = Date.now();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a video smaller than 100MB",
          variant: "destructive",
        });
        return;
      }
      // Check file type
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a video file",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Spam check 1: Honeypot - if filled, it's a bot
    if (honeypot) {
      // Silently reject - don't give bots feedback
      setIsSubmitted(true);
      return;
    }

    // Spam check 2: Time-based validation - form filled too quickly
    const timeSpentSeconds = (Date.now() - formLoadTime.current) / 1000;
    if (timeSpentSeconds < MIN_FORM_TIME_SECONDS) {
      toast({
        title: "Please take your time",
        description: "Please review your submission carefully before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Spam check 3: Require minimum description length for thoughtful submissions
    if (!formData.ideaDescription || formData.ideaDescription.trim().length < MIN_DESCRIPTION_LENGTH) {
      toast({
        title: "Description too short",
        description: `Please provide at least ${MIN_DESCRIPTION_LENGTH} characters describing your idea to help us understand it better.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.fullName || !formData.email || !formData.ideaTitle) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let videoPath = null;
      let videoFilename = null;

      // Upload video if provided
      if (videoFile) {
        const fileExt = videoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        setUploadProgress(10);
        
        const { error: uploadError } = await supabase.storage
          .from("idea-videos")
          .upload(fileName, videoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setUploadProgress(70);

        // Store just the file path (bucket is now private, admins use signed URLs)
        videoPath = fileName;
        videoFilename = videoFile.name;
      }

      setUploadProgress(85);

      // Insert submission into database
      const { error: insertError } = await supabase.from("idea_submissions").insert({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        idea_title: formData.ideaTitle,
        idea_description: formData.ideaDescription || null,
        video_url: videoPath,
        video_filename: videoFilename,
      });

      if (insertError) throw insertError;

      setUploadProgress(95);

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-idea-confirmation', {
          body: {
            name: formData.fullName,
            email: formData.email,
            ideaTitle: formData.ideaTitle,
          },
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the whole submission if email fails
      }

      setUploadProgress(100);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-20">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="bg-card rounded-2xl p-10 shadow-lg border border-border">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Thank You for Your Submission!
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                We're excited to learn more about your idea. Our team will review your submission and 
                <strong className="text-foreground"> get in touch within 7 days</strong>.
              </p>
              <p className="text-muted-foreground mb-8">
                In the meantime, feel free to explore our courses and resources to help develop your skills further.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <a href="/courses">Explore Courses</a>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Submit Idea" }]} />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Submit Your Startup Idea
              </h1>
              <p className="text-lg text-muted-foreground">
                Got a vision that could transform Africa? We want to hear from you.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
              
              {/* Left Column - Info */}
              <div className="lg:col-span-2">
                <div className="bg-foreground text-background rounded-2xl p-8 sticky top-24">
                  <h2 className="text-2xl font-bold mb-4">
                    Innovator Incubator
                  </h2>
                  <p className="text-background/80 mb-6">
                    We believe in Africa's next generation of tech leaders. If you have an idea that could 
                    make a difference, we want to support you on your journey.
                  </p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Up to $500 Funding</h3>
                        <p className="text-sm text-background/70">
                          New founders are eligible for up to $500 in seed funding from our partner, 
                          Spectrogram Consulting.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Expert Mentorship</h3>
                        <p className="text-sm text-background/70">
                          Get 1-on-1 guidance from industry experts who've built successful startups.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Resources & Support</h3>
                        <p className="text-sm text-background/70">
                          Access tools, training, and a community of like-minded innovators.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-background/20 pt-6">
                    <p className="text-sm text-background/60">
                      <strong className="text-background">How it works:</strong> Submit a short video (3 min max) 
                      describing your idea. Our team reviews all submissions and responds within 7 days.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    Tell Us About Your Idea
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          placeholder="Your full name"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+254 7XX XXX XXX"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ideaTitle">Idea / Startup Name *</Label>
                      <Input
                        id="ideaTitle"
                        name="ideaTitle"
                        placeholder="What do you call your idea or startup?"
                        value={formData.ideaTitle}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ideaDescription">Brief Description *</Label>
                      <Textarea
                        id="ideaDescription"
                        name="ideaDescription"
                        placeholder="Briefly describe what problem you're solving and how... (minimum 50 characters)"
                        rows={4}
                        value={formData.ideaDescription}
                        onChange={handleInputChange}
                        required
                        minLength={MIN_DESCRIPTION_LENGTH}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.ideaDescription.length}/{MIN_DESCRIPTION_LENGTH} characters minimum
                      </p>
                    </div>

                    {/* Honeypot field - hidden from humans, visible to bots */}
                    <div className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden" aria-hidden="true">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    {/* Video Upload Section */}
                    <div className="space-y-2">
                      <Label>Upload Your Pitch Video *</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Record a 3-minute (max) video explaining your idea, the problem you're solving, 
                        and why you're the right person to build it.
                      </p>
                      
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                          videoFile
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoSelect}
                        />
                        
                        {videoFile ? (
                          <div className="space-y-2">
                            <Video className="h-12 w-12 text-primary mx-auto" />
                            <p className="font-medium text-foreground">{videoFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoFile(null);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                            <p className="font-medium text-foreground">
                              Click to upload your video
                            </p>
                            <p className="text-sm text-muted-foreground">
                              MP4, MOV, or WebM up to 100MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isSubmitting && (
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          {uploadProgress < 70
                            ? "Uploading video..."
                            : uploadProgress < 100
                            ? "Saving submission..."
                            : "Complete!"}
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-full"
                      disabled={isSubmitting || !videoFile || formData.ideaDescription.trim().length < MIN_DESCRIPTION_LENGTH}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Your Idea"}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you agree to our terms of service and privacy policy.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
