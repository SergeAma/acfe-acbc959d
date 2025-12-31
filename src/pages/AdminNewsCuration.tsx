import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pin, PinOff, Eye, EyeOff, ExternalLink, RefreshCw } from 'lucide-react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  description: string;
  source: string;
  imageUrl: string | null;
  category: 'digital_skills' | 'innovation' | 'partnerships' | 'general';
  priority: number;
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    digital_skills: 'DIGITAL SKILLS',
    innovation: 'INNOVATION',
    partnerships: 'PARTNERSHIPS',
    general: 'GENERAL',
  };
  return labels[category] || 'GENERAL';
};

interface CuratedNews {
  id: string;
  article_url: string;
  article_title: string;
  is_pinned: boolean;
  is_hidden: boolean;
  pinned_at: string | null;
}

export default function AdminNewsCuration() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch news articles
  const { data: newsData, isLoading: newsLoading, refetch: refetchNews } = useQuery({
    queryKey: ['tech-news-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-tech-news');
      if (error) throw error;
      return data as { articles: NewsArticle[] };
    },
  });

  // Fetch curated settings
  const { data: curatedData, isLoading: curatedLoading } = useQuery({
    queryKey: ['curated-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_news')
        .select('*');
      if (error) throw error;
      return data as CuratedNews[];
    },
  });

  // Mutation for toggling pin/hide
  const toggleMutation = useMutation({
    mutationFn: async ({ 
      articleUrl, 
      articleTitle, 
      action 
    }: { 
      articleUrl: string; 
      articleTitle: string; 
      action: 'pin' | 'unpin' | 'hide' | 'unhide' 
    }) => {
      const existing = curatedData?.find(c => c.article_url === articleUrl);
      
      if (existing) {
        const updates: Partial<CuratedNews> = {};
        if (action === 'pin') {
          updates.is_pinned = true;
          updates.pinned_at = new Date().toISOString();
        } else if (action === 'unpin') {
          updates.is_pinned = false;
          updates.pinned_at = null;
        } else if (action === 'hide') {
          updates.is_hidden = true;
        } else if (action === 'unhide') {
          updates.is_hidden = false;
        }
        
        const { error } = await supabase
          .from('curated_news')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('curated_news')
          .insert({
            article_url: articleUrl,
            article_title: articleTitle,
            is_pinned: action === 'pin',
            is_hidden: action === 'hide',
            pinned_at: action === 'pin' ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      toast.success('Article updated');
    },
    onError: (error) => {
      console.error('Error updating article:', error);
      toast.error('Failed to update article');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchNews();
    setRefreshing(false);
    toast.success('News refreshed');
  };

  const getCuratedStatus = (articleUrl: string) => {
    return curatedData?.find(c => c.article_url === articleUrl);
  };

  const articles = newsData?.articles || [];
  const isLoading = newsLoading || curatedLoading;

  // Sort articles: pinned first, then by date
  const sortedArticles = [...articles].sort((a, b) => {
    const aStatus = getCuratedStatus(a.url);
    const bStatus = getCuratedStatus(b.url);
    
    if (aStatus?.is_pinned && !bStatus?.is_pinned) return -1;
    if (!aStatus?.is_pinned && bStatus?.is_pinned) return 1;
    
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Filter out hidden for display count
  const visibleCount = sortedArticles.filter(a => !getCuratedStatus(a.url)?.is_hidden).length;
  const pinnedCount = curatedData?.filter(c => c.is_pinned).length || 0;
  const hiddenCount = curatedData?.filter(c => c.is_hidden).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'News Curation' },
          ]}
        />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">News Curation</h1>
            <p className="text-muted-foreground mt-1">
              Pin or hide articles to curate the news section
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh News
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{visibleCount}</div>
              <p className="text-sm text-muted-foreground">Visible Articles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{pinnedCount}</div>
              <p className="text-sm text-muted-foreground">Pinned Articles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{hiddenCount}</div>
              <p className="text-sm text-muted-foreground">Hidden Articles</p>
            </CardContent>
          </Card>
        </div>

        {/* Article List */}
        <Card>
          <CardHeader>
            <CardTitle>All Articles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedArticles.map((article, index) => {
                  const status = getCuratedStatus(article.url);
                  const isPinned = status?.is_pinned || false;
                  const isHidden = status?.is_hidden || false;

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                        isHidden ? 'opacity-50 bg-muted/50' : isPinned ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isPinned && (
                            <Badge variant="default" className="text-xs">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          {isHidden && (
                            <Badge variant="destructive" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(article.category)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {article.source}
                          </span>
                        </div>
                        <h4 className="font-medium text-foreground line-clamp-2 mb-1">
                          {article.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {article.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={isPinned ? 'default' : 'outline'}
                          onClick={() => toggleMutation.mutate({
                            articleUrl: article.url,
                            articleTitle: article.title,
                            action: isPinned ? 'unpin' : 'pin',
                          })}
                          disabled={toggleMutation.isPending}
                        >
                          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant={isHidden ? 'destructive' : 'outline'}
                          onClick={() => toggleMutation.mutate({
                            articleUrl: article.url,
                            articleTitle: article.title,
                            action: isHidden ? 'unhide' : 'hide',
                          })}
                          disabled={toggleMutation.isPending}
                        >
                          {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
