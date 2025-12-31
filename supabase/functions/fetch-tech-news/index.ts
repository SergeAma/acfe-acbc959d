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
  // Tech News Sources
  { url: 'https://techcrunch.com/tag/africa/feed/', source: 'TechCrunch Africa', category: 'INNOVATION' },
  { url: 'https://disrupt-africa.com/feed/', source: 'Disrupt Africa', category: 'INNOVATION' },
  { url: 'https://techcabal.com/feed/', source: 'TechCabal', category: 'INNOVATION' },
  { url: 'https://ventureburn.com/feed/', source: 'Ventureburn', category: 'INNOVATION' },
  { url: 'https://www.techinafrica.com/feed/', source: 'Tech in Africa', category: 'INNOVATION' },
  { url: 'https://www.itnewsafrica.com/feed/', source: 'IT News Africa', category: 'DIGITAL SKILLS' },
  { url: 'https://techpoint.africa/feed/', source: 'TechPoint Africa', category: 'DIGITAL SKILLS' },
  { url: 'https://it-online.co.za/feed/', source: 'IT-Online Africa', category: 'DIGITAL SKILLS' },
  
  // Business & Economy
  { url: 'https://african.business/feed/', source: 'African Business', category: 'PARTNERSHIPS' },
  { url: 'https://www.economist.com/middle-east-and-africa/rss.xml', source: 'The Economist', category: 'PARTNERSHIPS' },
  { url: 'https://www.jeuneafrique.com/feed/', source: 'Jeune Afrique', category: 'PARTNERSHIPS' },
  
  // Development & Funding Organizations
  { url: 'https://mastercardfdn.org/feed/', source: 'Mastercard Foundation', category: 'PARTNERSHIPS' },
  { url: 'https://blogs.worldbank.org/digital-development/rss.xml', source: 'World Bank Digital', category: 'DIGITAL SKILLS' },
  { url: 'https://www.afdb.org/en/rss-feeds', source: 'African Development Bank', category: 'PARTNERSHIPS' },
  
  // Digital Africa & UNESCO
  { url: 'https://digital-africa.co/feed/', source: 'Digital Africa', category: 'INNOVATION' },
  { url: 'https://en.unesco.org/news/rss.xml', source: 'UNESCO', category: 'DIGITAL SKILLS' },
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
        
        // Filter for digital skills, education programs, funding, and AI education in Africa
        const relevantKeywords = [
          // Digital skills across Africa
          'digital skills', 'digital literacy', 'tech skills', 'coding skills',
          'programming skills', 'data skills', 'cloud skills', 'cyber skills',
          
          // Digital education programs
          'digital education', 'edtech', 'e-learning', 'online learning',
          'tech training', 'digital training', 'coding bootcamp', 'tech bootcamp',
          'digital academy', 'tech academy', 'digital program', 'education program',
          'upskilling program', 'reskilling', 'workforce development',
          
          // Education funding
          'education funding', 'scholarship', 'grant', 'fellowship',
          'education investment', 'tech funding', 'digital inclusion',
          'mastercard foundation', 'gates foundation', 'tony elumelu',
          'world bank education', 'african development bank', 'usaid education',
          
          // AI education
          'ai education', 'ai training', 'artificial intelligence education',
          'machine learning training', 'ai skills', 'ai literacy',
          'ai program', 'ai bootcamp', 'ai academy'
        ];
        
        // Must also contain Africa-related terms
        const africaKeywords = [
          'africa', 'african', 'kenya', 'nigeria', 'south africa', 'egypt',
          'ghana', 'rwanda', 'ethiopia', 'tanzania', 'uganda', 'morocco',
          'senegal', 'cote d\'ivoire', 'cameroon', 'zimbabwe'
        ];
        
        const textToCheck = (title + ' ' + description).toLowerCase();
        const hasRelevantTopic = relevantKeywords.some(keyword => textToCheck.includes(keyword));
        const hasAfricaContext = africaKeywords.some(keyword => textToCheck.includes(keyword));
        const isRelevant = hasRelevantTopic && hasAfricaContext;
        
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
