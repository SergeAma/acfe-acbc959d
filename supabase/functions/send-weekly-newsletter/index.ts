import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string;
}

const RSS_FEEDS = [
  { url: "https://techpoint.africa/feed/", source: "TechPoint Africa", category: "DIGITAL SKILLS" },
  { url: "https://www.itnewsafrica.com/feed/", source: "IT News Africa", category: "DIGITAL SKILLS" },
  { url: "https://disrupt-africa.com/feed/", source: "Disrupt Africa", category: "STARTUP & FUNDING" },
  { url: "https://www.theafricareport.com/feed/", source: "The Africa Report", category: "AI & INNOVATION" },
];

const KEYWORDS = [
  "digital skills", "education", "training", "learning", "skills development",
  "startup", "funding", "investment", "venture", "accelerator", "incubator",
  "AI", "artificial intelligence", "machine learning", "technology",
  "africa", "african", "nigeria", "kenya", "south africa", "ghana", "egypt",
  "youth", "jobs", "employment", "career", "workforce"
];

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function cleanText(text: string): string {
  if (!text) return "";
  let cleaned = text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  cleaned = decodeHTMLEntities(cleaned);
  return cleaned.trim();
}

async function parseRSSFeed(feedUrl: string, source: string, category: string): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS feed: ${feedUrl}`);
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "ACFE Newsletter Bot/1.0" }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${feedUrl}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const articles: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 5) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const descriptionMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);

      if (titleMatch && linkMatch) {
        const title = cleanText(titleMatch[1]);
        const description = cleanText(descriptionMatch?.[1] || "");
        const combinedText = `${title} ${description}`.toLowerCase();
        
        const isRelevant = KEYWORDS.some(keyword => combinedText.includes(keyword.toLowerCase()));
        
        if (isRelevant) {
          articles.push({
            title,
            link: cleanText(linkMatch[1]),
            pubDate: pubDateMatch ? cleanText(pubDateMatch[1]) : new Date().toISOString(),
            description: description.substring(0, 200) + (description.length > 200 ? "..." : ""),
            source,
            category,
          });
        }
      }
    }

    console.log(`Found ${articles.length} relevant articles from ${source}`);
    return articles;
  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error);
    return [];
  }
}

async function fetchAllNews(): Promise<NewsArticle[]> {
  console.log("Fetching news from all RSS feeds...");
  
  const feedPromises = RSS_FEEDS.map(feed => 
    parseRSSFeed(feed.url, feed.source, feed.category)
  );
  
  const results = await Promise.all(feedPromises);
  const allArticles = results.flat();
  
  // Sort by date and take top 15
  allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  
  return allArticles.slice(0, 15);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function generateNewsletterHtml(articles: NewsArticle[], supabaseUrl: string, logId?: string): string {
  const currentDate = formatDate(new Date());
  
  const articlesByCategory: Record<string, NewsArticle[]> = {};
  articles.forEach(article => {
    if (!articlesByCategory[article.category]) {
      articlesByCategory[article.category] = [];
    }
    articlesByCategory[article.category].push(article);
  });

  let articlesHtml = '';
  Object.entries(articlesByCategory).forEach(([category, categoryArticles]) => {
    articlesHtml += `
      <tr>
        <td style="padding: 20px 0 10px 0;">
          <span style="background: linear-gradient(135deg, #4A5D23 0%, #6B7B3A 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            ${category}
          </span>
        </td>
      </tr>
    `;
    
    categoryArticles.forEach(article => {
      const trackingLink = logId 
        ? `${supabaseUrl}/functions/v1/email-tracking?type=click&logId=${logId}&url=${encodeURIComponent(article.link)}`
        : article.link;
      
      articlesHtml += `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #E8E4DE;">
            <a href="${trackingLink}" style="text-decoration: none; color: inherit;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #2D3B0F; font-weight: 600; line-height: 1.4;">
                ${article.title}
              </h3>
            </a>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #5A5A5A; line-height: 1.6;">
              ${article.description}
            </p>
            <span style="font-size: 12px; color: #8B8B8B;">
              ${article.source} • ${new Date(article.pubDate).toLocaleDateString()}
            </span>
          </td>
        </tr>
      `;
    });
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ACFE Weekly Newsletter</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F3EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F5F3EF;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4A5D23 0%, #6B7B3A 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    A Cloud for Everyone
                  </h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    Weekly Digital Skills & Innovation Digest
                  </p>
                </td>
              </tr>
              
              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 30px 20px 30px;">
                  <h2 style="margin: 0 0 10px 0; color: #2D3B0F; font-size: 24px; font-weight: 600;">
                    Hello Good People! 👋
                  </h2>
                  <p style="margin: 0; color: #5A5A5A; font-size: 15px; line-height: 1.6;">
                    Here's your weekly roundup of the latest in African digital skills, education, and innovation.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #8B8B8B; font-size: 13px;">
                    ${currentDate}
                  </p>
                </td>
              </tr>
              
              <!-- Articles -->
              <tr>
                <td style="padding: 0 30px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${articlesHtml}
                  </table>
                </td>
              </tr>
              
              <!-- CTA -->
              <tr>
                <td style="padding: 30px; text-align: center;">
                  <a href="https://acloudforeveryone.org/courses" style="display: inline-block; background: linear-gradient(135deg, #4A5D23 0%, #6B7B3A 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Explore Our Courses
                  </a>
                </td>
              </tr>
              
              <!-- Signature -->
              <tr>
                <td style="padding: 20px 30px 30px 30px; border-top: 1px solid #E8E4DE;">
                  <p style="margin: 0 0 5px 0; color: #2D3B0F; font-size: 15px; font-weight: 600;">
                    Stay curious, stay learning! 🌍
                  </p>
                  <p style="margin: 0; color: #5A5A5A; font-size: 14px; font-style: italic;">
                    — Corporate Rasta
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #F5F3EF; padding: 25px 30px; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #8B8B8B; font-size: 12px;">
                    A Cloud for Everyone | Building Africa's Digital Future
                  </p>
                  <p style="margin: 0; color: #8B8B8B; font-size: 12px;">
                    Questions? Contact us at <a href="mailto:contact@acloudforeveryone.org" style="color: #4A5D23;">contact@acloudforeveryone.org</a>
                  </p>
                  <p style="margin: 15px 0 0 0;">
                    <a href="https://acloudforeveryone.org" style="color: #4A5D23; text-decoration: none; font-size: 12px;">Visit Our Website</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${logId ? `<img src="${supabaseUrl}/functions/v1/email-tracking?type=open&logId=${logId}" width="1" height="1" style="display:none;" />` : ''}
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting weekly newsletter send...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch fresh news
    const articles = await fetchAllNews();
    
    if (articles.length === 0) {
      console.log("No news articles found. Aborting newsletter send.");
      return new Response(
        JSON.stringify({ message: "No news articles found. Newsletter not sent." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${articles.length} articles for newsletter`);

    // Step 2: Get all contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, email, first_name, last_name");

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      console.log("No contacts to send newsletter to");
      return new Response(
        JSON.stringify({ message: "No contacts found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending newsletter to ${contacts.length} contacts`);

    // Step 3: Generate subject with date
    const currentDate = formatDate(new Date());
    const subject = `ACFE Weekly Digest - ${currentDate}`;

    // Step 4: Send to each contact
    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        // Create email log entry for tracking
        const { data: logEntry, error: logError } = await supabase
          .from("email_logs")
          .insert({
            subject,
            contact_id: contact.id,
            status: "sending",
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (logError) {
          console.error(`Failed to create log for ${contact.email}:`, logError);
        }

        const logId = logEntry?.id;
        
        // Generate personalized newsletter HTML
        let newsletterHtml = generateNewsletterHtml(articles, supabaseUrl, logId);
        
        // Personalize greeting if we have a name
        if (contact.first_name) {
          newsletterHtml = newsletterHtml.replace(
            "Hello Good People! 👋",
            `Hello ${contact.first_name}! 👋`
          );
        }

        // Send email
        await resend.emails.send({
          from: "A Cloud for Everyone <newsletter@acloudforeveryone.org>",
          to: [contact.email],
          subject,
          html: newsletterHtml,
        });

        // Update log status
        if (logId) {
          await supabase
            .from("email_logs")
            .update({ status: "sent" })
            .eq("id", logId);
        }

        sentCount++;
        console.log(`Newsletter sent to ${contact.email}`);
      } catch (emailError: any) {
        console.error(`Failed to send to ${contact.email}:`, emailError);
        failedCount++;

        // Log the failure
        await supabase.from("email_logs").insert({
          subject,
          contact_id: contact.id,
          status: "failed",
          error_message: emailError.message,
        });
      }
    }

    console.log(`Newsletter complete. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ 
        message: `Weekly newsletter sent`,
        sent: sentCount,
        failed: failedCount,
        articlesIncluded: articles.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-newsletter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
