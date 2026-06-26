import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const client = createClient(supabaseUrl, supabaseKey);

// Spam/profanity detection (basic implementation)
function calculateAutoFilterScore(content: string): number {
  let score = 0.0;

  // Check for common spam patterns
  const spamPatterns = [
    /viagra|cialis|casino|lottery/gi,
    /click here|buy now|limited offer/gi,
    /\b(http|https):\/\/[^\s]+/g, // URLs
  ];

  spamPatterns.forEach((pattern) => {
    if (pattern.test(content)) score += 0.2;
  });

  // Check for ALL CAPS (potential aggression)
  if (content === content.toUpperCase() && content.length > 10) {
    score += 0.15;
  }

  // Check for excessive punctuation
  if ((content.match(/[!?]{3,}/g) || []).length > 0) {
    score += 0.1;
  }

  // Common profanity check (very basic)
  const profanityList = [
    "putain",
    "connard",
    "salaud",
    "imbécile",
    "idiot",
  ];
  profanityList.forEach((word) => {
    if (
      new RegExp(`\\b${word}\\b`, "gi").test(content) && score < 0.7
    ) {
      score += 0.25;
    }
  });

  return Math.min(score, 1.0); // cap at 1.0
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { report_id, content, municipality_id } = await req.json();

    if (!report_id || !content) {
      return new Response(
        JSON.stringify({ error: "Missing report_id or content" }),
        { status: 400 }
      );
    }

    // Calculate auto-filter score
    const autoFilterScore = calculateAutoFilterScore(content);
    const shouldFlag = autoFilterScore > 0.7;

    // Update report with auto-filter score
    const { error: updateError } = await client
      .from("reports")
      .update({
        auto_filter_score: autoFilterScore,
        visible_to_public: !shouldFlag, // only visible if passes filter
        status: shouldFlag ? "pending_review" : "public",
      })
      .eq("id", report_id);

    if (updateError) {
      console.error("Error updating report:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
      });
    }

    // If flagged, add to moderation queue
    if (shouldFlag) {
      const { error: queueError } = await client
        .from("moderation_queue")
        .insert({
          report_id,
          status: "pending",
          reason: `Auto-flagged (score: ${autoFilterScore.toFixed(2)})`,
        });

      if (queueError) {
        console.error("Error adding to moderation queue:", queueError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id,
        auto_filter_score: autoFilterScore,
        visible_to_public: !shouldFlag,
        status: shouldFlag ? "pending_review" : "public",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
