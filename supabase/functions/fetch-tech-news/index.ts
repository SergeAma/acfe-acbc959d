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

// RSS feeds focused on African digital skills, education, and tech innovation
const RSS_FEEDS = [
  { url: 'https://techcrunch.com/tag/africa/feed/', source: 'TechCrunch Africa' },
  { url: 'https://disrupt-africa.com/feed/', source: 'Disrupt Africa' },
  { url: 'https://www.itnewsafrica.com/feed/', source: 'IT News Africa' },
  { url: 'https://techcabal.com/feed/', source: 'TechCabal' },
  { url: 'https://ventureburn.com/feed/', source: 'Ventureburn' },
];

async function parseRSSFeed(feedUrl: string, source: string): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS feed from ${feedUrl}`);
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch ${feedUrl}: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    
    // Simple XML parsing for RSS feeds
    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 15) {
      const itemXml = match[1];
      
      const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s.exec(itemXml);
      const linkMatch = /<link>(.*?)<\/link>/s.exec(itemXml);
      const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/s.exec(itemXml);
      const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s.exec(itemXml);
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1] || titleMatch[2] || '';
        const description = descMatch ? (descMatch[1] || descMatch[2] || '') : '';
        
        // Filter for digital skills, upskilling, and tech training keywords
        const relevantKeywords = [
          // Digital skills & education
          'digital skills', 'upskilling', 'training', 'education', 'learning',
          'edtech', 'e-learning', 'online course', 'bootcamp', 'academy',
          'certification', 'workforce', 'talent', 'youth', 'graduates',
          'coding', 'programming', 'developer', 'tech talent',
          // Big tech vendors
          'google', 'microsoft', 'amazon', 'aws', 'meta', 'facebook',
          'ibm', 'oracle', 'salesforce', 'cisco', 'intel', 'apple',
          'andela', 'flutterwave', 'paystack',
          // Non-profits & organizations
          'foundation', 'non-profit', 'nonprofit', 'ngo', 'initiative',
          'partnership', 'grant', 'scholarship', 'fellowship', 'program',
          'world bank', 'african development', 'undp', 'usaid', 'mastercard foundation',
          'rockefeller', 'gates foundation', 'tony elumelu',
          // Innovation & ecosystem
          'innovation', 'hub', 'incubator', 'accelerator', 'startup',
          'entrepreneurship', 'tech ecosystem', 'digital economy',
          'africa', 'african', 'kenya', 'nigeria', 'south africa', 'egypt', 'ghana', 'rwanda'
        ];
        
        const textToCheck = (title + ' ' + description).toLowerCase();
        const isRelevant = relevantKeywords.some(keyword => textToCheck.includes(keyword));
        
        if (isRelevant) {
          items.push({
            title: title.trim(),
            link: linkMatch[1].trim(),
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
            description: description.replace(/<[^>]*>/g, '').substring(0, 250).trim() + '...',
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
    console.log('Fetching digital skills news from RSS feeds');
    
    // Fetch all RSS feeds in parallel
    const allArticles = await Promise.all(
      RSS_FEEDS.map(feed => parseRSSFeed(feed.url, feed.source))
    );
    
    // Flatten and sort by date
    const articles = allArticles
      .flat()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 7); // Get top 7 most recent articles (1 featured + 6 list)
    
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
