import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/advertiser-dashboard")({
  component: AdvertiserDashboard,
});

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  impressions: number;
  clicks: number;
  spent: number;
  budget: number;
}

function AdvertiserDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCampaigns([]);
        return;
      }
      // Phase 1 — advertising not yet implemented
      setCampaigns([]);
    } catch (err) {
      console.error("loadCampaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de bord annonceur
        </h1>
        <p className="mt-2 text-gray-500">
          La plateforme publicitaire sera disponible prochainement.
        </p>
        {campaigns.length === 0 && !loading && (
          <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-400">Aucune campagne active pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
