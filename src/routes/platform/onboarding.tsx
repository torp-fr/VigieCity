import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  Building2, User, CreditCard, CheckCircle, ChevronRight,
  ChevronLeft, Loader2, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/onboarding")({
  component: PlatformOnboardingPage,
});

const PLANS = [
  { value: "trial",     label: "Trial 30 jours", desc: "Acces complet, sans engagement",   color: "bg-amber-50 border-amber-200"   },
  { value: "nano",      label: "Nano",           desc: "< 1 000 hab. - 49 EUR/mois",       color: "bg-slate-50 border-slate-300"   },
  { value: "micro",     label: "Micro",          desc: "1 001-3 500 hab. - 99 EUR/mois",   color: "bg-blue-50 border-blue-200"     },
  { value: "local",     label: "Local",          desc: "3 501-10 000 hab. - 189 EUR/mois", color: "bg-emerald-50 border-emerald-200"},
  { value: "urbain",    label: "Urbain",         desc: "10 001-50 000 hab. - 490 EUR/mois",color: "bg-violet-50 border-violet-200" },
  { value: "metropole", label: "Metropole",      desc: "> 50 000 hab. - Sur devis",        color: "bg-amber-50 border-amber-200"   },
];

type Step = 1 | 2 | 3 | 4;

function PlatformOnboardingPage() {
  const navigate = useNavigate();
  const [step,   setStep]   = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: commune
  const [communeName,  setCommuneName]  = useState("");
  const [codeInsee,    setCodeInsee]    = useState("");
  const [department,   setDepartment]   = useState("");

  // Step 2: admin
  const [adminEmail,    setAdminEmail]    = useState("");
  const [adminName,     setAdminName]     = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPwd,       setShowPwd]       = useState(false);

  // Step 3: plan
  const [plan, setPlan] = useState<string>("trial");

  // Step 4: résultat
  const [createdData, setCreatedData] = useState<{
    communeId: string;
    communeName: string;
    adminCreated: boolean;
  } | null>(null);

  // ── Création complète ─────────────────────────────────────────────────────
  async function handleCreate() {
    if (!communeName || !adminEmail || !adminPassword) {
      toast.error("Nom de commune, email admin et mot de passe requis");
      return;
    }
    if (adminPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setSaving(true);
    try {
      // 1. Créer la collectivité
      const { data: coll, error: collErr } = await supabase
        .from("collectivities")
        .insert({ name: communeName, insee_code: codeInsee || null })
        .select("id, name")
        .single();
      if (collErr) throw collErr;

      // 2. Créer la licence
      const expiresAt =
        plan === "trial"
          ? addDays(new Date(), 30).toISOString()
          : addDays(new Date(), 365).toISOString();

      const { error: licErr } = await supabase
        .from("commune_licenses")
        .insert({ collectivity_id: coll.id, plan, status: "active", expires_at: expiresAt });
      if (licErr) throw licErr;

      // 3. Appeler la Edge Function pour créer l'utilisateur auth
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "create-commune",
        {
          body: {
            collectivityId: coll.id,
            adminEmail,
            adminName:      adminName || adminEmail.split("@")[0],
            adminPassword,
          },
        },
      );

      let adminCreated = false;
      if (fnErr) {
        // Edge Function non déployée ou erreur : log warning, on continue
        console.warn("Edge Function create-commune :", fnErr.message);
        toast.warning("Commune créée mais l'admin devra être invité manuellement.");
      } else if (fnData?.error) {
        console.warn("create-commune réponse :", fnData.error);
        toast.warning(`Commune créée. Admin non créé : ${fnData.error}`);
      } else {
        adminCreated = true;
      }

      setCreatedData({ communeId: coll.id, communeName: coll.name, adminCreated });
      setStep(4);
      toast.success("Commune créée avec succès !");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { num: 1, label: "Commune",      icon: Building2   },
    { num: 2, label: "Admin",        icon: User        },
    { num: 3, label: "Licence",      icon: CreditCard  },
    { num: 4, label: "Confirmation", icon: CheckCircle },
  ];

  const resetForm = () => {
    setStep(1);
    setCommuneName("");
    setCodeInsee("");
    setDepartment("");
    setAdminEmail("");
    setAdminName("");
    setAdminPassword("");
    setPlan("trial");
    setCreatedData(null);
  };

  return (
    <PlatformShell activePath="/platform/onboarding">
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding commune</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créer un nouvel espace commune en 3 étapes
        </p>
      </div>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-0">
        {steps.map(({ num, label, icon: Icon }, i) => (
          <div key={num} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                  step > num
                    ? "border-blue-600 bg-blue-600 text-white"
                    : step === num
                    ? "border-blue-600 bg-white text-blue-600"
                    : "border-border bg-white text-muted-foreground",
                ].join(" ")}
              >
                {step > num ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <p
                className={`mt-1 text-xs font-medium ${
                  step === num ? "text-blue-600" : "text-muted-foreground"
                }`}
              >
                {label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`-mt-5 mx-1 h-0.5 flex-1 ${
                  step > num + 1 ? "bg-blue-600" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Contenu par étape */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">

        {/* ── Étape 1 : Commune ──────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4 text-blue-600" />
              Informations de la commune
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nom de la commune *
                </label>
                <input
                  type="text"
                  value={communeName}
                  onChange={(e) => setCommuneName(e.target.value)}
                  placeholder="ex: Saint-Germain-en-Laye"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Code INSEE
                  </label>
                  <input
                    type="text"
                    value={codeInsee}
                    onChange={(e) => setCodeInsee(e.target.value)}
                    placeholder="78551"
                    maxLength={6}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Département
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Yvelines (78)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!communeName}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Étape 2 : Admin ────────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-blue-600" />
              Compte administrateur
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Email de l'admin *
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@commune.fr"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nom d'affichage
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Mot de passe initial *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Min. 8 caractères"
                    minLength={8}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPwd ? "Masquer" : "Afficher"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  L'admin recevra ces identifiants et pourra changer son mot de passe depuis son profil.
                </p>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!adminEmail || adminPassword.length < 8}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Étape 3 : Plan ─────────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Plan et licence
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlan(p.value)}
                  className={[
                    "rounded-xl border-2 p-4 text-left transition-all",
                    plan === p.value
                      ? "border-blue-600 bg-blue-50"
                      : `${p.color} hover:opacity-80`,
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                  {plan === p.value && (
                    <CheckCircle className="mt-2 h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Création…
                  </>
                ) : (
                  <>
                    Créer la commune <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Étape 4 : Confirmation ─────────────────────────────────────────── */}
        {step === 4 && createdData && (
          <>
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-lg font-bold">Commune créée !</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {createdData.communeName}
                </span>{" "}
                est maintenant enregistrée.
              </p>
            </div>

            <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin</span>
                <span className="font-medium">{adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compte auth</span>
                <span
                  className={
                    createdData.adminCreated
                      ? "font-medium text-green-600"
                      : "font-medium text-yellow-600"
                  }
                >
                  {createdData.adminCreated ? "✅ Créé" : "⚠️ À inviter manuellement"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-medium">
                  {plan === "trial" ? "30 jours" : "12 mois"}
                </span>
              </div>
            </div>

            {!createdData.adminCreated && (
              <p className="text-center text-xs text-muted-foreground">
                Envoyez une invitation manuelle à{" "}
                <strong>{adminEmail}</strong> depuis Supabase Auth.
              </p>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={resetForm}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Nouvelle commune
              </button>
              <button
                onClick={() => navigate({ to: "/platform/collectivites" })}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Voir les communes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </PlatformShell>
  );
}
