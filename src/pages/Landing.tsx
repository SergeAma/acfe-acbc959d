import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Users, BookOpen, Globe, Sparkles, Award, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
export const Landing = () => {
  const {
    user
  } = useAuth();
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-muted py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              Join 300+ Graduates and Master a Career-Boosting Digital Skill!
            </h1>
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
            <p className="text-xl text-muted-foreground">Building bridges between knowledge and opportunity</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Expert Mentors</h3>
                <p className="text-muted-foreground">
                  Learn from experienced professionals who are passionate about sharing their knowledge and empowering the next generation
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-secondary transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Comprehensive Courses</h3>
                <p className="text-muted-foreground">
                  Access structured learning paths covering essential digital skills from web development to data science and more
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-accent transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">Community Focused</h3>
                <p className="text-muted-foreground">
                  Join a supportive community of learners and mentors dedicated to advancing digital skills across Africa
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            
            <div>
              
              
            </div>
            
          </div>
        </div>
      </section>

      {/* Recommended Reading / Thought Leadership Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Recommended Reading</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardContent className="p-6">
                <div className="h-48 bg-secondary/20 rounded-lg mb-4 flex items-center justify-center">
                  <FileText className="h-16 w-16 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">Digital Skills for Youth Employment in Africa</h3>
                <p className="text-muted-foreground mb-4">
                  Fostering Digital Transformation for Social Inclusion, Gender Equality & Development
                </p>
                <Button variant="outline" className="w-full">Read More</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardContent className="p-6">
                <div className="h-48 bg-accent/20 rounded-lg mb-4 flex items-center justify-center">
                  <TrendingUp className="h-16 w-16 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">Women's Digital Financial Inclusion in Africa</h3>
                <p className="text-muted-foreground mb-4">
                  Key findings from a comprehensive study across African nations
                </p>
                <Button variant="outline" className="w-full">Read More</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardContent className="p-6">
                <div className="h-48 bg-secondary/20 rounded-lg mb-4 flex items-center justify-center">
                  <Globe className="h-16 w-16 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">Demand for Digital Skills in Sub-Saharan Africa</h3>
                <p className="text-muted-foreground mb-4">
                  Five-country study on the evolving digital skills landscape
                </p>
                <Button variant="outline" className="w-full">Read More</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-background mb-4">Where do I start?</h2>
          <div className="max-w-xl mx-auto mb-8 text-left bg-background/90 p-8 rounded-lg">
            <ol className="space-y-4 text-foreground">
              <li className="flex gap-3">
                <span className="font-bold">1)</span>
                <span>Register to start learning</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2)</span>
                <span>Attend guided training</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3)</span>
                <span>Receive ongoing mentorship from industry experts</span>
              </li>
            </ol>
          </div>
          {!user && <Link to="/auth?mode=signup">
              <Button size="lg" className="text-lg px-10 bg-foreground hover:bg-foreground/90 text-background rounded-full border-2 border-background">
                START TODAY
              </Button>
            </Link>}
        </div>
      </section>
    </div>;
};