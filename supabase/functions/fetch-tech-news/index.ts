import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

// RSS feeds focused on African tech, startups, and education
const RSS_FEEDS = [
  { url: 'https://techcrunch.com/tag/africa/feed/', source: 'TechCrunch Africa' },
  { url: 'https://disrupt-africa.com/feed/', source: 'Disrupt Africa' },
  { url: 'https://africabusinesscommunities.com/feed/', source: 'Africa Business Communities' },
];

async function parseRSSFeed(feedUrl: string, source: string): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS feed from ${feedUrl}`);
    const response = await fetch(feedUrl);
    const xmlText = await response.text();
    
    // Simple XML parsing for RSS feeds
    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 10) {
      const itemXml = match[1];
      
      const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s.exec(itemXml);
      const linkMatch = /<link>(.*?)<\/link>/s.exec(itemXml);
      const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/s.exec(itemXml);
      const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s.exec(itemXml);
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1] || titleMatch[2] || '';
        const description = descMatch ? (descMatch[1] || descMatch[2] || '') : '';
        
        // Filter for relevant keywords
        const relevantKeywords = [
          'education', 'startup', 'funding', 'investment', 'tech', 'digital',
          'learning', 'edtech', 'venture', 'raise', 'series', 'seed'
        ];
        
        const textToCheck = (title + ' ' + description).toLowerCase();
        const isRelevant = relevantKeywords.some(keyword => textToCheck.includes(keyword));
        
        if (isRelevant) {
          items.push({
            title: title.trim(),
            link: linkMatch[1].trim(),
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
            description: description.replace(/<[^>]*>/g, '').substring(0, 200).trim() + '...',
            source: source,
          });
        }
      }
    }
    
    console.log(`Parsed ${items.length} relevant articles from ${source}`);
    return items;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${feedUrl}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching tech news from RSS feeds');
    
    // Fetch all RSS feeds in parallel
    const allArticles = await Promise.all(
      RSS_FEEDS.map(feed => parseRSSFeed(feed.url, feed.source))
    );
    
    // Flatten and sort by date
    const articles = allArticles
      .flat()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 6); // Get top 6 most recent articles
    
    console.log(`Returning ${articles.length} articles`);
    
    return new Response(
      JSON.stringify({ articles }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-tech-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
