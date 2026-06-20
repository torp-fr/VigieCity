// Edge Function : vapid-key
// Expose la clé publique VAPID au frontend (la clé publique n'est pas secrète).
// Aucune auth requise — verify_jwt: false dans config.toml.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const key = Deno.env.get("VAPID_PUBLIC_KEY");

  if (!key) {
    return new Response(
      JSON.stringify({ error: "VAPID_PUBLIC_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  return new Response(
    JSON.stringify({ key }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
});
