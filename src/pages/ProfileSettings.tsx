import { useState, useEffect, useRef } from 'react';
import { useAuth, ProfileFrame } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Pencil, Trash2, X, Plus } from 'lucide-react';
import { ProfilePhotoEditor } from '@/components/profile/ProfilePhotoEditor';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Badge } from '@/components/ui/badge';

export const ProfileSettings = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newCompany, setNewCompany] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    country: '',
    avatar_url: '',
    profile_frame: 'none' as ProfileFrame,
    linkedin_url: '',
    twitter_url: '',
    instagram_url: '',
    github_url: '',
    website_url: '',
    companies_worked_for: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        country: profile.country || '',
        avatar_url: profile.avatar_url || '',
        profile_frame: profile.profile_frame || 'none',
        linkedin_url: profile.linkedin_url || '',
        twitter_url: profile.twitter_url || '',
        instagram_url: profile.instagram_url || '',
        github_url: profile.github_url || '',
        website_url: profile.website_url || '',
        companies_worked_for: (profile as any).companies_worked_for || [],
      });
    }
  }, [profile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updateData = {
      full_name: formData.full_name,
      bio: formData.bio,
      country: formData.country,
      avatar_url: formData.avatar_url,
      profile_frame: formData.profile_frame,
      linkedin_url: formData.linkedin_url || null,
      twitter_url: formData.twitter_url || null,
      instagram_url: formData.instagram_url || null,
      github_url: formData.github_url || null,
      website_url: formData.website_url || null,
      companies_worked_for: formData.companies_worked_for,
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
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter your country"
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
                    <Input
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      placeholder="e.g., Google, Microsoft, Andela..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCompany();
                        }
                      }}
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
