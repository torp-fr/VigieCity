/**
 * useAppAuth — user ID + profil mis en cache pour toutes les pages citoyennes
 *
 * Remplace le pattern répétitif sur chaque page :
 *   const [userId, setUserId] = useState<string | null>(null);
 *   useEffect(() => { supabase.auth.getUser().then(...) }, []);
 *
 * Avec ce hook, l'appel auth se fait UNE seule fois (staleTime 5 min).
 * Les navigations entre /accueil, /signaler, /mes-signalements, etc.
 * sont instantanées — plus de waterfall auth à chaque page.
 *
 * Usage :
 *   const { userId, collectivityId, isLoading } = useAppAuth();
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AppUser = {
  userId: string;
  collectivityId: string | null;
  role: string | null;
  displayName: string | null;
};

async function fetchAppUser(): Promise<AppUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("collectivity_id, role, display_name")
    .eq("id", user.id)
    .single();

  return {
    userId:         user.id,
    collectivityId: profile?.collectivity_id ?? null,
    role:           profile?.role            ?? null,
    displayName:    profile?.display_name    ?? null,
  };
}

export function useAppAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-auth"],
    queryFn: fetchAppUser,
    // Cache 5 minutes — pas de re-fetch entre pages
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
    // Pas de retry si l'utilisateur n'est pas connecté
    retry: false,
  });

  return {
    userId:         data?.userId         ?? null,
    collectivityId: data?.collectivityId ?? null,
    role:           data?.role           ?? null,
    displayName:    data?.displayName    ?? null,
    isLoading,
    isAuthenticated: !!data?.userId,
  };
}
