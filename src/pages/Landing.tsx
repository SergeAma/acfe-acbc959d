import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Users, BookOpen, Globe, Award, FileText, TrendingUp, ExternalLink, Rss, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import eastAfricanUniversityLogo from '@/assets/east-african-university-logo.png';
import johannesburgLogo from '@/assets/johannesburg-logo.png';
import acfeLogo from '@/assets/acfe-logo.png';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}
export const Landing = () => {
  const {
    user
  } = useAuth();
  const {
    data: newsData,
    isLoading: newsLoading
  } = useQuery({
    queryKey: ['tech-news'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('fetch-tech-news');
      if (error) throw error;
      return data as {
        articles: NewsArticle[];
      };
    },
    staleTime: 1000 * 60 * 30 // Cache for 30 minutes
  });
  return <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-muted min-h-screen flex items-end pb-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">Join 300+ Learners and Master a Career-Boosting Digital Skill!</h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-4 leading-relaxed">
              Zero experience required | Any background | Learn Anytime
            </p>
            <p className="text-base text-foreground/70 mb-8">
              Training delivered by African tech experts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? <Link to="/dashboard">
                  <Button size="lg" className="text-lg px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                    Go to Dashboard
                  </Button>
                </Link> : <>
                  <Link to="/auth?mode=signup&role=student">
                    <Button size="lg" className="text-lg px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                      START LEARNING
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup&role=mentor">
                    <Button size="lg" className="text-lg px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                      BECOME A MENTOR
                    </Button>
                  </Link>
                </>}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Us</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            <Link to="/mentors" className="h-full">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">Our Mentors</h3>
                  <p className="text-muted-foreground flex-1">
                    Learn from experienced professionals who are passionate about sharing their knowledge and empowering the next generation
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/courses" className="h-full">
              <Card className="border-2 hover:border-secondary transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                    <BookOpen className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-secondary transition-colors">Explore Courses</h3>
                  <p className="text-muted-foreground flex-1">
                    Outcome-focused training designed to get you job-ready, not just traditional learning—practical skills that lead to real career opportunities
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/jobs" className="h-full">
              <Card className="border-2 hover:border-accent transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <Globe className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors">Join Our Community</h3>
                  <p className="text-muted-foreground flex-1">
                    Join a supportive community of learners and mentors dedicated to advancing digital skills across Africa
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Innovators Incubator Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Innovation Hub</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Got a Big Idea?<br />
              <span className="text-primary">We'll Help You Build It.</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              We're building Africa's next generation of tech leaders. If you're a young innovator with a vision 
              that could transform communities, we want to hear from you. Get access to mentorship, resources, 
              and the support you need to bring your idea to life.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-primary transition-colors">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Mentorship</h3>
                <p className="text-sm text-muted-foreground">1-on-1 guidance from industry experts who've been there</p>
              </Link>
              
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Resources</h3>
                <p className="text-sm text-muted-foreground">Access to tools, training, and community support</p>
              </div>
              
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Funding Guidance</h3>
                <p className="text-sm text-muted-foreground">Learn how to pitch and connect with potential investors</p>
              </div>
            </div>
            
            <Link to="/submit-idea">
              <Button size="lg" className="text-lg px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all">
                Submit Your Idea
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">Join foward-thinking young African innovators already in our program</p>
          </div>
        </div>
      </section>

      {/* Latest Tech News Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Rss className="h-8 w-8 text-primary animate-pulse" />
              <h2 className="text-4xl font-bold text-foreground">Africa Tech Buzz</h2>
            </div>
            <p className="text-xl text-muted-foreground">
              Stay updated with the latest African tech, education, and startup funding news
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {newsLoading ? Array.from({
            length: 6
          }).map((_, i) => <Card key={i} className="border-none shadow-lg bg-card">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>) : newsData?.articles && newsData.articles.length > 0 ? newsData.articles.map((article, index) => <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-card group hover:scale-105">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {article.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs font-medium text-primary">
                        {article.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(article.pubDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                      </span>
                    </div>
                    
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Read Article
                      </Button>
                    </a>
                  </CardContent>
                </Card>) : <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No news articles available at the moment. Check back soon!</p>
              </div>}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Partners</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12 max-w-5xl mx-auto">
            <div className="flex items-center justify-center">
              <img src={eastAfricanUniversityLogo} alt="The East African University" className="h-24 w-auto object-contain" />
            </div>
            <div className="flex items-center justify-center">
              <img src={johannesburgLogo} alt="Johannesburg" className="h-24 w-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};