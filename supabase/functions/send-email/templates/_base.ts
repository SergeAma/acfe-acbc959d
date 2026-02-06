/**
 * ACFE Canonical Email Template - Used for ALL emails
 * DO NOT modify without explicit approval
 * 
 * Design tokens match existing EMAIL_DESIGN_TOKENS from _shared/email-template.ts
 */

export interface EmailBaseProps {
  greeting?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerNote?: string;
  language?: 'en' | 'fr';
}

// Design tokens - FROZEN, matches existing system
const DESIGN_TOKENS = {
  PRIMARY_COLOR: '#4B5C4B',        // Muted olive-green
  SECONDARY_COLOR: '#C9D6C9',      // Light sage
  BACKGROUND_DARK: '#2F2F2F',      // Dark gray header/footer
  BACKGROUND_LIGHT: '#F4F7F4',     // Light gray-green for blocks
  BACKGROUND_WHITE: '#FFFFFF',     // Base white
  TEXT_LIGHT: '#FFFFFF',           // White text
  TEXT_DARK: '#1F1F1F',            // Dark text
  TEXT_MUTED: '#666666',           // Muted text for footer
  BORDER_COLOR: '#E0E0E0',         // Subtle borders
  MAX_WIDTH: '600px',
  BORDER_RADIUS: '6px',
  LOGO_URL: 'https://acloudforeveryone.org/acfe-logo-email.png',
  LOGO_WIDTH: '140',
  LOGO_HEIGHT: '50',
  FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export function buildCanonicalTemplate(props: EmailBaseProps): string {
  const t = DESIGN_TOKENS;
  const year = new Date().getFullYear();
  const lang = props.language || 'en';
  
  const tagline = lang === 'fr' 
    ? 'Autonomiser la jeunesse africaine grâce aux compétences numériques et au mentorat.'
    : 'Empowering African youth through digital skills and mentorship.';
  
  const contactLabel = lang === 'fr' ? 'Contactez-nous' : 'Contact us';

  // Build greeting section
  const greetingHtml = props.greeting ? `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <p style="margin: 0; font-size: 15px; color: ${t.TEXT_DARK};">${props.greeting}</p>
      </td>
    </tr>` : '';

  // Build CTA section
  let ctaHtml = '';
  if (props.ctaText && props.ctaUrl) {
    ctaHtml = `
    <tr>
      <td style="padding: 24px 0;">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td style="padding: 0 8px 0 0;">
              <a href="${props.ctaUrl}" style="display: inline-block; background-color: ${t.PRIMARY_COLOR}; color: ${t.TEXT_LIGHT}; text-decoration: none; padding: 14px 28px; border-radius: ${t.BORDER_RADIUS}; font-weight: 600; font-size: 14px;">${props.ctaText}</a>
            </td>
            ${props.secondaryCtaText && props.secondaryCtaUrl ? `
            <td style="padding: 0 0 0 8px;">
              <a href="${props.secondaryCtaUrl}" style="display: inline-block; background-color: transparent; color: ${t.PRIMARY_COLOR}; text-decoration: none; padding: 14px 28px; border-radius: ${t.BORDER_RADIUS}; font-weight: 600; font-size: 14px; border: 2px solid ${t.PRIMARY_COLOR};">${props.secondaryCtaText}</a>
            </td>` : ''}
          </tr>
        </table>
      </td>
    </tr>`;
  }

  // Build footer note
  const footerNoteHtml = props.footerNote ? `
    <tr>
      <td style="padding: 16px 0 0 0;">
        <p style="margin: 0; font-size: 13px; color: ${t.TEXT_MUTED}; font-style: italic;">${props.footerNote}</p>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>A Cloud For Everyone</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .cta-button { padding: 14px 28px !important; }
  </style>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 24px 16px !important; }
      .cta-button { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: ${t.FONT_FAMILY}; line-height: 1.6; color: ${t.TEXT_DARK}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table class="email-container" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: ${t.MAX_WIDTH}; background-color: ${t.BACKGROUND_WHITE}; border-radius: ${t.BORDER_RADIUS}; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- HEADER -->
          <tr>
            <td style="background-color: ${t.BACKGROUND_DARK}; padding: 24px; text-align: center;">
              <img src="${t.LOGO_URL}" alt="ACFE" width="${t.LOGO_WIDTH}" height="${t.LOGO_HEIGHT}" style="display: block; margin: 0 auto; border: 0; max-width: 100%; height: auto;">
              <p style="margin: 12px 0 0 0; color: ${t.TEXT_LIGHT}; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">A CLOUD FOR EVERYONE</p>
            </td>
          </tr>
          
          <!-- TAGLINE BAR -->
          <tr>
            <td style="background-color: ${t.PRIMARY_COLOR}; padding: 12px 24px; text-align: center;">
              <p style="margin: 0; color: ${t.TEXT_LIGHT}; font-size: 13px; font-style: italic;">${tagline}</p>
            </td>
          </tr>
          
          <!-- CONTENT ZONE -->
          <tr>
            <td class="content-padding" style="padding: 32px 32px 24px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                
                <!-- GREETING -->
                ${greetingHtml}
                
                <!-- BODY CONTENT -->
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <div style="font-size: 15px; color: ${t.TEXT_DARK}; line-height: 1.6;">${props.bodyContent}</div>
                  </td>
                </tr>
                
                <!-- CTA BUTTONS -->
                ${ctaHtml}
                
                <!-- FOOTER NOTE -->
                ${footerNoteHtml}
                
              </table>
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background-color: ${t.BACKGROUND_DARK}; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: ${t.TEXT_LIGHT};">${contactLabel}</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: ${t.TEXT_LIGHT};">
                <a href="mailto:contact@acloudforeveryone.org" style="color: ${t.TEXT_LIGHT}; text-decoration: underline;">contact@acloudforeveryone.org</a>
                &nbsp;|&nbsp;
                <a href="https://www.acloudforeveryone.org" style="color: ${t.TEXT_LIGHT}; text-decoration: underline;">www.acloudforeveryone.org</a>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: ${t.TEXT_MUTED};">London &bull; Nairobi &bull; Johannesburg</p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: ${t.TEXT_MUTED};">&copy; ${year} A Cloud for Everyone. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
