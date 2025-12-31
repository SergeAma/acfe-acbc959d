import { useState, useMemo } from 'react';
import { Globe, ExternalLink, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category?: string;
}
const NEWS_CATEGORIES = ['ALL NEWS', 'DIGITAL SKILLS', 'INNOVATION', 'PARTNERSHIPS'] as const;
export const TechNewsSection = () => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL NEWS');
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  interface CuratedNews {
    article_url: string;
    is_pinned: boolean;
    is_hidden: boolean;
    pinned_at: string | null;
  }

  const {
    data: newsData,
    isLoading: newsLoading,
    dataUpdatedAt
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
    staleTime: 1000 * 60 * 30
  });

  const { data: curatedData } = useQuery({
    queryKey: ['curated-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_news')
        .select('article_url, is_pinned, is_hidden, pinned_at');
      if (error) throw error;
      return data as CuratedNews[];
    },
    staleTime: 1000 * 60 * 5
  });
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  const getTimeSinceUpdate = () => {
    if (!dataUpdatedAt) return 'Just now';
    const diff = Date.now() - dataUpdatedAt;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsSubscribing(true);
    try {
      const {
        error
      } = await supabase.from('contacts').insert({
        email: email.trim(),
        source: 'newsletter_signup'
      });
      if (error) {
        if (error.code === '23505') {
          toast.success("You're already subscribed!");
        } else {
          throw error;
        }
      } else {
        toast.success('Successfully subscribed to the newsletter!');
        
        // Send welcome email automatically
        try {
          await supabase.functions.invoke('send-newsletter-welcome', {
            body: {
              email: email.trim(),
            },
          });
        } catch (emailError) {
          console.error('Failed to send newsletter welcome email:', emailError);
        }
      }
      setEmail('');
    } catch (error) {
      console.error('Newsletter signup error:', error);
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };
  const allArticles = newsData?.articles || [];

  // Helper to get curated status
  const getCuratedStatus = (articleUrl: string) => {
    return curatedData?.find(c => c.article_url === articleUrl);
  };

  // Filter articles based on active category and curated settings (hide hidden articles)
  const filteredArticles = useMemo(() => {
    let filtered = allArticles.filter(article => !getCuratedStatus(article.link)?.is_hidden);
    
    if (activeCategory !== 'ALL NEWS') {
      filtered = filtered.filter(article => article.category === activeCategory);
    }
    
    // Sort: pinned articles first, then by date
    return filtered.sort((a, b) => {
      const aStatus = getCuratedStatus(a.link);
      const bStatus = getCuratedStatus(b.link);
      
      if (aStatus?.is_pinned && !bStatus?.is_pinned) return -1;
      if (!aStatus?.is_pinned && bStatus?.is_pinned) return 1;
      
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
  }, [allArticles, activeCategory, curatedData]);
  const featuredArticle = filteredArticles[0];
  const listArticles = filteredArticles.slice(1);
  return <section className="py-12 sm:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <span className="text-xs font-semibold tracking-wider text-primary uppercase mb-2 block">
            Latest Insights
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Africa Digital News<br className="hidden md:block" /> & Innovation
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4" />
              <span>Updated {getTimeSinceUpdate()}</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
          {NEWS_CATEGORIES.map(category => <button key={category} onClick={() => setActiveCategory(category)} className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {category}
            </button>)}
        </div>

        {/* News Grid */}
        {newsLoading ? <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-3">
              {Array.from({
            length: 5
          }).map((_, i) => <div key={i} className="bg-card rounded-lg p-4 flex gap-4 border border-border">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </div>)}
            </div>
          </div> : filteredArticles.length > 0 ? <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Featured Article */}
            {featuredArticle && <div className="bg-card rounded-lg p-4 sm:p-6 flex flex-col h-full border border-border">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-md">
                    {featuredArticle.category || 'DIGITAL SKILLS'}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(featuredArticle.pubDate)}
                  </span>
                </div>
                
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground mb-3 sm:mb-4 leading-tight">
                  {featuredArticle.title}
                </h3>
                
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 flex-1 line-clamp-3 sm:line-clamp-4">
                  {featuredArticle.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                  <span className="text-sm font-medium text-muted-foreground">
                    {featuredArticle.source}
                  </span>
                  <a href={featuredArticle.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-2 transition-colors">
                    Read More
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>}

            {/* Article List */}
            <div className="space-y-3">
              {listArticles.map((article, index) => <a key={index} href={article.link} target="_blank" rel="noopener noreferrer" className="bg-card rounded-lg p-4 flex gap-4 items-start hover:bg-muted/50 transition-colors group border border-border block">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary uppercase">
                        {article.category || 'DIGITAL SKILLS'}
                      </span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(article.pubDate)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                  </div>
                </a>)}
            </div>
          </div> : <div className="text-center py-12 bg-card rounded-lg mb-8 border border-border">
            <p className="text-muted-foreground">
              {activeCategory === 'ALL NEWS' ? 'No news articles available at the moment. Check back soon!' : `No articles found for "${activeCategory}". Try selecting a different category.`}
            </p>
          </div>}

        {/* Article Count */}
        {filteredArticles.length > 0 && <p className="text-center text-muted-foreground text-sm mb-12">
            Showing {filteredArticles.length} of {allArticles.length} articles
          </p>}

        {/* Newsletter Signup */}
        <div className="bg-card rounded-xl p-6 sm:p-8 border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                Weekly Africa Tech Digest
              </h3>
              <p className="text-muted-foreground text-sm">
                Get curated insights on African startups, VC deals, and tech trends delivered to your inbox every week.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubscribe} className="mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 bg-background" required />
              <Button type="submit" disabled={isSubscribing} className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap">
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </form>
        </div>
      </div>
    </section>;
};