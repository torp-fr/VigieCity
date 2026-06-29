/**
 * @deprecated DEAD CODE — NE PAS UTILISER
 *
 * Ce composant référence stripe_subscriptions et l'EF stripe-checkout.
 * VigieCity N'UTILISE PAS STRIPE — les paiements se font via Chorus Pro.
 * Les tables stripe_customers, stripe_subscriptions, stripe_webhook_events
 * et la colonne commune_licenses.stripe_customer_id sont des reliques de
 * l'architecture initiale et ne doivent JAMAIS être utilisées.
 *
 * BUG-015 — documenter les reliques Stripe (audit 2026-06-24)
 */
/**
 * SubscriptionStatus — J5 Subscription management
 * Displays current subscription + portal link
 * Used in: /admin/subscription page
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionData {
  status: string;
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodEnd: string;
  amount: number;
  stripeSubscriptionId: string;
}

interface SubscriptionStatusProps {
  collectivityId: string;
}

export function SubscriptionStatus({ collectivityId }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data
  useEffect(() => {
    async function loadSubscription() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('stripe_subscriptions')
          .select('stripe_subscription_id, status, pricing_tier_id, billing_cycle, amount_eur, current_period_end')
          .eq('collectivity_id', collectivityId)
          .eq('status', 'active')
          .single();

        if (fetchErr) {
          console.error('Subscription fetch error:', fetchErr);
          setLoading(false);
          return;
        }

        if (data) {
          setSubscription({
            status: data.status,
            tier: data.pricing_tier_id,
            billingCycle: data.billing_cycle,
            currentPeriodEnd: new Date(data.current_period_end).toLocaleDateString('fr-FR'),
            amount: data.amount_eur / 100,
            stripeSubscriptionId: data.stripe_subscription_id,
          });
        }
      } catch (err) {
        console.error('Error loading subscription:', err);
        setError('Erreur lors du chargement de l\\'abonnement');
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();
  }, [collectivityId]);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'portal',
            collectivity_id: collectivityId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Portal error:', err);
      setError('Erreur lors de l\\'accès au portail');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center p-8\">
        <div className=\"text-center\">
          <div className=\"h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-blue-600 mx-auto\"></div>
          <p className=\"mt-2 text-gray-600\">Chargement de l'abonnement...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className=\"bg-amber-50 border border-amber-200 rounded-lg p-6\">
        <h3 className=\"font-bold text-amber-900 mb-2\">Pas d'abonnement actif</h3>
        <p className=\"text-sm text-amber-800\">
          Votre commune n'a pas encore d'abonnement. Veuillez sélectionner un plan ci-dessous.
        </p>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-50 border-green-200 text-green-900',
    past_due: 'bg-red-50 border-red-200 text-red-900',
    paused: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    canceled: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  const statusLabel = {
    active: '✓ Actif',
    past_due: '⚠ Paiement en attente',
    paused: '⏸ Suspendu',
    canceled: '✕ Annulé',
  };

  return (
    <div className={`border rounded-lg p-6 ${statusColors[subscription.status as keyof typeof statusColors] || statusColors.active}`}>
      <div className=\"flex items-start justify-between\">
        <div>
          <h3 className=\"font-bold text-lg mb-2\">
            Abonnement {statusLabel[subscription.status as keyof typeof statusLabel]}
          </h3>
          <dl className=\"space-y-2 text-sm\">
            <div className=\"flex justify-between\">
              <dt className=\"opacity-75\">Plan:</dt>
              <dd className=\"font-medium capitalize\">{subscription.tier}</dd>
            </div>
            <div className=\"flex justify-between\">
              <dt className=\"opacity-75\">Cycle:</dt>
              <dd className=\"font-medium\">{subscription.billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'}</dd>
            </div>
            <div className=\"flex justify-between\">
              <dt className=\"opacity-75\">Montant:</dt>
              <dd className=\"font-medium\">{subscription.amount.toFixed(2)}€</dd>
            </div>
            <div className=\"flex justify-between\">
              <dt className=\"opacity-75\">Renouvellement:</dt>
              <dd className=\"font-medium\">{subscription.currentPeriodEnd}</dd>
            </div>
          </dl>
        </div>

        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className=\"px-4 py-2 bg-white border border-current rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition whitespace-nowrap\"
        >
          {portalLoading ? 'Chargement...' : 'Gérer'}
        </button>
      </div>

      {error && (
        <div className=\"mt-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700\">
          {error}
        </div>
      )}
    </div>
  );
}
