import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.15.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature || "", webhookSecret);
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const municipalityId = subscription.metadata?.municipality_id;
        const tierIndex = subscription.metadata?.tier_index;

        if (!municipalityId) {
          console.error("Missing municipality_id in subscription metadata");
          break;
        }

        // Calculate expiry date
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Update municipality subscription
        const { error } = await supabase
          .from("municipalities")
          .update({
            subscription_status: subscription.status === "active" ? "active" : "pending",
            subscription_stripe_id: subscription.id,
            subscription_expires_at: currentPeriodEnd.toISOString(),
            subscription_tier: parseInt(tierIndex) || 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", municipalityId);

        if (error) {
          console.error("Error updating municipality:", error);
        } else {
          console.log(`Updated municipality ${municipalityId} to ${subscription.status}`);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const municipalityId = subscription.metadata?.municipality_id;

        if (!municipalityId) {
          console.error("Missing municipality_id in subscription metadata");
          break;
        }

        // Deactivate subscription
        const { error } = await supabase
          .from("municipalities")
          .update({
            subscription_status: "cancelled",
            subscription_expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", municipalityId);

        if (error) {
          console.error("Error updating municipality:", error);
        } else {
          console.log(`Cancelled subscription for municipality ${municipalityId}`);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          console.log(`Payment succeeded for subscription ${subscriptionId}`);
          // Additional logic: send confirmation email, etc.
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          console.log(`Payment failed for subscription ${subscriptionId}`);
          // Additional logic: send retry notification, etc.
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
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
