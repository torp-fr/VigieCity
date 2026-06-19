import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, FileText, Megaphone, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administration — VigieCity" }] }),
  component: AdminIndex,
});

function AdminIndex() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const { data: role } = useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role, collectivity_id")
        .eq("user_id", userId!)
        .in("role", ["moderator", "admin"]);
      return data ?? [];
    },
  });

  const isMod = (role?.length ?? 0) > 0;

  if (authed === false || (authed && !isMod && role !== undefined)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Droits modérateur requis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n'a pas encore les droits modérateur. Contactez l'administrateur
          de votre commune ou Baptiste à{" "}
          <a href="mailto:admin@vigiecity.fr" className="underline hover:text-foreground">
            admin@vigiecity.fr
          </a>
          .
        </p>
        <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (authed === null || (authed && role === undefined)) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 px-4 pt-5">
      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Modération et gestion des alertes de votre commune.</p>
      </header>

      <nav className="grid gap-3">
        <Link
          to="/admin/signalements"
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:bg-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
            <FileText className="h-5 w-5 text-warning-foreground" />
          </div>
          <div>
            <p className="font-semibold">Signalements</p>
            <p className="text-xs text-muted-foreground">Modérer les signalements en attente</p>
          </div>
        </Link>

        <Link
          to="/admin/alertes"
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:bg-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sos/10">
            <Megaphone className="h-5 w-5 text-sos" />
          </div>
          <div>
            <p className="font-semibold">Créer une alerte</p>
            <p className="text-xs text-muted-foreground">Diffuser un message à votre commune</p>
          </div>
        </Link>
      </nav>
    </div>
  );
}
