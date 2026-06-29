import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface FetchReportsRequest {
  collectivity_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface ReportData {
  id: string;
  title: string | null;
  description: string;
  category: string;
  severity: string;
  status: string;
  moderation_status: string;
  lat: number | null;
  lng: number | null;
  approximate_address: string | null;
  created_at: string;
  flag_count?: number;
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

    // Parse request
    const url = new URL(req.url);
    const collectivityId = url.searchParams.get("collectivity_id");
    const status = url.searchParams.get("status") || "published";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    if (!collectivityId) {
      return new Response(
        JSON.stringify({ error: "Missing collectivity_id parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch reports for collectivity
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        title,
        description,
        category,
        severity,
        status,
        moderation_status,
        lat,
        lng,
        approximate_address,
        created_at,
        report_flags(count)
      `,
        { count: "exact" }
      )
      .eq("collectivity_id", collectivityId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: reports, error, count } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reports" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform data to include flag counts
    const transformedReports = (reports || []).map((report: any) => ({
      ...report,
      flag_count: report.report_flags?.length || 0,
      report_flags: undefined, // Remove nested data
    }));

    return new Response(
      JSON.stringify({
        success: true,
        reports: transformedReports,
        total: count,
        limit,
        offset,
        has_more: offset + limit < (count || 0),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in city-fetch-reports:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
