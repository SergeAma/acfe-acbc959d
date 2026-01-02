import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import acfeLogo from '@/assets/acfe-logo.png';
import { MapPin, Clock, Lightbulb, Calendar, Gift, Users, MessageSquare, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const postTypeIcons = {
  tip: Lightbulb,
  event: Calendar,
  offer: Gift,
  network: Users
};

const postTypeBadgeColors = {
  tip: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  event: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  offer: 'bg-green-500/10 text-green-600 border-green-500/20',
  network: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
};

const postTypeLabels = {
  tip: 'Tips & Tricks',
  event: 'Events',
  offer: 'Offers',
  network: 'Networking'
};

const jobs = [
  {
    id: 1,
    title: "PROJECT COORDINATOR ROLE",
    organization: "acloudforeveryone.org",
    location: "Central Africa",
    type: "Part-time",
    description: "We are seeking a highly organized Project Coordinator to join our team at acloudforeveryone.org. The role involves coordinating local learner community activities, ensuring smooth execution of projects, and supporting our mission to provide cloud education for all.",
    requirements: [
      { label: "Location:", value: "Based in Central Africa" },
      { label: "Language:", value: "Primarily French, Arabic and English (Portuguese and Spanish also strongly desired); good command of the most spoken vernaculars (e.g., Fula, Hausa, Wolof, Lingala, Swahili, Kikongo)" },
      { label: "Skills:", value: "Strong organizational skills, proficiency in Excel and PowerPoint" }
    ],
    responsibilities: "Coordinating local learner community activities, project management, reporting, and collaboration with the team.",
    remuneration: "Please note we are a charity and as such we rely on voluntaries. However all costs of running your region on a part-time basis will be covered monthly. Your experience will be considered as well."
  },
  {
    id: 2,
    title: "PROJECT COORDINATOR ROLE",
    organization: "acloudforeveryone.org",
    location: "Western Africa",
    type: "Part-time",
    description: "We are seeking a highly organized Project Coordinator to join our team at acloudforeveryone.org. The role involves coordinating local learner community activities, ensuring smooth execution of projects, and supporting our mission to provide cloud education for all.",
    requirements: [
      { label: "Location:", value: "Based in Western Africa" },
      { label: "Language:", value: "Good command of French, English & Arabic, good command of the most spoken vernaculars (e.g., Yoruba, Hausa, Igbo, Wolof)" },
      { label: "Skills:", value: "Strong organizational skills, proficiency in Excel and PowerPoint" }
    ],
    responsibilities: "Coordinating local learner community activities, project management, reporting, and collaboration with the team.",
    remuneration: "Please note we are a charity and as such we rely on voluntaries. However all costs of running your region on a part-time basis will be covered monthly. Your experience will be considered as well."
  }
];

export const Jobs = () => {
  const [activeTab, setActiveTab] = useState('community');
  const [postFilter, setPostFilter] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<string>('tip');
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch community posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, user_id, type, content, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for posts
      const userIds = [...new Set(data.map(post => post.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(post => ({
        ...post,
        author: profileMap.get(post.user_id)?.full_name || 'Anonymous',
        role: profileMap.get(post.user_id)?.role || 'student'
      }));
    }
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async ({ content, type }: { content: string; type: string }) => {
      const { error } = await supabase
        .from('community_posts')
        .insert({ user_id: user!.id, content, type });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      setNewPostContent('');
      toast.success('Post created successfully!');
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    }
  });

  const handleCreatePost = () => {
    const trimmedContent = newPostContent.trim();
    
    if (!trimmedContent) {
      toast.error('Please enter some content for your post.');
      return;
    }
    
    // Validate content length to prevent abuse
    if (trimmedContent.length > 2000) {
      toast.error('Post content must be less than 2000 characters.');
      return;
    }
    
    createPostMutation.mutate({ content: trimmedContent, type: newPostType });
  };

  const filteredPosts = postFilter 
    ? posts.filter(post => post.type === postFilter)
    : posts;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Community & Jobs" }]} />
      
      {/* Hero Section */}
      <section className="relative border-b border-border py-6 sm:py-8 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Community & Opportunities
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Connect with learners and mentors, discover tips, events, and career opportunities
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-8 bg-background relative">
        {/* Auth Gate Overlay for non-authenticated users */}
        {!user && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Card className="max-w-md mx-4 border border-border shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Join Our Community</h2>
                <p className="text-muted-foreground text-sm">
                  Sign up to access community posts, job opportunities, and connect with learners and mentors.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild className="rounded-full">
                    <Link to="/auth">Sign Up</Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-full">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Blurred content for non-authenticated users */}
        <div className={!user ? 'blur-sm pointer-events-none select-none' : ''}>
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="community" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Community
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Jobs Board
              </TabsTrigger>
            </TabsList>

            {/* Community Tab */}
            <TabsContent value="community" className="space-y-6">
              {/* Create Post Form - Only for logged in users */}
              {user ? (
                <Card className="border border-border mb-6">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-semibold text-foreground">
                            {profile?.full_name?.split(' ').map(n => n[0]).join('') || user.email?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{profile?.full_name || 'User'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{profile?.role || 'Student'}</p>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Share a tip, event, offer, or connect with the community..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      <div className="flex items-center justify-between gap-4">
                        <Select value={newPostType} onValueChange={setNewPostType}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Post type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tip">💡 Tips & Tricks</SelectItem>
                            <SelectItem value="event">📅 Events</SelectItem>
                            <SelectItem value="offer">🎁 Offers</SelectItem>
                            <SelectItem value="network">👥 Networking</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleCreatePost} 
                          disabled={createPostMutation.isPending || !newPostContent.trim()}
                          className="rounded-full"
                        >
                          {createPostMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Post
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-4 mb-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign in to share with the community
                  </p>
                  <Button variant="outline" className="rounded-full" asChild>
                    <Link to="/auth">Sign in to Post</Link>
                  </Button>
                </div>
              )}

              {/* Filter Badges */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge 
                  variant="outline" 
                  className={`cursor-pointer hover:bg-muted ${!postFilter ? 'bg-muted ring-2 ring-primary/50' : ''}`}
                  onClick={() => setPostFilter(null)}
                >
                  All Posts
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.tip} ${postFilter === 'tip' ? 'ring-2 ring-primary/50' : ''}`}
                  onClick={() => setPostFilter('tip')}
                >
                  <Lightbulb className="h-3 w-3 mr-1" /> Tips & Tricks
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.event} ${postFilter === 'event' ? 'ring-2 ring-primary/50' : ''}`}
                  onClick={() => setPostFilter('event')}
                >
                  <Calendar className="h-3 w-3 mr-1" /> Events
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.offer} ${postFilter === 'offer' ? 'ring-2 ring-primary/50' : ''}`}
                  onClick={() => setPostFilter('offer')}
                >
                  <Gift className="h-3 w-3 mr-1" /> Offers
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.network} ${postFilter === 'network' ? 'ring-2 ring-primary/50' : ''}`}
                  onClick={() => setPostFilter('network')}
                >
                  <Users className="h-3 w-3 mr-1" /> Networking
                </Badge>
              </div>

              {/* Posts Grid */}
              {postsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPosts.length === 0 && user ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </div>
              ) : filteredPosts.length === 0 && !user ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Sign up to see community posts.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredPosts.map((post) => {
                    const Icon = postTypeIcons[post.type as keyof typeof postTypeIcons];
                    return (
                      <Card key={post.id} className="border border-border hover:border-primary/50 transition-colors">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-semibold text-foreground">
                                  {post.author.split(' ').map((n: string) => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">{post.author}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {post.role} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={postTypeBadgeColors[post.type as keyof typeof postTypeBadgeColors]}>
                              <Icon className="h-3 w-3 mr-1" />
                              {postTypeLabels[post.type as keyof typeof postTypeLabels]}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                            {/* Render as plain text to prevent XSS - HTML tags are escaped by React */}
                            {post.content}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs">
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground">
                  Browse <span className="font-medium text-foreground">internal</span> roles at ACFE and <span className="font-medium text-foreground">external</span> opportunities with our partners
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {jobs.map((job) => (
                  <Card key={job.id} className="border border-border hover:border-primary transition-colors shadow-sm bg-card overflow-hidden">
                    <div className="bg-muted/50 p-4 flex justify-center border-b border-border">
                      <img src={acfeLogo} alt="ACFE Logo" className="h-16 w-auto" />
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground mb-1">{job.title}</h2>
                        <p className="text-xs text-muted-foreground mb-3">{job.organization}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="font-medium text-foreground">{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-foreground">{job.type}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Description:</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">{job.description}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Requirements:</h3>
                        <ul className="space-y-2">
                          {job.requirements.map((req, idx) => (
                            <li key={idx} className="text-sm text-foreground/80">
                              <span className="font-medium">{req.label}</span> {req.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Responsibilities:</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">{job.responsibilities}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Remuneration:</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">{job.remuneration}</p>
                      </div>
                      <Button 
                        className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm py-5 rounded-full"
                        asChild
                      >
                        <a href="mailto:contact@acloudforeveryone.org?subject=Application for Project Coordinator Role">
                          APPLY HERE
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
