import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emails, lecturerId, sessionId } = await req.json();

    if (!emails?.length || !sessionId) {
      throw new Error("Missing emails or sessionId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get("GMAIL_EMAIL")!,
          password: Deno.env.get("GMAIL_APP_PASSWORD")!,
        },
      },
    });

    const results = [];

    for (const email of emails) {
      // ---------------------------
      // Idempotency check
      // ---------------------------
      const { data: existing } = await supabase
        .from("absence_emails")
        .select("id")
        .eq("student_id", email.studentId)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existing) {
        results.push({ email: email.to, status: "skipped" });
        continue;
      }

      // ---------------------------
      // Insert pending
      // ---------------------------
      const { data: log } = await supabase
        .from("absence_emails")
        .insert({
          student_id: email.studentId,
          lecturer_id: lecturerId,
          session_id: sessionId,
          status: "pending",
        })
        .select()
        .single();

      try {
        await client.send({
          from: Deno.env.get("GMAIL_EMAIL")!,
          to: email.to,
          subject: email.subject,
          html: email.html,
        });

        await supabase
          .from("absence_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", log.id);

        results.push({ email: email.to, status: "sent" });
      } catch (err) {
        await supabase
          .from("absence_emails")
          .update({ status: "failed" })
          .eq("id", log.id);

        results.push({ email: email.to, status: "failed" });
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: corsHeaders, status: 400 }
    );
  }
});
