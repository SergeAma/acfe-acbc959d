import { buildCanonicalTemplate } from './_base.ts';
import { getText, type Language } from './_translations.ts';

/**
 * Admin notification email data
 */
export interface AdminEmailData {
  studentName: string;
  studentEmail: string;
  signupDate: string;
}

/**
 * Build admin notification emails
 */
export function buildAdminEmail(
  type: 'admin-new-student',
  data: AdminEmailData,
  language: Language = 'en'
): { subject: string; html: string } {
  
  if (type === 'admin-new-student') {
    const subject = getText('admin.newStudent.subject', language, { 
      studentName: data.studentName 
    });
    
    // Format body with line breaks preserved
    const bodyText = getText('admin.newStudent.body', language, {
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      signupDate: data.signupDate
    });
    
    const html = buildCanonicalTemplate({
      bodyContent: `
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-line;">
          ${bodyText}
        </p>
      `,
      ctaText: getText('admin.newStudent.cta', language),
      ctaUrl: 'https://acfe.lovable.app/admin/users'
    });
    
    return { subject, html };
  }
  
  throw new Error(`Unknown admin email type: ${type}`);
}
