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
  category: string;
}

// RSS feeds focused on African digital skills, education, and tech innovation
const RSS_FEEDS = [
  { url: 'https://techcrunch.com/tag/africa/feed/', source: 'TechCrunch Africa', category: 'INNOVATION' },
  { url: 'https://disrupt-africa.com/feed/', source: 'Disrupt Africa', category: 'INNOVATION' },
  { url: 'https://www.itnewsafrica.com/feed/', source: 'IT News Africa', category: 'DIGITAL SKILLS' },
  { url: 'https://techcabal.com/feed/', source: 'TechCabal', category: 'INNOVATION' },
  { url: 'https://ventureburn.com/feed/', source: 'Ventureburn', category: 'INNOVATION' },
  { url: 'https://techpoint.africa/feed/', source: 'TechPoint Africa', category: 'DIGITAL SKILLS' },
  { url: 'https://it-online.co.za/feed/', source: 'IT-Online Africa', category: 'DIGITAL SKILLS' },
  { url: 'https://www.economist.com/middle-east-and-africa/rss.xml', source: 'The Economist', category: 'PARTNERSHIPS' },
  { url: 'https://www.jeuneafrique.com/feed/', source: 'Jeune Afrique', category: 'PARTNERSHIPS' },
];

// Decode HTML entities
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&#38;': '&',
    '&#038;': '&',
    '&#8211;': '-',
    '&#8212;': '-',
    '&#8216;': "'",
    '&#8217;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8230;': '...',
    '&nbsp;': ' ',
    '&ndash;': '-',
    '&mdash;': '-',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&hellip;': '...',
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }
  
  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded;
}

// Clean and extract text from CDATA or regular content
function cleanText(text: string): string {
  // Remove CDATA wrapper if present
  let cleaned = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  cleaned = decodeHTMLEntities(cleaned);
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

async function parseRSSFeed(feedUrl: string, source: string, category: string): Promise<NewsArticle[]> {
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
      
      // Extract title - handle both CDATA and regular content
      const titleMatch = /<title>([\s\S]*?)<\/title>/s.exec(itemXml);
      const linkMatch = /<link>([\s\S]*?)<\/link>/s.exec(itemXml);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/s.exec(itemXml);
      const descMatch = /<description>([\s\S]*?)<\/description>/s.exec(itemXml);
      
      if (titleMatch && linkMatch) {
        const title = cleanText(titleMatch[1]);
        const description = descMatch ? cleanText(descMatch[1]) : '';
        const link = cleanText(linkMatch[1]);
        
        // Skip empty titles
        if (!title || title.length < 5) continue;
        
        // Filter for digital skills, upskilling, and tech training keywords
        const relevantKeywords = [
          'digital skills', 'upskilling', 'training', 'education', 'learning',
          'edtech', 'e-learning', 'online course', 'bootcamp', 'academy',
          'certification', 'workforce', 'talent', 'youth', 'graduates',
          'coding', 'programming', 'developer', 'tech talent',
          'google', 'microsoft', 'amazon', 'aws', 'meta', 'facebook',
          'ibm', 'oracle', 'salesforce', 'cisco', 'intel', 'apple',
          'andela', 'flutterwave', 'paystack',
          'foundation', 'non-profit', 'nonprofit', 'ngo', 'initiative',
          'partnership', 'grant', 'scholarship', 'fellowship', 'program',
          'world bank', 'african development', 'undp', 'usaid', 'mastercard foundation',
          'rockefeller', 'gates foundation', 'tony elumelu',
          'innovation', 'hub', 'incubator', 'accelerator', 'startup',
          'entrepreneurship', 'tech ecosystem', 'digital economy',
          'africa', 'african', 'kenya', 'nigeria', 'south africa', 'egypt', 'ghana', 'rwanda'
        ];
        
        const textToCheck = (title + ' ' + description).toLowerCase();
        const isRelevant = relevantKeywords.some(keyword => textToCheck.includes(keyword));
        
        if (isRelevant) {
          items.push({
            title: title,
            link: link,
            pubDate: pubDateMatch ? cleanText(pubDateMatch[1]) : new Date().toISOString(),
            description: description.substring(0, 250).trim() + (description.length > 250 ? '...' : ''),
            source: source,
            category: category,
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
      RSS_FEEDS.map(feed => parseRSSFeed(feed.url, feed.source, feed.category))
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
