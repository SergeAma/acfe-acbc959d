import { verifyServiceRole, corsHeaders } from '../_shared/auth.ts';

const ADMIN_EMAIL = 'serge@acloudforeveryone.org';

// All email types with their required test data
const EMAIL_TEST_CASES = [
  { type: 'welcome', data: { userName: 'Test User', userEmail: ADMIN_EMAIL } },
  { type: 'magic-link', data: { userEmail: ADMIN_EMAIL, magicLink: 'https://acloudforeveryone.org/auth?token=test123' } },
  { type: 'password-reset', data: { userEmail: ADMIN_EMAIL, magicLink: 'https://acloudforeveryone.org/reset?token=test123' } },
  { type: 'email-confirmation', data: { userEmail: ADMIN_EMAIL, magicLink: 'https://acloudforeveryone.org/confirm?token=test123' } },
  { type: 'payment-confirmation', data: { amount: 5000, currency: 'usd', receiptUrl: 'https://acloudforeveryone.org/receipt/test123', itemName: 'Premium Course Access' } },
  { type: 'subscription-created', data: { userName: 'Test User', planName: 'Monthly Pro', amount: '$19.99/month', nextBillingDate: '2026-03-07' } },
  { type: 'subscription-renewed', data: { userName: 'Test User', planName: 'Monthly Pro', amount: '$19.99/month', nextBillingDate: '2026-03-07' } },
  { type: 'subscription-ending', data: { userName: 'Test User', planName: 'Monthly Pro', endDate: '2026-02-14', renewUrl: 'https://acloudforeveryone.org/pricing' } },
  { type: 'subscription-cancelled', data: { userName: 'Test User', planName: 'Monthly Pro', endDate: '2026-02-14' } },
  { type: 'subscription-paused', data: { userName: 'Test User', planName: 'Monthly Pro', resumeDate: '2026-03-07' } },
  { type: 'subscription-resumed', data: { userName: 'Test User', planName: 'Monthly Pro', nextBillingDate: '2026-03-07' } },
  { type: 'institution-invitation', data: { institutionName: 'Test University', inviterName: 'Dr. Smith', acceptUrl: 'https://acloudforeveryone.org/accept?token=test' } },
  { type: 'institution-approved', data: { institutionName: 'Test University', dashboardUrl: 'https://acloudforeveryone.org/institution/dashboard' } },
  { type: 'institution-request', data: { institutionName: 'Test University', requesterName: 'Jane Doe', requesterEmail: 'jane@test.edu' } },
  { type: 'event-confirmation', data: { eventName: 'Tech Summit 2026', eventDate: '2026-03-15', eventTime: '10:00 AM WAT', eventLocation: 'Lagos, Nigeria', eventUrl: 'https://acloudforeveryone.org/events/tech-summit' } },
  { type: 'event-reminder', data: { eventName: 'Tech Summit 2026', eventDate: '2026-03-15', eventTime: '10:00 AM WAT', eventLocation: 'Lagos, Nigeria', eventUrl: 'https://acloudforeveryone.org/events/tech-summit' } },
  { type: 'mentor-invitation', data: { inviterName: 'ACFE Team', acceptUrl: 'https://acloudforeveryone.org/mentor/accept?token=test' } },
  { type: 'mentor-approved', data: { mentorName: 'Test Mentor', dashboardUrl: 'https://acloudforeveryone.org/dashboard' } },
  { type: 'mentor-rejected', data: { mentorName: 'Test Mentor', reason: 'Application incomplete - please reapply with additional information.' } },
  { type: 'mentor-request-confirmation', data: { mentorName: 'Test Mentor' } },
  { type: 'newsletter-welcome', data: { userEmail: ADMIN_EMAIL } },
  { type: 'admin-new-student', data: { studentName: 'New Student Test', studentEmail: 'newstudent@test.com', signupDate: '2026-02-07 12:00:00' } },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Allow service role key for direct invocation
    await verifyServiceRole(req);
    
    // Parse optional override email
    let targetEmail = ADMIN_EMAIL;
    try {
      const body = await req.json();
      if (body.adminEmail) targetEmail = body.adminEmail;
    } catch { /* use default */ }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const results: Array<{ type: string; success: boolean; error?: string }> = [];
    
    console.log(`[TEST-ALL-EMAILS] Starting to send ${EMAIL_TEST_CASES.length} test emails to ${targetEmail}`);
    
    // Send each email type
    for (const testCase of EMAIL_TEST_CASES) {
      try {
        console.log(`[TEST-ALL-EMAILS] Sending ${testCase.type}...`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: testCase.type,
            to: targetEmail,
            data: testCase.data,
            subjectOverride: `[TEST] ${testCase.type.toUpperCase()}`
          })
        });
        
        if (response.ok) {
          results.push({ type: testCase.type, success: true });
          console.log(`[TEST-ALL-EMAILS] ✓ ${testCase.type} sent successfully`);
        } else {
          const error = await response.text();
          results.push({ type: testCase.type, success: false, error });
          console.error(`[TEST-ALL-EMAILS] ✗ ${testCase.type} failed: ${error}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ type: testCase.type, success: false, error: errorMessage });
        console.error(`[TEST-ALL-EMAILS] ✗ ${testCase.type} error: ${errorMessage}`);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`[TEST-ALL-EMAILS] Complete: ${successCount} succeeded, ${failCount} failed`);
    
    return new Response(
      JSON.stringify({
        success: true,
        summary: `Sent ${successCount}/${EMAIL_TEST_CASES.length} test emails to ${ADMIN_EMAIL}`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TEST-ALL-EMAILS] Error:', errorMessage);
    
    const status = errorMessage.includes('Admin') || errorMessage.includes('authorization') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
