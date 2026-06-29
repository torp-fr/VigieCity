import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface FilterRequest {
  report_id: string;
  title?: string;
  description: string;
  category: string;
  collectivity_id: string;
}

interface FilterResult {
  flagged: boolean;
  confidence_score: number;
  flags: string[];
  reason?: string;
}

// Keyword-based filter rules for freemium moderation
const FILTER_RULES = {
  inappropriate: {
    keywords: ["profanity", "hate", "abuse", "insult"],
    severity: "high",
  },
  spam: {
    keywords: ["viagra", "casino", "lottery", "click here", "buy now"],
    severity: "medium",
  },
  violence: {
    keywords: ["kill", "attack", "harm", "destroy"],
    severity: "high",
  },
  misleading: {
    keywords: ["fake", "hoax", "false claim", "misinformation"],
    severity: "medium",
  },
};

function analyzeContent(
  title: string | undefined,
  description: string
): FilterResult {
  const fullText = `${title || ""} ${description}`.toLowerCase();
  const flags: string[] = [];
  let confidenceScore = 0;

  // Check against filter rules
  for (const [ruleName, rule] of Object.entries(FILTER_RULES)) {
    for (const keyword of rule.keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        flags.push(ruleName);
        confidenceScore +=
          rule.severity === "high" ? 0.3 : rule.severity === "medium" ? 0.2 : 0.1;
      }
    }
  }

  // Cap confidence score at 1.0
  confidenceScore = Math.min(confidenceScore, 1.0);

  // Flag if confidence exceeds threshold
  const flagged = confidenceScore >= 0.4;

  return {
    flagged,
    confidence_score: Number(confidenceScore.toFixed(2)),
    flags: [...new Set(flags)], // Remove duplicates
  };
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json()) as FilterRequest;

    // Validate input
    if (!body.report_id || !body.description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Analyze content
    const filterResult = analyzeContent(body.title, body.description);

    // Create moderation queue entry
    const { error: queueError } = await supabase
      .from("moderation_queue")
      .insert({
        report_id: body.report_id,
        collectivity_id: body.collectivity_id,
        auto_flagged: filterResult.flagged,
        confidence_score: filterResult.confidence_score,
        flags: filterResult.flags,
        status: filterResult.flagged ? "flagged" : "approved",
      });

    if (queueError) {
      console.error("Queue insertion error:", queueError);
      return new Response(
        JSON.stringify({ error: "Failed to create moderation queue entry" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update report moderation status
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        moderation_status: filterResult.flagged ? "flagged" : "pending",
        auto_filtered: true,
      })
      .eq("id", body.report_id);

    if (updateError) {
      console.error("Report update error:", updateError);
    }

    // If flagged, create flag record
    if (filterResult.flagged) {
      await supabase.from("report_flags").insert({
        report_id: body.report_id,
        reason: "inappropriate_content",
        description: `Auto-filtered: ${filterResult.flags.join(", ")} (confidence: ${filterResult.confidence_score})`,
        is_auto_flag: true,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        flagged: filterResult.flagged,
        confidence_score: filterResult.confidence_score,
        flags: filterResult.flags,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in freemium-auto-filter:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
