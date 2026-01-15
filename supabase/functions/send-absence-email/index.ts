import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let debugInfo = {};
  try {
    debugInfo.receivedAt = new Date().toISOString();
    debugInfo.method = req.method;
    debugInfo.url = req.url;
    debugInfo.headers = Object.fromEntries(req.headers.entries());
    const { emails, lecturerId } = await req.json();
    debugInfo.body = { emails, lecturerId };

    // Get Gmail credentials from environment variables
    const GMAIL_EMAIL = Deno.env.get('GMAIL_EMAIL');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');
    debugInfo.gmailEmail = GMAIL_EMAIL;
    debugInfo.gmailAppPasswordSet = !!GMAIL_APP_PASSWORD;

    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
      debugInfo.missingGmailCredentials = true;
      console.error('send-absence-email: Missing Gmail credentials', debugInfo);
      throw new Error('Gmail credentials not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD.');
    }

    // Initialize Supabase client for logging
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    debugInfo.supabaseUrl = Deno.env.get('SUPABASE_URL');
    debugInfo.supabaseServiceRoleKeySet = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_EMAIL,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    const sentEmails = [];
    const failedEmails = [];

    // Send each email using Gmail SMTP
    for (const emailData of emails) {
      try {
        await client.send({
          from: GMAIL_EMAIL,
          to: emailData.to,
          subject: emailData.subject,
          content: emailData.html,
          html: emailData.html,
        });

        console.log(`✅ Email sent successfully to ${emailData.to}`);
        debugInfo.lastSentEmail = emailData.to;

        // Logging is now handled by the caller (sendAbsenceAfterLectureEnd.js)
        // which includes the session_id for proper tracking

        sentEmails.push(emailData.to);

      } catch (error) {
        console.error(`❌ Failed to send email to ${emailData.to}:`, error);
        failedEmails.push({
          email: emailData.to,
          error: error.message
        });
        debugInfo.lastFailedEmail = emailData.to;
        debugInfo.lastFailedError = error.message;
      }
    }

    await client.close();
    debugInfo.smtpClosed = true;

    console.log('send-absence-email: Summary', {
      sentCount: sentEmails.length,
      failedCount: failedEmails.length,
      sentEmails,
      failedEmails,
      debugInfo
    });

    return new Response(
      JSON.stringify({
        success: failedEmails.length === 0,
        sentCount: sentEmails.length,
        failedCount: failedEmails.length,
        sentEmails,
        failedEmails,
        debugInfo,
        message: `Sent ${sentEmails.length} of ${emails.length} emails successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    debugInfo.generalError = error.message;
    console.error('send-absence-email: General error', debugInfo);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        sentCount: 0,
        failedCount: 0,
        debugInfo
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
})
