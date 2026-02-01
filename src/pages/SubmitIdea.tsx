import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, Video, Lightbulb, DollarSign, Users, Rocket, Save, Camera } from "lucide-react";
import { FormProgressStepper } from "@/components/FormProgressStepper";
import { Confetti } from "@/components/Confetti";
import { PhoneInput } from "@/components/ui/phone-input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { VideoRecorderDialog } from "@/components/VideoRecorderDialog";
import { COUNTRY_NAMES, GLOBAL_CITIES } from "@/data";

const STORAGE_KEY = "acfe-idea-submission-draft";
const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

// Minimum time (in seconds) user must spend on form before submitting
const MIN_FORM_TIME_SECONDS = 15;
// Minimum description length to ensure thoughtful submissions
const MIN_DESCRIPTION_LENGTH = 50;
export function SubmitIdea() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formLoadTime = useRef<number>(Date.now());
  const {
    toast
  } = useToast();
  const {
    user,
    profile
  } = useAuth();
  const { t } = useLanguage();
  const [showRecorder, setShowRecorder] = useState(false);

  // Turnstile CAPTCHA state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Honeypot field - bots will fill this, humans won't see it
  const [honeypot, setHoneypot] = useState("");
  const [formData, setFormData] = useState(() => {
    // Load saved draft from localStorage on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            fullName: parsed.fullName || "",
            email: parsed.email || "",
            phone: parsed.phone || "",
            gender: parsed.gender || "",
            country: parsed.country || "",
            city: parsed.city || "",
            ideaTitle: parsed.ideaTitle || "",
            ideaDescription: parsed.ideaDescription || "",
            startupWebsite: parsed.startupWebsite || ""
          };
        } catch {
          // Invalid JSON, use defaults
        }
      }
    }
    return {
      fullName: "",
      email: "",
      phone: "",
      gender: "" as 'male' | 'female' | '',
      country: "",
      city: "",
      ideaTitle: "",
      ideaDescription: "",
      startupWebsite: ""
    };
  });

  // Pre-populate form with user profile data when logged in
  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || prev.fullName,
        email: profile.email || prev.email,
        country: profile.country || prev.country,
        phone: prev.phone // Keep phone from draft if any
      }));
    }
  }, [user, profile]);

  // Auto-save form data to localStorage
  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  }, [formData]);

  // Debounced auto-save effect
  useEffect(() => {
    const hasContent = Object.values(formData).some(v => v.trim().length > 0);
    if (!hasContent) return;
    const timer = setTimeout(() => {
      saveToStorage();
    }, 1000); // Save 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [formData, saveToStorage]);

  // Clear saved draft on successful submission
  const clearSavedDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear draft:", error);
    }
  }, []);

  // Reset form load time when component mounts
  useEffect(() => {
    formLoadTime.current = Date.now();
  }, []);

  // Initialize Turnstile CAPTCHA
  useEffect(() => {
    if (!user) return; // Only load for authenticated users who can see the form

    const initTurnstile = () => {
      if (!turnstileRef.current || !(window as any).turnstile || turnstileWidgetId.current) return;
      
      turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
        theme: 'auto',
      });
    };

    // Script is preloaded in index.html - just init when ready
    if ((window as any).turnstile) {
      initTurnstile();
    } else {
      // Fallback: wait for script to load
      const checkTurnstile = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(checkTurnstile);
          initTurnstile();
        }
      }, 50);
      setTimeout(() => clearInterval(checkTurnstile), 5000);
    }

    return () => {
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [user]);

  // URL validation helper
  const isValidUrl = (url: string) => {
    if (!url.trim()) return false;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  // Calculate form progress steps (only show editable fields for logged-in users)
  const formSteps = useMemo(() => {
    
    return [{
      id: 'ideaTitle',
      label: 'Idea Name',
      isComplete: formData.ideaTitle.trim().length > 0
    }, {
      id: 'ideaDescription',
      label: 'Description',
      isComplete: formData.ideaDescription.trim().length >= MIN_DESCRIPTION_LENGTH
    }, {
      id: 'startupWebsite',
      label: 'Website',
      isComplete: !formData.startupWebsite.trim() || isValidUrl(formData.startupWebsite)
    }, {
      id: 'video',
      label: 'Video',
      isComplete: videoFile !== null
    }];
  }, [formData, videoFile]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleVideoSelect = (file: File | null) => {
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a video smaller than 100MB",
          variant: "destructive"
        });
        return;
      }
      // Check file type
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a video file",
          variant: "destructive"
        });
        return;
      }
      setVideoFile(file);
    }
  };
  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleVideoSelect(e.target.files?.[0] || null);
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
        variant: "destructive"
      });
      return;
    }

    // Spam check 3: Require minimum description length for thoughtful submissions
    if (!formData.ideaDescription || formData.ideaDescription.trim().length < MIN_DESCRIPTION_LENGTH) {
      toast({
        title: "Description too short",
        description: `Please provide at least ${MIN_DESCRIPTION_LENGTH} characters describing your idea to help us understand it better.`,
        variant: "destructive"
      });
      return;
    }
    if (!formData.fullName || !formData.email || !formData.phone || !formData.gender || !formData.country || !formData.city || !formData.ideaTitle) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields including phone, gender, country, and city",
        variant: "destructive"
      });
      return;
    }

    // Verify Turnstile CAPTCHA
    if (!turnstileToken) {
      toast({
        title: "Security verification required",
        description: "Please complete the CAPTCHA verification",
        variant: "destructive"
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
        const {
          error: uploadError
        } = await supabase.storage.from("idea-videos").upload(fileName, videoFile, {
          cacheControl: "3600",
          upsert: false
        });
        if (uploadError) throw uploadError;
        setUploadProgress(70);

        // Store just the file path (bucket is now private, admins use signed URLs)
        videoPath = fileName;
        videoFilename = videoFile.name;
      }
      setUploadProgress(85);

      // Insert submission into database with submitter_id for secure ownership
      const {
        error: insertError
      } = await supabase.from("idea_submissions").insert({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        gender: formData.gender || null,
        idea_title: formData.ideaTitle,
        idea_description: formData.ideaDescription || null,
        video_url: videoPath,
        video_filename: videoFilename,
        submitter_id: user?.id // Link to authenticated user for secure RLS
      });
      if (insertError) throw insertError;
      setUploadProgress(95);

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-idea-confirmation', {
          body: {
            name: formData.fullName,
            email: formData.email,
            ideaTitle: formData.ideaTitle
          }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the whole submission if email fails
      }
      setUploadProgress(100);

      // Clear saved draft and trigger confetti
      clearSavedDraft();
      setShowConfetti(true);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isSubmitted) {
    return <div className="min-h-screen flex flex-col bg-background">
        <Confetti isActive={showConfetti} duration={4000} />
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-20">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="bg-card rounded-2xl p-10 shadow-lg border border-border animate-fade-in">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-bounce-scale">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                {t('idea_success_title')}
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                {t('idea_success_desc')}
              </p>
              <p className="text-muted-foreground mb-8">
                {t('idea_success_explore')}
              </p>
              <Button asChild size="lg" className="rounded-full">
                <a href="/courses">{t('idea_explore_courses')}</a>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>;
  }
  return <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <PageBreadcrumb items={[{
      label: "Submit Idea"
    }]} />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-10 md:py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 md:mb-4">
                {t('idea_hero_title')}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground px-2">
                {t('idea_hero_subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8 md:py-16 relative">
          {/* Auth Gate Overlay for non-authenticated users - fixed to viewport center */}
          {!user && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Card className="max-w-md mx-4 w-full border border-border shadow-lg">
                <CardContent className="p-6 sm:p-8 text-center space-y-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Rocket className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('idea_gate_title')}</h2>
                  <p className="text-muted-foreground text-sm">
                    {t('idea_gate_desc')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button asChild className="rounded-full w-full sm:w-auto">
                      <Link to="/auth">{t('sign_up')}</Link>
                    </Button>
                    <Button variant="outline" asChild className="rounded-full w-full sm:w-auto">
                      <Link to="/auth">{t('sign_in')}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>}

          {/* Blurred content for non-authenticated users */}
          <div className={!user ? 'blur-sm pointer-events-none select-none' : ''}>
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto">
              
              {/* Left Column - Info */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <div className="bg-foreground text-background rounded-2xl p-6 sm:p-8 lg:sticky lg:top-24">
                  <h2 className="text-xl sm:text-2xl font-bold mb-4">
                    {t('idea_incubator_title')}
                  </h2>
                  <p className="text-background/80 mb-6 text-sm sm:text-base">
                    {t('idea_incubator_desc')}
                  </p>
                  
                  <div className="space-y-6 mb-8">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{t('idea_funding_title')}</h3>
                        <p className="text-sm text-background/70">{t('idea_funding_desc')}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{t('idea_mentorship_title')}</h3>
                        <p className="text-sm text-background/70">
                          {t('idea_mentorship_desc')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{t('idea_resources_title')}</h3>
                        <p className="text-sm text-background/70">
                          {t('idea_resources_desc')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-background/20 pt-6">
                    <p className="text-sm text-background/60">
                      <strong className="text-background">{t('idea_how_title')}</strong> {t('idea_how_desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div className="lg:col-span-3 order-1 lg:order-2">
                <div className="bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
                    {t('idea_form_title')}
                  </h2>

                  {/* Progress Stepper */}
                  <FormProgressStepper steps={formSteps} className="mb-6" />
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Pre-filled user info (read-only for logged in users) */}
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
                          readOnly={!!user}
                          className={user ? "bg-muted cursor-not-allowed" : ""}
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
                          readOnly={!!user}
                          className={user ? "bg-muted cursor-not-allowed" : ""}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <AutocompleteInput
                          id="country"
                          value={formData.country}
                          onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                          suggestions={COUNTRY_NAMES}
                          placeholder="Select your country"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <AutocompleteInput
                          id="city"
                          value={formData.city}
                          onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                          suggestions={GLOBAL_CITIES}
                          placeholder="Select your city"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <PhoneInput 
                          id="phone" 
                          value={formData.phone} 
                          onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Select value={formData.gender} onValueChange={(value: 'male' | 'female') => setFormData(prev => ({ ...prev, gender: value }))}>
                          <SelectTrigger id="gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ideaTitle">Idea / Startup Name *</Label>
                      <Input id="ideaTitle" name="ideaTitle" placeholder="What do you call your idea or startup?" value={formData.ideaTitle} onChange={handleInputChange} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ideaDescription">Brief Description *</Label>
                      <Textarea id="ideaDescription" name="ideaDescription" placeholder="Briefly describe what problem you're solving and how... (minimum 50 characters)" rows={4} value={formData.ideaDescription} onChange={handleInputChange} required minLength={MIN_DESCRIPTION_LENGTH} />
                      <p className="text-xs text-muted-foreground">
                        {formData.ideaDescription.length}/{MIN_DESCRIPTION_LENGTH} characters minimum
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startupWebsite">Startup Website (Optional)</Label>
                      <Input 
                        id="startupWebsite" 
                        name="startupWebsite" 
                        type="url" 
                        placeholder="https://yourproject.com" 
                        value={formData.startupWebsite} 
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your startup's website, landing page, or social media page
                      </p>
                    </div>

                    {/* Honeypot field - hidden from humans, visible to bots */}
                    <div className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden" aria-hidden="true">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                    </div>

                    {/* Video Upload Section */}
                    <div className="space-y-2">
                      <Label>Upload Your Pitch Video *</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Record a 3-minute (max) video explaining your idea, the problem you're solving, 
                        and why you're the right person to build it.
                      </p>
                      
                      {videoFile ? (
                        <div className="border-2 border-primary rounded-xl p-8 text-center bg-primary/5">
                          <Video className="h-12 w-12 text-primary mx-auto" />
                          <p className="font-medium text-foreground mt-2">{videoFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setVideoFile(null)}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Record Video Option - Works on all devices via MediaRecorder API */}
                          <button
                            type="button"
                            onClick={() => setShowRecorder(true)}
                            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-muted/50"
                          >
                            <Camera className="h-10 w-10 text-muted-foreground mx-auto" />
                            <p className="font-medium text-foreground mt-2">Record Video</p>
                            <p className="text-sm text-muted-foreground">Use your camera</p>
                          </button>
                          
                          {/* Upload Video Option */}
                          <label 
                            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-muted/50"
                          >
                            <input type="file" accept="video/*" className="hidden" onChange={handleVideoInputChange} />
                            <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                            <p className="font-medium text-foreground mt-2">Upload Video</p>
                            <p className="text-sm text-muted-foreground">MP4, MOV, WebM up to 100MB</p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {isSubmitting && <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{
                          width: `${uploadProgress}%`
                        }} />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          {uploadProgress < 70 ? "Uploading video..." : uploadProgress < 100 ? "Saving submission..." : "Complete!"}
                        </p>
                      </div>}

                    {/* Cloudflare Turnstile CAPTCHA */}
                    <div className="flex justify-center">
                      <div ref={turnstileRef} className="min-h-[65px]" />
                    </div>

                    <Button type="submit" size="lg" className="w-full rounded-full" disabled={isSubmitting || !videoFile || formData.ideaDescription.trim().length < MIN_DESCRIPTION_LENGTH || (formData.startupWebsite.trim() && !isValidUrl(formData.startupWebsite)) || !turnstileToken}>
                      {isSubmitting ? "Submitting..." : "Submit Your Idea"}
                    </Button>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                      <p className="text-center sm:text-left">
                        By submitting, you agree to our terms of service and privacy policy.
                      </p>
                      {lastSaved && <p className="flex items-center gap-1 text-primary/70 shrink-0">
                          <Save className="h-3 w-3" />
                          Draft saved
                        </p>}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      </main>

      {/* Video Recorder Dialog */}
      <VideoRecorderDialog
        open={showRecorder}
        onOpenChange={setShowRecorder}
        onVideoRecorded={handleVideoSelect}
        maxDurationSeconds={180}
      />

      <Footer />
    </div>;
}