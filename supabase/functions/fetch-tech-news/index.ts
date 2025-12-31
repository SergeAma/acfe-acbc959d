import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AFRICA-FOCUSED PUBLICATIONS - Prioritized for digital skills & innovation
const RSS_FEEDS = [
  // Tier 1: Premium Africa Tech Sources
  { url: 'https://techcabal.com/feed/', name: 'TechCabal', priority: 1 },
  { url: 'https://disrupt-africa.com/feed/', name: 'Disrupt Africa', priority: 1 },
  { url: 'https://techinafrica.com/feed/', name: 'Tech in Africa', priority: 1 },
  { url: 'https://www.itnewsafrica.com/feed/', name: 'IT News Africa', priority: 1 },
  
  // Tier 2: Pan-African Business & Innovation
  { url: 'https://venturesafrica.com/feed/', name: 'Ventures Africa', priority: 2 },
  { url: 'https://www.howwemadeitinafrica.com/feed/', name: 'How We Made It In Africa', priority: 2 },
  { url: 'https://www.theafricareport.com/feed/', name: 'The Africa Report', priority: 2 },
  { url: 'https://african.business/feed/', name: 'African Business', priority: 2 },
  
  // Tier 3: International with Africa Focus
  { url: 'https://qz.com/africa/rss', name: 'Quartz Africa', priority: 2 },
  { url: 'https://www.reuters.com/arc/outboundfeeds/v3/category/world/africa/?outputType=xml', name: 'Reuters Africa', priority: 3 },
  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', name: 'BBC Africa', priority: 3 },
  { url: 'https://www.cnbcafrica.com/feed/', name: 'CNBC Africa', priority: 3 },
  
  // Tier 4: Tech Industry Sources (filtered for Africa)
  { url: 'https://techcrunch.com/tag/africa/feed/', name: 'TechCrunch Africa', priority: 2 },
  { url: 'https://restofworld.org/feed/', name: 'Rest of World', priority: 3 },
  { url: 'https://www.wired.com/feed/tag/africa/latest/rss', name: 'Wired Africa', priority: 3 },
  
  // Tier 5: EdTech & Skills Development
  { url: 'https://www.universityworldnews.com/rss.php?region=Africa', name: 'University World News Africa', priority: 2 },
  { url: 'https://edtechmagazine.com/higher/rss.xml', name: 'EdTech Magazine', priority: 4 },
];

// DIGITAL SKILLS & EDUCATION Keywords (ACFE Core Focus)
const DIGITAL_SKILLS_KEYWORDS = [
  'upskilling', 'reskilling', 'bootcamp', 'coding', 'programming', 'developer',
  'tech talent', 'digital literacy', 'online learning', 'e-learning', 'edtech',
  'stem education', 'youth employment', 'graduate', 'apprenticeship', 'certification',
  'tech skills', 'workforce development', 'career transition', 'mentorship',
  'training program', 'digital skills', 'software development', 'data science',
  'cloud computing', 'cybersecurity', 'ux design', 'product management',
  'scholarship', 'fellowship', 'internship', 'job placement', 'employability'
];

// INNOVATION Keywords
const INNOVATION_KEYWORDS = [
  'innovation', 'startup', 'entrepreneur', 'disrupt', 'transform', 'breakthrough',
  'emerging tech', 'fintech', 'healthtech', 'agritech', 'cleantech', 'proptech',
  'artificial intelligence', 'ai', 'machine learning', 'automation', 'iot',
  'digital transformation', 'tech hub', 'accelerator', 'incubator', 'sandbox',
  'pilot program', 'proof of concept', 'mvp', 'scale-up', 'unicorn',
  'tech ecosystem', 'innovation hub', 'research', 'development', 'r&d'
];

// PARTNERSHIPS Keywords
const PARTNERSHIPS_KEYWORDS = [
  'partnership', 'collaboration', 'joint venture', 'mou', 'agreement',
  'strategic alliance', 'corporate partnership', 'public-private', 'ngo',
  'foundation', 'grant', 'donor', 'impact investment', 'csr', 'sustainability',
  'government initiative', 'policy', 'regulation', 'digital agenda',
  'african union', 'afcfta', 'smart africa', 'bilateral', 'multilateral'
];

// Africa relevance keywords
const AFRICA_KEYWORDS = [
  'africa', 'african', 'nigeria', 'kenya', 'south africa', 'egypt', 'ghana',
  'rwanda', 'ethiopia', 'tanzania', 'uganda', 'senegal', 'morocco', 'tunisia',
  'lagos', 'nairobi', 'johannesburg', 'cairo', 'accra', 'kigali', 'addis ababa',
  'cape town', 'casablanca', 'dar es salaam', 'kampala', 'dakar', 'abuja',
  'pan-african', 'sub-saharan', 'east africa', 'west africa', 'north africa',
  'southern africa', 'francophone', 'anglophone', 'afcfta', 'african union'
];

// Crypto/spam keywords to filter out
const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'token',
  'nft', 'defi', 'web3', 'mining', 'altcoin', 'dogecoin', 'solana',
  'cardano', 'binance', 'coinbase', 'wallet', 'memecoin', 'airdrop'
];

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
  category: 'digital_skills' | 'innovation' | 'partnerships' | 'general';
  priority: number;
}

