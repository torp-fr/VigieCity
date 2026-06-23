import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, MapPin, Shield, Phone, Plus, Trash2, Loader2, LogOut, Save, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
      <AddressSection userId={userId} qc={qc} />
      <VoisinVigilantSection userId={userId} qc={qc} />
      <PushNotificationsSection userId={userId} />
      <EmailNotificationsSection userId={userId} />
      <TrustedContactsSection userId={userId} />
      <SignOutSection navigate={navigate} />
    </div>
  );
}

// ── Adresse ───────────────────────────────────────────────────────────────────
function AddressSection({ userId, qc }: { userId: string; qc: ReturnType<typeof useQueryClient> }) {
  const { data: addr } = useQuery({
    queryKey: ['profile-address', userId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('address, postal_code, city').eq('id', userId).single();
      return data;
    },
  });

  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (addr) {
      setAddress(addr.address ?? '');
      setPostalCode(addr.postal_code ?? '');
      setCity(addr.city ?? '');
    }
  }, [addr]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles')
        .update({ address: address.trim() || null, postal_code: postalCode.trim() || null, city: city.trim() || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile-address', userId] }); toast.success('Adresse mise à jour.'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDirty = address !== (addr?.address ?? '') || postalCode !== (addr?.postal_code ?? '') || city !== (addr?.city ?? '');

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <MapPin className="h-4 w-4" /> Mes coordonnées
      </h2>
      <p className="text-xs text-muted-foreground">
        Utilisées par les services en cas d'intervention ou pour un contact direct.
      </p>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">Adresse</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="12 rue des Lilas"
            className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
        <div className="flex gap-2">
          <div className="w-28">
            <label className="text-xs text-muted-foreground">Code postal</label>
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="66000"
              inputMode="numeric"
              maxLength={5}
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Ville</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Perpignan"
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled={save.isPending || !isDirty}
        onClick={() => save.mutate()}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
      >
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer
      </button>
    </section>
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
      const { data } = await supabase
        .from("profiles")
        .select("is_voisin_vigilant, created_at")
        .eq("id", userId)
        .single();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["vv-stats", userId],
    queryFn: async () => {
      const [reps, sos] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("sos_events").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      return { reports: reps.count ?? 0, sos: sos.count ?? 0 };
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
  const daysSince = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000)
    : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-4">
      {/* Badge visible uniquement quand actif */}
      {active && (
        <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/30">
            <Shield className="h-7 w-7 text-primary" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              ✓
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight text-primary">Voisin Vigilant</p>
            {daysSince !== null && (
              <p className="text-xs text-muted-foreground">
                Membre depuis {daysSince === 0 ? "aujourd'hui" : `${daysSince} jour${daysSince > 1 ? "s" : ""}`}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold leading-none tabular-nums">{stats?.reports ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  signalement{(stats?.reports ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-lg font-bold leading-none tabular-nums text-sos">{stats?.sos ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">SOS</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ligne toggle */}
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Voisin Vigilant</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Participez activement à la sécurité de votre quartier. Votre badge apparaît sur le fil.
          </p>
          {!active && stats && (stats.reports > 0 || stats.sos > 0) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.reports} signalement{stats.reports !== 1 ? "s" : ""} · {stats.sos} SOS
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggle.mutate(!active)}
          disabled={toggle.isPending}
          className={`relative h-7 w-12 overflow-hidden rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
          aria-checked={active}
          role="switch"
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>
    </section>
  );
}

// ── Push Notifications ────────────────────────────────────────────────────────
function PushNotificationsSection({ userId }: { userId: string }) {
  const { status, loading, subscribe, unsubscribe, isSupported } = usePushNotifications(userId);

  const isSubscribed = status === "granted";
  const isDenied     = status === "denied";
  const isDefault    = status === "default";

  if (!isSupported) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Bell className="h-4 w-4" /> Notifications push
      </h2>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isSubscribed ? "bg-primary/10" : "bg-muted"}`}>
          {isSubscribed
            ? <Bell className="h-5 w-5 text-primary" />
            : <BellOff className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">
            {isSubscribed ? "Activées" : isDenied ? "Bloquées" : "Désactivées"}
            {loading && <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isDenied   && "Débloquées dans les paramètres de votre navigateur."}
            {isSubscribed && "Vous recevrez les mises à jour de vos signalements."}
            {isDefault  && "Recevez les mises à jour de vos signalements en temps réel."}
          </p>
        </div>
        {!isDenied && (
          <button
            type="button"
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            className={`relative h-7 w-12 overflow-hidden rounded-full transition-colors disabled:opacity-50 ${isSubscribed ? "bg-primary" : "bg-muted"}`}
            role="switch"
            aria-checked={isSubscribed}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isSubscribed ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        )}
      </div>
    </section>
  );
}

// ── Email notifications (opt-in, désactivé par défaut) ────────────────────────
function EmailNotificationsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("email_notif_reports")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const emailEnabled = prefs?.email_notif_reports ?? false;

  const toggleEmail = useMutation({
    mutationFn: async (value: boolean) => {
      await supabase
        .from("user_preferences")
        .upsert({ user_id: userId, email_notif_reports: value }, { onConflict: "user_id" });
    },
    onSuccess: (_data, value) => {
      qc.setQueryData(["user-preferences", userId], { email_notif_reports: value });
      toast.success(value ? "Notifications email activées" : "Notifications email désactivées");
    },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Bell className="h-4 w-4" /> Notifications email
      </h2>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${emailEnabled ? "bg-primary/10" : "bg-muted"}`}>
          {emailEnabled
            ? <Bell className="h-5 w-5 text-primary" />
            : <BellOff className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{emailEnabled ? "Activées" : "Désactivées"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {emailEnabled
              ? "Vous recevrez un email à chaque mise à jour de vos signalements."
              : "Recevez un email quand la mairie traite vos signalements. (opt-in)"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleEmail.mutate(!emailEnabled)}
          disabled={isLoading || toggleEmail.isPending}
          className={`relative h-7 w-12 overflow-hidden rounded-full transition-colors disabled:opacity-50 ${emailEnabled ? "bg-primary" : "bg-muted"}`}
          role="switch"
          aria-checked={emailEnabled}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${emailEnabled ? "translate-x-5" : "translate-x-0"}`}
          />
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
            