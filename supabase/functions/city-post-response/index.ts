import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { response_text, publish_to_citizen } = body;

    // Extract report ID from path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const reportId = pathParts[pathParts.length - 2];

    if (!reportId || !response_text) {
      return new Response(
        JSON.stringify({ error: "Missing reportId or response_text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get report and verify city admin owns it
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(
        `id, title, municipality_id, citizen_id, citizen_profiles(email, name)`
      )
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user is city admin for this municipality
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("municipality_id", report.municipality_id)
      .single();

    if (!userRole && user.id !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update report with response
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        city_response: response_text,
        status: "responded",
        responded_at: now,
      })
      .eq("id", reportId);

    if (updateError) {
      throw updateError;
    }

    // Send notification email to citizen (if publish_to_citizen is true)
    if (publish_to_citizen && report.citizen_profiles?.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "noreply@vigiecity.fr",
            to: report.citizen_profiles.email,
            subject: `Réponse de la mairie à votre signalement: ${report.title}`,
            html: `
              <h2>Réponse de votre mairie</h2>
              <p>Bonjour ${report.citizen_profiles.name},</p>
              <p>Voici la réponse de votre mairie à votre signalement "${report.title}":</p>
              <blockquote style="border-left: 3px solid #1e3a8a; padding-left: 12px;">
                <p>${response_text}</p>
              </blockquote>
              <p>Merci de votre contribution à l'amélioration de notre commune!</p>
              <p><a href="https://vigiecity.fr/reports/${reportId}">Voir le signalement complet</a></p>
            `,
          }),
        });

        console.log(`Notification email sent to ${report.citizen_profiles.email}`);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the whole request if email fails
      }
    }

    // Also record in moderation_queue (for audit trail)
    await supabase
      .from("moderation_queue")
      .update({
        status: "resolved",
        city_response: response_text,
      })
      .eq("report_id", reportId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Response submitted successfully",
        report_id: reportId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error submitting response:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
