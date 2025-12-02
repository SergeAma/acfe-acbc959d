import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import acfeLogo from '@/assets/acfe-logo.png';
import { MapPin, Clock, Lightbulb, Calendar, Gift, Users, MessageSquare } from 'lucide-react';

// Sample community posts data
const communityPosts = [
  {
    id: 1,
    type: 'tip',
    author: 'Sarah M.',
    role: 'Mentor',
    content: 'Pro tip: When preparing for cloud certifications, focus on hands-on labs rather than just theory. AWS and Google Cloud both offer free tier accounts for practice!',
    date: '2 hours ago',
    likes: 24
  },
  {
    id: 2,
    type: 'event',
    author: 'ACFE Team',
    role: 'Admin',
    content: '🎉 Join us this Saturday for a virtual networking session! Connect with mentors and fellow learners across Africa. Register via the link in our newsletter.',
    date: '1 day ago',
    likes: 56
  },
  {
    id: 3,
    type: 'offer',
    author: 'TechHub Kenya',
    role: 'Partner',
    content: '💼 Exclusive offer for ACFE learners: 20% discount on co-working space memberships in Nairobi. Use code ACFE2024 when signing up!',
    date: '2 days ago',
    likes: 42
  },
  {
    id: 4,
    type: 'network',
    author: 'James O.',
    role: 'Student',
    content: 'Looking to connect with other learners working on Azure fundamentals. Anyone interested in forming a study group? Let\'s support each other! 🤝',
    date: '3 days ago',
    likes: 18
  },
  {
    id: 5,
    type: 'tip',
    author: 'Dr. Amina K.',
    role: 'Mentor',
    content: 'Reminder: The best time to update your LinkedIn profile is RIGHT AFTER completing a course or certification. Your learning is fresh, and the momentum helps!',
    date: '4 days ago',
    likes: 67
  },
  {
    id: 6,
    type: 'event',
    author: 'ACFE Team',
    role: 'Admin',
    content: '📚 New course alert! "Introduction to Data Analytics with Python" launches next week. Early bird registration now open for existing learners.',
    date: '5 days ago',
    likes: 89
  }
];

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

export const Jobs = () => {
  const [activeTab, setActiveTab] = useState('community');

  const jobs = [
    {
      id: 1,
      title: "PROJECT COORDINATOR ROLE",
      organization: "acloudforeveryone.org",
      location: "Central Africa",
      type: "Part-time",
      description: "We are seeking a highly organized Project Coordinator to join our team at acloudforeveryone.org. The role involves coordinating local learner community activities, ensuring smooth execution of projects, and supporting our mission to provide cloud education for all.",
      requirements: [
        {
          label: "Location:",
          value: "Based in Central Africa"
        },
        {
          label: "Language:",
          value: "Primarily French, Arabic and English (Portuguese and Spanish also strongly desired); good command of the most spoken vernaculars (e.g., Fula, Hausa, Wolof, Lingala, Swahili, Kikongo)"
        },
        {
          label: "Skills:",
          value: "Strong organizational skills, proficiency in Excel and PowerPoint"
        }
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
        {
          label: "Location:",
          value: "Based in Western Africa"
        },
        {
          label: "Language:",
          value: "Good command of French, English & Arabic, good command of the most spoken vernaculars (e.g., Yoruba, Hausa, Igbo, Wolof)"
        },
        {
          label: "Skills:",
          value: "Strong organizational skills, proficiency in Excel and PowerPoint"
        }
      ],
      responsibilities: "Coordinating local learner community activities, project management, reporting, and collaboration with the team.",
      remuneration: "Please note we are a charity and as such we rely on voluntaries. However all costs of running your region on a part-time basis will be covered monthly. Your experience will be considered as well."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Community & Jobs" }]} />
      
      {/* Hero Section */}
      <section className="relative border-b border-border py-8 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Community & Opportunities
            </h1>
            <p className="text-base text-muted-foreground">
              Connect with learners and mentors, discover tips, events, and career opportunities
            </p>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-8 bg-background">
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
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">All Posts</Badge>
                <Badge variant="outline" className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.tip}`}>
                  <Lightbulb className="h-3 w-3 mr-1" /> Tips & Tricks
                </Badge>
                <Badge variant="outline" className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.event}`}>
                  <Calendar className="h-3 w-3 mr-1" /> Events
                </Badge>
                <Badge variant="outline" className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.offer}`}>
                  <Gift className="h-3 w-3 mr-1" /> Offers
                </Badge>
                <Badge variant="outline" className={`cursor-pointer hover:bg-muted ${postTypeBadgeColors.network}`}>
                  <Users className="h-3 w-3 mr-1" /> Networking
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {communityPosts.map((post) => {
                  const Icon = postTypeIcons[post.type as keyof typeof postTypeIcons];
                  return (
                    <Card key={post.id} className="border border-border hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-semibold text-foreground">
                                {post.author.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{post.author}</p>
                              <p className="text-xs text-muted-foreground">{post.role} • {post.date}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={postTypeBadgeColors[post.type as keyof typeof postTypeBadgeColors]}>
                            <Icon className="h-3 w-3 mr-1" />
                            {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed mb-3">
                          {post.content}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>❤️ {post.likes} likes</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="text-center pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Want to share with the community? Sign in to post tips, events, or connect with others.
                </p>
                <Button variant="outline" className="rounded-full">
                  Sign in to Post
                </Button>
              </div>
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
                      <img 
                        src={acfeLogo} 
                        alt="ACFE Logo" 
                        className="h-16 w-auto"
                      />
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground mb-1">
                          {job.title}
                        </h2>
                        <p className="text-xs text-muted-foreground mb-3">
                          {job.organization}
                        </p>
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
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {job.description}
                        </p>
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
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {job.responsibilities}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Remuneration:</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {job.remuneration}
                        </p>
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
      </section>

      <Footer />
    </div>
  );
};
