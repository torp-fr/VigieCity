/**
 * useServicesMap — Fetch + manage services locations for map display
 * Queries services_locations filtered by category + commune
 */

import { useEffect, useState } from "react";
import { useAppAuth } from "./useAppAuth";

export interface Service {
  id: string;
  category_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

const CATEGORY_MAP: Record<string, ServiceCategory> = {
  health: { id: "health", name: "Santé", emoji: "🏥", color: "#dc2626", description: "Hôpitaux et cliniques" },
  pharmacy: { id: "pharmacy", name: "Pharmacies", emoji: "💊", color: "#2563eb", description: "Pharmacies" },
  defibrillator: { id: "defibrillator", name: "Défibrillateurs", emoji: "⚡", color: "#f97316", description: "DAE" },
  transport: { id: "transport", name: "Transports", emoji: "🚌", color: "#16a34a", description: "Bus, trains" },
};

export function useServicesMap(category?: string) {
  const { supabase, collectivity_id } = useAppAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !collectivity_id) {
      setLoading(false);
      return;
    }

    const fetchServices = async () => {
      try {
        let query = supabase
          .from("services_locations")
          .select("*")
          .eq("collectivity_id", collectivity_id);

        if (category) {
          query = query.eq("category_id", category);
        }

        const { data, error: err } = await query;

        if (err) throw err;

        setServices((data ?? []) as Service[]);
        setError(null);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const { data, error: err } = await supabase
          .from("service_categories")
          .select("*");

        if (err) throw err;

        setCategories((data ?? []) as ServiceCategory[]);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    fetchServices();
    fetchCategories();
  }, [supabase, collectivity_id, category]);

  return {
    services,
    categories,
    loading,
    error,
    categoryMap: CATEGORY_MAP,
  };
}

/**
 * Calculate distance between two coords (in km)
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
