import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ProfileFrame } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Pencil, Trash2, X, Plus, AlertTriangle, Pause, Play } from 'lucide-react';
import { ProfilePhotoEditor } from '@/components/profile/ProfilePhotoEditor';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { OnboardingBanner } from '@/components/profile/OnboardingBanner';
import { Badge } from '@/components/ui/badge';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { UNIVERSITIES, COMPANIES, COUNTRY_NAMES } from '@/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const SUGGESTED_SKILLS = {
  'Technology & Engineering': [
    'Cloud Computing', 'AWS', 'Google Cloud', 'Microsoft Azure', 'DevOps',
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust',
    'React', 'Node.js', 'Next.js', 'Vue.js', 'Angular',
    'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Deep Learning',
    'Natural Language Processing', 'Computer Vision', 'Data Analytics',
    'Cybersecurity', 'Network Security', 'Blockchain', 'Web3',
    'Mobile Development', 'iOS Development', 'Android Development', 'Flutter',
    'Database Management', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis',
    'API Development', 'Microservices', 'System Design', 'Software Architecture',
    'Agile', 'Scrum', 'CI/CD', 'Docker', 'Kubernetes',
  ],
  'Business & Management': [
    'Project Management', 'Product Management', 'Program Management',
    'Business Strategy', 'Business Development', 'Strategic Planning',
    'Leadership', 'Team Management', 'Executive Coaching', 'Mentorship',
    'Change Management', 'Operations Management', 'Process Improvement',
    'Entrepreneurship', 'Startup Development', 'Venture Capital', 'Fundraising',
  ],
  'Sales & Marketing': [
    'Sales', 'B2B Sales', 'Enterprise Sales', 'Sales Strategy',
    'Digital Marketing', 'Content Marketing', 'SEO', 'SEM', 'Social Media Marketing',
    'Brand Strategy', 'Marketing Analytics', 'Growth Hacking', 'Email Marketing',
    'Public Relations', 'Communications', 'Copywriting', 'Content Creation',
  ],
  'Finance & Analytics': [
    'Financial Analysis', 'Financial Modeling', 'Investment Analysis',
    'Accounting', 'Budgeting', 'Risk Management', 'Compliance',
    'Business Intelligence', 'Data Visualization', 'Excel', 'Power BI', 'Tableau',
  ],
  'Design & Creative': [
    'UI/UX Design', 'Product Design', 'Graphic Design', 'Web Design',
    'User Research', 'Design Thinking', 'Figma', 'Adobe Creative Suite',
    'Video Production', 'Animation', 'Photography',
  ],
  'Soft Skills': [
    'Communication', 'Presentation Skills', 'Public Speaking', 'Negotiation',
    'Problem Solving', 'Critical Thinking', 'Decision Making',
    'Time Management', 'Collaboration', 'Conflict Resolution',
  ],
};

// COUNTRIES is now imported from @/data

