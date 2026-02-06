import { buildCanonicalTemplate } from './_base.ts';
import { getText, type Language } from './_translations.ts';

export interface PaymentEmailData {
  amount: number;
  currency: string;
  receiptUrl: string;
  itemName: string;
}

export function buildPaymentEmail(data: PaymentEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('payment.subject', language);
  const formattedAmount = (data.amount / 100).toFixed(2);
  
  const html = buildCanonicalTemplate({
    bodyContent: `
      <p>${getText('payment.success', language)}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${language === 'en' ? 'Item' : 'Article'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${data.itemName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 600;">${language === 'en' ? 'Amount' : 'Montant'}</td>
          <td style="padding: 12px; text-align: right; font-weight: 600; color: #4B5C4B;">${formattedAmount} ${data.currency.toUpperCase()}</td>
        </tr>
      </table>
      <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
    `,
    ctaText: getText('payment.cta', language),
    ctaUrl: data.receiptUrl,
    language
  });
  return { subject, html };
}
