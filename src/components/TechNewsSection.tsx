import { useState, useMemo } from 'react';
import { ExternalLink, Mail, ArrowRight, RefreshCw } from 'lucide-react';
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

// Generate placeholder image based on article title
const getPlaceholderImage = (title: string, index: number) => {
  const colors = [
    '3d4f3d', // sage
    '4a5568', // slate
    '5c4033', // brown
    '2d3748', // dark slate
    '4a3728', // coffee
    '3d5a3d', // olive
  ];
  const color = colors[index % colors.length];
  return `https://images.unsplash.com/photo-${1500000000000 + (title.length * 1000000)}?w=600&h=400&fit=crop&auto=format`;
};

// Fallback gradient backgrounds
const getGradientBg = (index: number) => {
  const gradients = [
    'from-sage-800/90 to-sage-900/95',
    'from-stone-700/90 to-stone-800/95',
    'from-olive-800/90 to-olive-900/95',
    'from-neutral-700/90 to-neutral-800/95',
    'from-zinc-700/90 to-zinc-800/95',
    'from-slate-700/90 to-slate-800/95',
  ];
  return gradients[index % gradients.length];
};

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
      const { data, error } = await supabase.functions.invoke('fetch-tech-news');
      if (error) throw error;
      return data as { articles: NewsArticle[] };
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

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recent';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      const { error } = await supabase.from('contacts').insert({
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
        try {
          await supabase.functions.invoke('send-newsletter-welcome', {
            body: { email: email.trim() },
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

  const getCuratedStatus = (articleUrl: string) => {
    return curatedData?.find(c => c.article_url === articleUrl);
  };

  const filteredArticles = useMemo(() => {
    let filtered = allArticles.filter(article => !getCuratedStatus(article.link)?.is_hidden);
    
    if (activeCategory !== 'ALL NEWS') {
      filtered = filtered.filter(article => article.category === activeCategory);
    }
    
    return filtered.sort((a, b) => {
      const aStatus = getCuratedStatus(a.link);
      const bStatus = getCuratedStatus(b.link);
      
      if (aStatus?.is_pinned && !bStatus?.is_pinned) return -1;
      if (!aStatus?.is_pinned && bStatus?.is_pinned) return 1;
      
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
  }, [allArticles, activeCategory, curatedData]);

  const featuredArticle = filteredArticles[0];
  const gridArticles = filteredArticles.slice(1, 9);

  // News Card Component
  const NewsCard = ({ 
    article, 
    index, 
    isFeatured = false 
  }: { 
    article: NewsArticle; 
    index: number; 
    isFeatured?: boolean;
  }) => (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        isFeatured ? 'col-span-2 row-span-2' : ''
      }`}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${getGradientBg(index)}`} />
      
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      
      {/* Content */}
      <div className={`relative h-full flex flex-col justify-end ${isFeatured ? 'p-6 sm:p-8 min-h-[320px] sm:min-h-[400px]' : 'p-4 sm:p-5 min-h-[180px] sm:min-h-[200px]'}`}>
        {/* Category & Time */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-md uppercase tracking-wide">
            {article.category || 'DIGITAL SKILLS'}
          </span>
          <span className="text-white/70 text-xs sm:text-sm">
            • {getTimeAgo(article.pubDate)}
          </span>
        </div>
        
        {/* Title */}
        <h3 className={`font-bold text-white leading-tight group-hover:text-primary-foreground/90 transition-colors ${
          isFeatured ? 'text-xl sm:text-2xl md:text-3xl mb-3 sm:mb-4' : 'text-sm sm:text-base line-clamp-2'
        }`}>
          {article.title}
        </h3>
        
        {/* Description - only for featured */}
        {isFeatured && (
          <p className="text-white/80 text-sm sm:text-base line-clamp-2 sm:line-clamp-3 mb-4">
            {article.description}
          </p>
        )}
        
        {/* Source - only for featured */}
        {isFeatured && (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <span>{article.source}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </a>
  );

  return (
    <section className="py-12 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <span className="text-xs font-semibold tracking-wider text-primary uppercase mb-2 block">
            Latest Insights
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight italic">
              Africa Digital News & Innovation
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4" />
              <span>Updated {getTimeSinceUpdate()}</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
          {NEWS_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                activeCategory === category
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* News Bento Grid */}
        {newsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <Skeleton className="col-span-1 md:col-span-2 row-span-2 h-[300px] sm:h-[400px] rounded-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] sm:h-[200px] rounded-xl" />
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
            {/* Featured Article - Large */}
            {featuredArticle && (
              <NewsCard article={featuredArticle} index={0} isFeatured />
            )}
            
            {/* Grid Articles */}
            {gridArticles.map((article, index) => (
              <NewsCard key={index} article={article} index={index + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl mb-8 border border-border">
            <p className="text-muted-foreground">
              {activeCategory === 'ALL NEWS'
                ? 'No news articles available at the moment. Check back soon!'
                : `No articles found for "${activeCategory}". Try selecting a different category.`}
            </p>
          </div>
        )}

        {/* Article Count */}
        {filteredArticles.length > 0 && (
          <p className="text-center text-muted-foreground text-sm mb-12">
            Showing {Math.min(filteredArticles.length, 9)} of {allArticles.length} articles
          </p>
        )}

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
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-background"
                required
              />
              <Button
                type="submit"
                disabled={isSubscribing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
              >
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
    </section>
  );
};
