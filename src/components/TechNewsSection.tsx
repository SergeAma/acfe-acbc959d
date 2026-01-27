import { useState, useMemo, useEffect, useRef } from 'react';
import { ExternalLink, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category?: string;
}

const NEWS_CATEGORIES_EN = ['ALL NEWS', 'DIGITAL SKILLS', 'INNOVATION', 'PARTNERSHIPS'] as const;
const NEWS_CATEGORIES_FR = ['TOUTES LES ACTUALITÉS', 'COMPÉTENCES NUMÉRIQUES', 'INNOVATION', 'PARTENARIATS'] as const;

// Curated Unsplash images for tech/Africa news
const CATEGORY_IMAGES = {
  'DIGITAL SKILLS': [
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop', // coding classroom
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop', // team collaboration
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop', // laptop coding
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop', // digital workspace
    'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=600&fit=crop', // women in tech
  ],
  'INNOVATION': [
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop', // robot hand
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop', // circuit board
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop', // digital globe
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop', // startup office
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop', // tech city
  ],
  'PARTNERSHIPS': [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop', // handshake meeting
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop', // team meeting
    'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=600&fit=crop', // business collaboration
    'https://images.unsplash.com/photo-1573167243872-43c6433b9d40?w=800&h=600&fit=crop', // conference
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop', // board meeting
  ],
};

// Get image for article based on category and index
const getArticleImage = (category: string, index: number) => {
  const categoryKey = category as keyof typeof CATEGORY_IMAGES;
  const images = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES['INNOVATION'];
  return images[index % images.length];
};

export const TechNewsSection = () => {
  const { t, language } = useLanguage();
  const NEWS_CATEGORIES = language === 'fr' ? NEWS_CATEGORIES_FR : NEWS_CATEGORIES_EN;
  const [activeCategory, setActiveCategory] = useState<string>(NEWS_CATEGORIES[0]);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Load Turnstile script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    
    (window as any).onTurnstileLoad = () => {
      if (turnstileRef.current && !turnstileWidgetId.current) {
        turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          theme: 'auto',
        });
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (turnstileWidgetId.current && (window as any).turnstile?.remove) {
        try {
          (window as any).turnstile.remove(turnstileWidgetId.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      try {
        if (script.parentNode) {
          document.head.removeChild(script);
        }
      } catch (e) {
        // Ignore if script was already removed
      }
    };
  }, []);

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
    queryKey: ['tech-news', language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-tech-news', {
        body: { language }
      });
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
    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }
    setIsSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-signup', {
        body: { email: email.trim(), turnstileToken }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.alreadySubscribed) {
        toast.success("You're already subscribed!");
      } else {
        toast.success('Successfully subscribed to the newsletter!');
      }
      setEmail('');
      setTurnstileToken(null);
      // Reset the Turnstile widget
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
      }
    } catch (error: any) {
      console.error('Newsletter signup error:', error);
      toast.error(error.message || 'Failed to subscribe. Please try again.');
      // Reset on error too
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken(null);
    } finally {
      setIsSubscribing(false);
    }
  };

  const allArticles = newsData?.articles || [];

  const getCuratedStatus = (articleUrl: string) => {
    return curatedData?.find(c => c.article_url === articleUrl);
  };

  // Map French categories to English for filtering
  const getCategoryForFilter = (category: string) => {
    const categoryMap: Record<string, string> = {
      'TOUTES LES ACTUALITÉS': 'ALL NEWS',
      'COMPÉTENCES NUMÉRIQUES': 'DIGITAL SKILLS',
      'INNOVATION': 'INNOVATION',
      'PARTENARIATS': 'PARTNERSHIPS'
    };
    return categoryMap[category] || category;
  };

  const filteredArticles = useMemo(() => {
    let filtered = allArticles.filter(article => !getCuratedStatus(article.link)?.is_hidden);
    
    const filterCategory = getCategoryForFilter(activeCategory);
    if (filterCategory !== 'ALL NEWS') {
      filtered = filtered.filter(article => article.category === filterCategory);
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
        isFeatured ? 'col-span-1 md:col-span-2 row-span-1 md:row-span-2' : ''
      }`}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${getArticleImage(article.category || 'INNOVATION', index)})` }}
      />
      
      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:20px_20px]" />
      
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
            {t('news.latestInsights')}
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight italic">
              {t('news.title')}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4" />
              <span>{t('news.updated')} {getTimeSinceUpdate()}</span>
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
              {activeCategory === NEWS_CATEGORIES[0]
                ? t('news.noArticles')
                : t('news.noCategory')}
            </p>
          </div>
        )}

        {/* Article Count */}
        {filteredArticles.length > 0 && (
          <p className="text-center text-muted-foreground text-sm mb-12">
            {t('news.showing')} {Math.min(filteredArticles.length, 9)} {t('news.of')} {allArticles.length} {t('news.articles')}
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
                {t('news.weeklyDigest')}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t('news.weeklyDigestDesc')}
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubscribe} className="mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-background"
                required
              />
              <Button
                type="submit"
                disabled={isSubscribing || !turnstileToken}
                className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
              >
                {isSubscribing ? t('news.subscribing') : t('footer.subscribe')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div ref={turnstileRef} className="mt-4" />
            <p className="text-xs text-muted-foreground mt-3">
              {t('news.noSpam')}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};
