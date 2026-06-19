import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/users")({
  head: () => ({ meta: [{ title: "Utilisateurs — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformUsersPage,
});

type UserRow = {
  id: string;
  display_name: string | null;
  commune_name: string | null;
  roles: string[];
  created_at: string;
};

const ROLE_COLOR: Record<string, string> = {
  admin:     "bg-sos/10 text-sos border border-sos/30",
  moderator: "bg-primary/10 text-primary border border-primary/30",
  citoyen:   "bg-muted text-muted-foreground",
};

function PlatformUsersPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("id")
        .eq("user_id", uid).eq("role", "admin").is("collectivity_id", null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["platform_users"],
    enabled: isAdmin === true,
    queryFn: async () => {
      // 2 requêtes séparées — pas de FK profiles→user_roles pour join PostgREST
      const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from('profiles')
          .select('id, display_name, created_at, collectivities(name)')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('user_roles').select('user_id, role, collectivity_id'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const rolesByUser: Record<string, string[]> = {};
      for (const r of roles ?? []) rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
        commune_name: (p.collectivities as any)?.name ?? null,
        roles: rolesByUser[p.id] ?? [],
        created_at: p.created_at,
      })) as UserRow[];
    },
  });

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  if (isAdmin === null) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return (
    <div className="px-4 pt-10 text-center">
      <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Accès refusé.</p>
      <button onClick={() => navigate({ to: "/" })} className="mt-4 text-sm text-primary underline">Retour</button>
    </div>
  );

  return (
    <div className="space-y-4 px-4 pt-5">
      <Link to="/platform" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Platform Admin
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? "—"} profil(s) — 200 plus récents.</p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : (
        <ul className="space-y-2">
          {data?.map((u) => (
            <li key={u.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight truncate">
                  {u.display_name ?? <span className="italic text-muted-foreground">Anonyme</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.commune_name ?? "Aucune commune"} · {fmtDate(u.created_at)}
                </p>
                {u.roles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_COLOR[r] ?? ROLE_COLOR.citoyen}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
