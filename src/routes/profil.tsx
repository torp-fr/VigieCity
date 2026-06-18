import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, MapPin, Shield, Phone, Plus, Trash2, Loader2, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [{ title: "Mon profil — VigieCity" }],
  }),
  component: ProfilPage,
});

type TrustedContact = { id: string; name: string; phone: string };
type Collectivity = { id: string; name: string; postal_code: string | null };

function ProfilPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
  }, []);

  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="text-xl font-semibold">Mon profil</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour accéder à votre profil.</p>
        <Link to="/auth" className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
          Me connecter
        </Link>
      </div>
    );
  }

  if (!userId) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 px-4 pt-5 pb-8">
      <header>
        <h1 className="text-2xl font-bold">Mon profil</h1>
      </header>
      <IdentitySection userId={userId} email={email} qc={qc} />
      <CommuneSection userId={userId} qc={qc} navigate={navigate} />
      <VoisinVigilantSection userId={userId} qc={qc} />
      <TrustedContactsSection userId={userId} />
      <SignOutSection navigate={navigate} />
    </div>
  );
}

// ── Identity ──────────────────────────────────────────────────────────────────
function IdentitySection({ userId, email, qc }: { userId: string; email: string | null; qc: ReturnType<typeof useQueryClient> }) {
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
      return data;
    },
  });
  const [name, setName] = useState("");
  useEffect(() => { if (profile?.display_name) setName(profile.display_name); }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile", userId] }); toast.success("Nom mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <User className="h-4 w-4" /> Identité
      </h2>
      <div>
        <label className="text-xs text-muted-foreground">Nom affiché</label>
        <div className="mt-1 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre prénom ou pseudonyme"
            className="flex-1 rounded-xl border border-input bg-background p-3 text-sm outline-none ring-ring focus:ring-2"
          />
          <button
            type="button"
            disabled={save.isPending || name.trim() === (profile?.display_name ?? "")}
            onClick={() => save.mutate()}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Email</label>
        <p className="mt-1 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{email ?? "—"}</p>
      </div>
    </section>
  );
}

// ── Commune ───────────────────────────────────────────────────────────────────
function CommuneSection({ userId, qc, navigate }: { userId: string; qc: ReturnType<typeof useQueryClient>; navigate: ReturnType<typeof useNavigate> }) {
  const { data: profile } = useQuery({
    queryKey: ["profile-commune", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("collectivity_id, collectivities(id, name, postal_code)")
        .eq("id", userId)
        .single();
      return data;
    },
  });

  const commune = (profile?.collectivities as Collectivity | null);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <MapPin className="h-4 w-4" /> Commune
      </h2>
      {commune ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{commune.name}</p>
            {commune.postal_code && <p className="text-xs text-muted-foreground">{commune.postal_code}</p>}
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding" })}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Changer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding" })}
          className="w-full rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted"
        >
          Choisir une commune →
        </button>
      )}
    </section>
  );
}

// ── Voisin Vigilant ────────────────────────────────────────────────────────────
function VoisinVigilantSection({ userId, qc }: { userId: string; qc: ReturnType<typeof useQueryClient> }) {
  const { data: profile } = useQuery({
    queryKey: ["profile-vv", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("is_voisin_vigilant").eq("id", userId).single();
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase.from("profiles").update({ is_voisin_vigilant: val }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, val) => {
      qc.invalidateQueries({ queryKey: ["profile-vv", userId] });
      toast.success(val ? "Vous êtes maintenant Voisin Vigilant." : "Programme désactivé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = profile?.is_voisin_vigilant ?? false;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Voisin Vigilant</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Participez activement à la sécurité de votre quartier. Votre badge apparaît sur le fil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle.mutate(!active)}
          disabled={toggle.isPending}
          className={`relative h-7 w-12 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
          aria-checked={active}
          role="switch"
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </section>
  );
}

// ── Trusted Contacts ──────────────────────────────────────────────────────────
function TrustedContactsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["trusted-contacts", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trusted_contacts")
        .select("id, name, phone")
        .eq("user_id", userId)
        .order("created_at");
      return (data ?? []) as TrustedContact[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!newName.trim() || !newPhone.trim()) throw new Error("Nom et téléphone requis.");
      const { error } = await supabase.from("trusted_contacts").insert({
        user_id: userId,
        name: newName.trim(),
        phone: newPhone.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trusted-contacts", userId] });
      setNewName(""); setNewPhone(""); setShowAdd(false);
      toast.success("Contact ajouté.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trusted_contacts").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trusted-contacts", userId] });
      toast.success("Contact supprimé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Phone className="h-4 w-4" /> Contacts de confiance
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex : Maman)"
            className="w-full rounded-lg border border-input bg-background p-2 text-sm outline-none ring-ring focus:ring-2"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Téléphone (ex : 06 12 34 56 78)"
            type="tel"
            className="w-full rounded-lg border border-input bg-background p-2 text-sm outline-none ring-ring focus:ring-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => add.mutate()}
              disabled={add.isPending}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-3 py-2 text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {contacts?.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">Aucun contact de confiance enregistré.</p>
      )}

      <ul className="space-y-2">
        {contacts?.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="rounded-lg bg-primary/10 p-2 text-primary">
                <Phone className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => remove.mutate(c.id)}
                disabled={remove.isPending}
                className="rounded-lg bg-sos/10 p-2 text-sos disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
function SignOutSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => navigate({ to: "/" }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <button
      type="button"
      onClick={() => signOut.mutate()}
      disabled={signOut.isPending}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sos/30 bg-sos/5 p-4 text-sm font-medium text-sos disabled:opacity-50"
    >
      {signOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Se déconnecter
    </button>
  );
}
