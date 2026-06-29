import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.15.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

// Tier → Stripe Price ID mapping
// Format: tier_index_billing (0=Hameau, 1=Village, ..., 5=Métropole)
const STRIPE_PRICE_IDS: Record<string, string> = {
  "0_monthly": "price_hameau_monthly",    // 19€
  "0_annual": "price_hameau_annual",      // 190€
  "1_monthly": "price_village_monthly",   // 49€
  "1_annual": "price_village_annual",     // 490€
  "2_monthly": "price_bourg_monthly",     // 99€
  "2_annual": "price_bourg_annual",       // 990€
  "3_monthly": "price_bastide_monthly",   // 189€
  "3_annual": "price_bastide_annual",     // 1890€
  "4_monthly": "price_cite_monthly",      // 390€
  "4_annual": "price_cite_annual",        // 3900€
  "5_monthly": "price_metropole_monthly", // 590€
  "5_annual": "price_metropole_annual",   // 5900€
};

interface CheckoutRequest {
  municipality_id: string;
  tier_index: number; // 0-5
  billing_cycle: "monthly" | "annual";
  success_url?: string;
  cancel_url?: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const { municipality_id, tier_index, billing_cycle, success_url, cancel_url } = body;

    // Validate input
    if (!municipality_id || tier_index === undefined || !billing_cycle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (tier_index < 0 || tier_index > 5) {
      return new Response(
        JSON.stringify({ error: "Invalid tier index" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Stripe Price ID
    const priceKey = `${tier_index}_${billing_cycle}`;
    const priceId = STRIPE_PRICE_IDS[priceKey];

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Price not found for tier" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: success_url || "https://vigiecity.fr/platform/subscription/success",
      cancel_url: cancel_url || "https://vigiecity.fr/platform/subscription/cancel",
      metadata: {
        municipality_id,
        tier_index: tier_index.toString(),
        billing_cycle,
      },
      customer_email_collection: "required",
    });

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Stripe error:", error);
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