function categorizeArticle(title: string, description: string): 'digital_skills' | 'innovation' | 'partnerships' | 'general' {
  const text = `${title} ${description}`.toLowerCase();
  
  const digitalSkillsScore = DIGITAL_SKILLS_KEYWORDS.filter(kw => text.includes(kw)).length;
  const innovationScore = INNOVATION_KEYWORDS.filter(kw => text.includes(kw)).length;
  const partnershipsScore = PARTNERSHIPS_KEYWORDS.filter(kw => text.includes(kw)).length;
  
  const maxScore = Math.max(digitalSkillsScore, innovationScore, partnershipsScore);
  
  if (maxScore === 0) return 'general';
  if (digitalSkillsScore === maxScore) return 'digital_skills';
  if (innovationScore === maxScore) return 'innovation';
  return 'partnerships';
}

function getPriorityBoost(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  
  let boost = 0;
  
  // Strong boost for digital skills (ACFE core focus)
  if (DIGITAL_SKILLS_KEYWORDS.some(kw => text.includes(kw))) boost -= 2;
  
  // Moderate boost for innovation
  if (INNOVATION_KEYWORDS.some(kw => text.includes(kw))) boost -= 1;
  
  // Slight boost for partnerships
  if (PARTNERSHIPS_KEYWORDS.some(kw => text.includes(kw))) boost -= 0.5;
  
  return boost;
}

function isAfricaRelevant(title: string, description: string, sourceName: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  
  // Trusted Africa-focused sources always pass
  const trustedAfricaSources = [
    'TechCabal', 'Disrupt Africa', 'Tech in Africa', 'IT News Africa',
    'Ventures Africa', 'How We Made It In Africa', 'The Africa Report',
    'African Business', 'Quartz Africa', 'Reuters Africa', 'BBC Africa',
    'CNBC Africa', 'TechCrunch Africa', 'University World News Africa'
  ];
  
  if (trustedAfricaSources.some(s => sourceName.includes(s))) return true;
  
  return AFRICA_KEYWORDS.some(keyword => text.includes(keyword));
}

function shouldIncludeArticle(title: string, description: string, sourceName: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  
  // Filter out crypto spam (unless Africa-related crypto news)
  const hasCrypto = CRYPTO_KEYWORDS.some(kw => text.includes(kw));
  const hasAfrica = AFRICA_KEYWORDS.some(kw => text.includes(kw));
  
  if (hasCrypto && !hasAfrica) return false;
  
  // Must be Africa-relevant
  if (!isAfricaRelevant(title, description, sourceName)) return false;
  
  return true;
}

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

function extractImageUrl(itemXml: string): string | null {
  // Try media:content
  const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch?.[1]) return mediaMatch[1];
  
  // Try enclosure
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enclosureMatch?.[1]) return enclosureMatch[1];
  
  // Try media:thumbnail
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbMatch?.[1]) return thumbMatch[1];
  
  // Try to extract from description/content
  const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];
  
  return null;
}

function parseDate(dateStr: string): Date {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

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

function parseRSSItems(xmlText: string, sourceName: string, basePriority: number): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemXml);
    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemXml);
    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(itemXml);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemXml);
    
    if (!titleMatch || !linkMatch) continue;
    
    const title = cleanText(titleMatch[1]);
    const link = cleanText(linkMatch[1]);
    const description = descMatch ? cleanText(descMatch[1]).substring(0, 300) : '';
    const pubDate = pubDateMatch ? cleanText(pubDateMatch[1]) : new Date().toISOString();
    
    if (!title || title.length < 5 || !link) continue;
    
    if (!shouldIncludeArticle(title, description, sourceName)) {
      continue;
    }
    
    const imageUrl = extractImageUrl(itemXml);
    const category = categorizeArticle(title, description);
    const priorityBoost = getPriorityBoost(title, description);
    
    articles.push({
      title,
      description,
      url: link,
      imageUrl,
      source: sourceName,
      publishedAt: parseDate(pubDate).toISOString(),
      category,
      priority: basePriority + priorityBoost
    });
  }
  
  return articles;
}

async function fetchFeed(feedConfig: { url: string; name: string; priority: number }): Promise<NewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(feedConfig.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ACFE-NewsBot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`Failed to fetch ${feedConfig.name}: ${response.status}`);
      return [];
    }
    
    const text = await response.text();
    const articles = parseRSSItems(text, feedConfig.name, feedConfig.priority);
    
    console.log(`Fetched ${articles.length} articles from ${feedConfig.name}`);
    return articles;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error fetching ${feedConfig.name}:`, errorMessage);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Starting ACFE news feed fetch...');
    
    // Fetch all feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => fetchFeed(feed));
    const feedResults = await Promise.all(feedPromises);
    
    // Flatten and deduplicate
    let allArticles = feedResults.flat();
    
    // Remove duplicates by URL
    const seen = new Set<string>();
    allArticles = allArticles.filter(article => {
      const key = article.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by priority (lower = better) then by date
    allArticles.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    // Take top articles
    const topArticles = allArticles.slice(0, 50);
    
    console.log(`Returning ${topArticles.length} articles`);
    
    return new Response(JSON.stringify({
      articles: topArticles,
      fetchedAt: new Date().toISOString(),
      totalSources: RSS_FEEDS.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch-tech-news:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