export const ProfileSettings = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'active' | 'paused' | 'deleted'>('active');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newCompany, setNewCompany] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false);
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    country: '',
    university: '',
    avatar_url: '',
    profile_frame: 'none' as ProfileFrame,
    linkedin_url: '',
    twitter_url: '',
    instagram_url: '',
    github_url: '',
    website_url: '',
    companies_worked_for: [] as string[],
    skills: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        country: profile.country || '',
        university: profile.university || '',
        avatar_url: profile.avatar_url || '',
        profile_frame: profile.profile_frame || 'none',
        linkedin_url: profile.linkedin_url || '',
        twitter_url: profile.twitter_url || '',
        instagram_url: profile.instagram_url || '',
        github_url: profile.github_url || '',
        website_url: profile.website_url || '',
        companies_worked_for: (profile as any).companies_worked_for || [],
        skills: (profile as any).skills || [],
      });
      
      // Fetch account status
      fetchAccountStatus();
    }
  }, [profile]);

  const fetchAccountStatus = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('id', profile.id)
      .single();
    
    if (data?.account_status) {
      setAccountStatus(data.account_status as 'active' | 'paused' | 'deleted');
    }
  };

  const handlePauseAccount = async () => {
    if (!profile?.id) return;
    
    setAccountActionLoading(true);
    const newStatus = accountStatus === 'paused' ? 'active' : 'paused';
    
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAccountStatus(newStatus);
      toast({
        title: newStatus === 'paused' ? 'Account Paused' : 'Account Reactivated',
        description: newStatus === 'paused' 
          ? 'Your account has been paused. You can reactivate it anytime.'
          : 'Welcome back! Your account is now active.',
      });
    }
    setAccountActionLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!profile?.id) return;
    
    setAccountActionLoading(true);
    
    // Set scheduled deletion date (30 days from now)
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        account_status: 'deleted',
        scheduled_deletion_at: scheduledDeletionAt.toISOString()
      })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Scheduled for Deletion',
        description: 'Your account will be permanently deleted in 30 days. You can cancel this by signing in and reactivating your account.',
      });
      await signOut();
      navigate('/');
    }
    setAccountActionLoading(false);
  };

  const handleCancelDeletion = async () => {
    if (!profile?.id) return;
    
    setAccountActionLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        account_status: 'active',
        scheduled_deletion_at: null
      })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAccountStatus('active');
      toast({
        title: 'Deletion Cancelled',
        description: 'Your account is now active again.',
      });
    }
    setAccountActionLoading(false);
  };

  const handleAddCompany = () => {
    if (newCompany.trim() && !formData.companies_worked_for.includes(newCompany.trim())) {
      setFormData(prev => ({
        ...prev,
        companies_worked_for: [...prev.companies_worked_for, newCompany.trim()]
      }));
      setNewCompany('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setFormData(prev => ({
      ...prev,
      companies_worked_for: prev.companies_worked_for.filter(c => c !== company)
    }));
  };

  const handleAddSkill = (skill?: string) => {
    const skillToAdd = skill || newSkill.trim();
    if (skillToAdd && !formData.skills.includes(skillToAdd)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillToAdd]
      }));
      setNewSkill('');
      if (skill) {
        setSkillsPopoverOpen(false);
      }
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updateData = {
      full_name: formData.full_name,
      bio: formData.bio,
      country: formData.country,
      university: formData.university,
      avatar_url: formData.avatar_url,
      profile_frame: formData.profile_frame,
      linkedin_url: formData.linkedin_url || null,
      twitter_url: formData.twitter_url || null,
      instagram_url: formData.instagram_url || null,
      github_url: formData.github_url || null,
      website_url: formData.website_url || null,
      companies_worked_for: formData.companies_worked_for,
      skills: formData.skills,
    };

    console.log('Saving profile data:', updateData);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile?.id)
        .select();

      console.log('Save response:', { data, error });

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const onSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowPhotoEditor(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleEditExistingPhoto = () => {
    if (formData.avatar_url) {
      setImgSrc(formData.avatar_url);
      setShowPhotoEditor(true);
    }
  };

  const handlePhotoSave = async (croppedBlob: Blob, frame: ProfileFrame) => {
    try {
      setUploading(true);
      setShowPhotoEditor(false);

      const filePath = `${profile?.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl,
        profile_frame: frame,
      }));

      toast({
        title: 'Photo updated',
        description: 'Click Save Changes to save your profile.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setImgSrc('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelEditor = () => {
    setShowPhotoEditor(false);
    setImgSrc('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = async () => {
    // Try to delete from storage if it's a Supabase storage URL
    if (formData.avatar_url && formData.avatar_url.includes('/avatars/')) {
      try {
        const urlParts = formData.avatar_url.split('/avatars/');
        if (urlParts[1]) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('avatars').remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting avatar from storage:', error);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      avatar_url: '',
      profile_frame: 'none',
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Profile Settings" }]} />
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <OnboardingBanner />
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-6">
                  <ProfileAvatar
                    src={formData.avatar_url}
                    name={formData.full_name}
                    frame={formData.profile_frame}
                    size="lg"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={onSelectFile}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        size="sm"
                      >
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload
                      </Button>
                      {formData.avatar_url && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleEditExistingPhoto}
                            size="sm"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemovePhoto}
                            size="sm"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload, crop, and add frames like #Hiring or #OpenToWork
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, country: e.target.value }));
                          if (!countryPopoverOpen) setCountryPopoverOpen(true);
                        }}
                        onFocus={() => setCountryPopoverOpen(true)}
                        placeholder="Type to search countries..."
                        autoComplete="off"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 bg-popover border border-border shadow-lg z-50" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Command>
                      <CommandList className="max-h-[200px]">
                        {COUNTRY_NAMES
                          .filter(country => 
                            !formData.country || country.toLowerCase().includes(formData.country.toLowerCase())
                          )
                          .slice(0, 10)
                          .map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, country }));
                                setCountryPopoverOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              {country}
                            </CommandItem>
                          ))}
                        {COUNTRY_NAMES.filter(country => 
                          !formData.country || country.toLowerCase().includes(formData.country.toLowerCase())
                        ).length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground">No countries found</div>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">University/Institution</Label>
                <AutocompleteInput
                  id="university"
                  value={formData.university}
                  onChange={(value) => setFormData(prev => ({ ...prev, university: value }))}
                  suggestions={UNIVERSITIES}
                  placeholder="Start typing to see suggestions..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
                <Input
                  id="avatar_url"
                  name="avatar_url"
                  value={formData.avatar_url}
                  onChange={handleChange}
                  placeholder="Or paste an image URL"
                />
                <p className="text-xs text-muted-foreground">
                  You can also paste a direct image URL here
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Work Experience</h3>
                
                <div className="space-y-2">
                  <Label>Companies You Have Worked For</Label>
                  <div className="flex gap-2">
                    <AutocompleteInput
                      value={newCompany}
                      onChange={(value) => setNewCompany(value)}
                      suggestions={COMPANIES}
                      placeholder="Start typing to see suggestions..."
                    />
                    <Button type="button" variant="outline" onClick={handleAddCompany}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add companies you've worked for. These will be displayed on your profile with logos when available.
                  </p>
                  {formData.companies_worked_for.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.companies_worked_for.map((company, index) => (
                        <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                          {company}
                          <button
                            type="button"
                            onClick={() => handleRemoveCompany(company)}
                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Skills & Expertise</Label>
                  <div className="flex gap-2">
                    <Popover open={skillsPopoverOpen} onOpenChange={setSkillsPopoverOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <div className="flex-1 relative">
                          <Input
                            value={newSkill}
                            onChange={(e) => {
                              setNewSkill(e.target.value);
                              if (!skillsPopoverOpen) setSkillsPopoverOpen(true);
                            }}
                            onFocus={() => setSkillsPopoverOpen(true)}
                            placeholder="Type or select a skill..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSkill();
                              }
                              if (e.key === 'Escape') {
                                setSkillsPopoverOpen(false);
                              }
                            }}
                            autoComplete="off"
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[400px] p-0 bg-popover border border-border shadow-lg z-50" 
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command shouldFilter={false}>
                          <CommandList className="max-h-[300px]">
                            {Object.entries(SUGGESTED_SKILLS).map(([category, skills]) => {
                              const filteredSkills = skills
                                .filter(skill => !formData.skills.includes(skill))
                                .filter(skill => 
                                  !newSkill || skill.toLowerCase().includes(newSkill.toLowerCase())
                                )
                                .slice(0, 8);
                              
                              if (filteredSkills.length === 0) return null;
                              
                              return (
                                <CommandGroup key={category} heading={category}>
                                  {filteredSkills.map((skill) => (
                                    <CommandItem
                                      key={skill}
                                      value={skill}
                                      onSelect={() => handleAddSkill(skill)}
                                      className="cursor-pointer"
                                    >
                                      {skill}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              );
                            })}
                            {newSkill.trim() && !Object.values(SUGGESTED_SKILLS).flat().some(
                              skill => skill.toLowerCase() === newSkill.trim().toLowerCase()
                            ) && (
                              <CommandGroup heading="Custom">
                                <CommandItem
                                  value={newSkill}
                                  onSelect={() => handleAddSkill()}
                                  className="cursor-pointer"
                                >
                                  Add "{newSkill}" as custom skill
                                </CommandItem>
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" onClick={() => handleAddSkill()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select from suggested skills or type your own. These help students find mentors with specific expertise.
                  </p>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="pl-2 pr-1 py-1 bg-primary/10">
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Social Media Handles</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_url">Twitter/X Profile URL</Label>
                  <Input
                    id="twitter_url"
                    name="twitter_url"
                    value={formData.twitter_url}
                    onChange={handleChange}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram Profile URL</Label>
                  <Input
                    id="instagram_url"
                    name="instagram_url"
                    value={formData.instagram_url}
                    onChange={handleChange}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_url">GitHub Profile URL</Label>
                  <Input
                    id="github_url"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleChange}
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url">Personal Website</Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  Role: <span className="font-semibold capitalize">{profile?.role}</span>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Management Section */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Account Management
            </CardTitle>
            <CardDescription>Manage your account status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {accountStatus === 'deleted' ? (
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2">Account Scheduled for Deletion</h4>
                  <p className="text-sm text-muted-foreground">
                    Your account is scheduled to be permanently deleted. You can cancel this and reactivate your account.
                  </p>
                </div>
                <Button 
                  onClick={handleCancelDeletion}
                  disabled={accountActionLoading}
                  className="w-full"
                >
                  {accountActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel Deletion & Reactivate Account
                </Button>
              </div>
            ) : (
              <>
                {/* Pause Account */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium flex items-center gap-2">
                      {accountStatus === 'paused' ? (
                        <><Play className="h-4 w-4" /> Reactivate Account</>
                      ) : (
                        <><Pause className="h-4 w-4" /> Pause Account</>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {accountStatus === 'paused' 
                        ? 'Your account is currently paused. Click to reactivate.'
                        : 'Temporarily pause your account. You can reactivate anytime.'}
                    </p>
                  </div>
                  <Button 
                    variant={accountStatus === 'paused' ? 'default' : 'outline'}
                    onClick={handlePauseAccount}
                    disabled={accountActionLoading}
                  >
                    {accountActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {accountStatus === 'paused' ? 'Reactivate' : 'Pause'}
                  </Button>
                </div>

                {/* Delete Account */}
                <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div className="space-y-1">
                    <h4 className="font-medium text-destructive flex items-center gap-2">
                      <Trash2 className="h-4 w-4" /> Delete Account
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data. This action can be cancelled within 30 days.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={accountActionLoading}>
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will schedule your account for permanent deletion. Your account will be deleted in 30 days.
                          During this period, you can sign in and cancel the deletion to recover your account.
                          After 30 days, all your data will be permanently removed and cannot be recovered.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {imgSrc && (
        <ProfilePhotoEditor
          open={showPhotoEditor}
          onOpenChange={setShowPhotoEditor}
          imgSrc={imgSrc}
          currentFrame={formData.profile_frame}
          onSave={handlePhotoSave}
          onCancel={handleCancelEditor}
        />
      )}
    </div>
  );
};
