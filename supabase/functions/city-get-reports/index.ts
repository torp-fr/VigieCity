import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method !== "GET") {
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

    // Create Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get user ID from token
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get municipality_id from query
    const url = new URL(req.url);
    const municipalityId = url.searchParams.get("municipality_id");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!municipalityId) {
      return new Response(JSON.stringify({ error: "Missing municipality_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user is city admin for this municipality or super-admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("municipality_id", municipalityId)
      .single();

    const { data: superAdminRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!userRoles && !superAdminRoles) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build query
    let query = supabase
      .from("reports")
      .select(
        `id, title, description, category, status, auto_filter_score, city_response, created_at, responded_at,
         citizen_profiles(name)`
      )
      .eq("municipality_id", municipalityId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: reports, error } = await query;

    if (error) {
      throw error;
    }

    // Format response
    const formattedReports = reports?.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      auto_filter_score: r.auto_filter_score || 0,
      city_response: r.city_response,
      created_at: r.created_at,
      responded_at: r.responded_at,
      citizen_name: r.citizen_profiles?.name || "Citoyen anonyme",
    })) || [];

    return new Response(
      JSON.stringify({
        reports: formattedReports,
        count: formattedReports.length,
        offset,
        limit,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching reports:", error);
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
