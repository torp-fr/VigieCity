import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const client = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Verify JWT and get user ID
    const token = authHeader.replace("Bearer ", "");
    const { data, error: jwtError } = await client.auth.getUser(token);

    if (jwtError || !data?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      });
    }

    const userId = data.user.id;

    // Get municipality where user is admin
    const { data: municipalities, error: municError } = await client
      .from("municipalities")
      .select("id, name")
      .eq("admin_user_id", userId)
      .eq("subscription_status", "active");

    if (municError) {
      return new Response(JSON.stringify({ error: municError.message }), {
        status: 500,
      });
    }

    if (!municipalities || municipalities.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 403 }
      );
    }

    const municipalityIds = municipalities.map((m) => m.id);

    // Fetch all reports for this city
    // Transition: from super-admin ownership to city ownership
    const { data: reports, error: reportsError } = await client
      .from("reports")
      .select(
        `
        id,
        content,
        category,
        latitude,
        longitude,
        status,
        auto_filter_score,
        citizen_flags_count,
        visible_to_public,
        created_at,
        city_response,
        city_response_date,
        citizen_id
      `
      )
      .in("municipality_id", municipalityIds)
      .order("created_at", { ascending: false });

    if (reportsError) {
      return new Response(JSON.stringify({ error: reportsError.message }), {
        status: 500,
      });
    }

    // Categorize reports for city dashboard
    const pending = reports.filter((r) => r.status === "pending_review");
    const resolved = reports.filter((r) => r.status === "public" && r.city_response);
    const escalated = reports.filter((r) => r.status === "escalated");

    return new Response(
      JSON.stringify({
        success: true,
        municipality_count: municipalities.length,
        municipalities,
        reports: {
          total: reports.length,
          pending_response: pending.length,
          resolved: resolved.length,
          escalated: escalated.length,
          data: {
            pending,
            resolved,
            escalated,
          },
        },
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
