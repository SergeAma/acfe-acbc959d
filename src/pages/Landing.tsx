import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Globe, Award, FileText, TrendingUp, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TechNewsSection } from '@/components/TechNewsSection';
import { HeroVideoBackground } from '@/components/HeroVideoBackground';
import { SupportSection } from '@/components/SupportSection';
import eastAfricanUniversityLogo from '@/assets/east-african-university-logo.png';
import johannesburgLogo from '@/assets/johannesburg-logo.png';
import spectrogramLogo from '@/assets/spectrogram-logo.png';
import learnProjectLogo from '@/assets/learn-project-logo.png';
export const Landing = () => {
  const {
    user
  } = useAuth();
  return <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-end pb-28">
        {/* Video Background */}
        <HeroVideoBackground />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight">
              Join 300+ Learners and Master a Career-Boosting Digital Skill!
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-3 sm:mb-4 leading-relaxed">
              Zero experience required | Any background | Learn Anytime
            </p>
            <p className="text-sm sm:text-base text-white mb-6 sm:mb-8 inline-block bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg">
              Training delivered by tech experts who understand the African context.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              {user ? <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                    Go to Dashboard
                  </Button>
                </Link> : <>
                  <Link to="/auth?mode=signup&role=student" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                      START LEARNING
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup&role=mentor" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                      BECOME A MENTOR
                    </Button>
                  </Link>
                </>}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Us</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto items-stretch">
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
                    Outcome-focused training designed to get you job-ready, not just traditional learning but practical skills that lead to real career opportunities
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

      {/* Partners Section */}
      <section className="py-10 sm:py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our Partners</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12 max-w-5xl mx-auto">
            <a href="https://spectrogramconsulting.com/home" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={spectrogramLogo} alt="Spectrogram Consulting" className="h-12 sm:h-16 w-auto object-contain" />
            </a>
            <a href="https://teau.ac.ke" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={eastAfricanUniversityLogo} alt="The East African University" className="h-16 sm:h-24 w-auto object-contain" />
            </a>
            <a href="https://www.facebook.com/Thehonestgroupfundation/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={johannesburgLogo} alt="Johannesburg" className="h-16 sm:h-24 w-auto object-contain" />
            </a>
            <a href="https://thelearnproject.co.za/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={learnProjectLogo} alt="The LEARN Project" className="h-16 sm:h-24 w-auto object-contain" />
            </a>
          </div>
        </div>
      </section>

      {/* Innovators Incubator Section */}
      <section className="py-12 sm:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6">
              <Lightbulb className="h-4 sm:h-5 w-4 sm:w-5 text-white" />
              <span className="text-xs sm:text-sm font-semibold text-white">Innovation Hub</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Got a Big Idea?<br />
              <span className="text-primary">We'll Help You Build It.</span>
            </h2>
            
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              We're building Africa's next generation of tech leaders. If you're a young innovator with a vision 
              that could transform communities, we want to hear from you. Get access to mentorship, resources, 
              and the support you need to bring your idea to life.
            </p>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-primary transition-colors">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Mentorship</h3>
                <p className="text-sm text-muted-foreground">1-on-1 guidance from industry experts who've been there</p>
              </Link>
              
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-secondary transition-colors">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Resources</h3>
                <p className="text-sm text-muted-foreground">Access to tools, training, and community support</p>
              </Link>
              
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-accent transition-colors">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Funding Guidance</h3>
                <p className="text-sm text-muted-foreground">Learn how to pitch and connect with potential investors</p>
              </Link>
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

      {/* Support Section */}
      <SupportSection />

      {/* Latest Tech News Section */}
      <TechNewsSection />

      <Footer />
    </div>;
};