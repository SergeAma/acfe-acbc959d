import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  // Rich content fields (optional for backward compatibility)
  heading?: string;
  introText?: string;
  gettingStartedTitle?: string;
  gettingStartedItems?: string[];
  calloutText?: string;
  ctaButtons?: Array<{ text: string; url: string }>;
  closingText?: string;
  signature?: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('welcome.subject', language);
  
  // If rich content provided, use it; otherwise fall back to default
  const hasRichContent = data.introText || data.gettingStartedItems;
  
  if (hasRichContent) {
    // Rich welcome email with full content
    const heading = data.heading || (language === 'en' ? 'Welcome, there' : 'Bienvenue');
    const introText = data.introText || getText('welcome.body', language);
    const gettingStartedTitle = data.gettingStartedTitle || (language === 'en' ? 'Getting started' : 'Pour commencer');
    const gettingStartedItems = data.gettingStartedItems || [];
    const calloutText = data.calloutText;
    const closingText = data.closingText || (language === 'en' ? "There's a cloud for everyone." : "Il y a un nuage pour tout le monde.");
    const signature = data.signature || (language === 'en' ? 'The ACFE Team' : "L'Équipe ACFE");
    
    // Build getting started list HTML
    const gettingStartedHtml = gettingStartedItems.length > 0 
      ? `
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1F1F1F;">${gettingStartedTitle}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #1F1F1F; line-height: 1.6;">
            ${gettingStartedItems.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
          </ul>
        </div>
      ` 
      : '';
    
    // Build callout block if provided
    const calloutHtml = calloutText 
      ? `
        <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">${calloutText}</p>
        </div>
      ` 
      : '';
    
    // Build multiple CTA buttons if provided
    const ctaButtons = data.ctaButtons || [
      { text: getText('welcome.cta', language), url: 'https://acloudforeveryone.org/dashboard' }
    ];
    
    const ctaButtonsHtml = ctaButtons.length > 0 
      ? `
        <div style="margin: 24px 0; text-align: center;">
          ${ctaButtons.map((btn, idx) => `
            <a href="${btn.url}" style="
              display: inline-block;
              margin: 8px;
              padding: 14px 28px;
              background-color: ${idx === 0 ? '#2563eb' : 'transparent'};
              color: ${idx === 0 ? '#ffffff' : '#2563eb'};
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              ${idx > 0 ? 'border: 2px solid #2563eb;' : ''}
            ">${btn.text}</a>
          `).join('')}
        </div>
      ` 
      : '';
    
    // Build body content
    const bodyContent = `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1F1F1F;">${heading}</h2>
      <p style="margin: 0 0 16px 0; color: #1F1F1F; line-height: 1.6;">${introText}</p>
      ${gettingStartedHtml}
      ${calloutHtml}
      ${ctaButtonsHtml}
      <p style="margin: 24px 0 8px 0; font-style: italic; color: #6b7280;">${closingText}</p>
      <p style="margin: 0; color: #1F1F1F; font-weight: 500;">${signature}</p>
    `;
    
    const html = buildCanonicalTemplate({
      greeting: getGreeting(data.userName, language),
      bodyContent,
      language
    });
    
    return { subject, html };
  }
  
  // Default simple welcome email (backward compatibility)
  const html = buildCanonicalTemplate({
    greeting: getGreeting(data.userName, language),
    bodyContent: `<p>${getText('welcome.body', language)}</p><br><p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>`,
    ctaText: getText('welcome.cta', language),
    ctaUrl: 'https://acloudforeveryone.org/dashboard',
    language
  });
  return { subject, html };
}
