import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Building2, User, CreditCard, CheckCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDays } from "date-fns";

export const Route = createFileRoute("/platform/onboarding")({
  component: PlatformOnboardingPage,
});

const PLANS = [
  { value: "trial", label: "Trial 30 jours", desc: "Accès complet, sans engagement", color: "bg-amber-50 border-amber-200" },
  { value: "starter", label: "Starter", desc: "Jusqu'à 5 000 habitants", color: "bg-blue-50 border-blue-200" },
  { value: "pro", label: "Pro", desc: "Communes jusqu'à 50 000 hab.", color: "bg-violet-50 border-violet-200" },
  { value: "enterprise", label: "Enterprise", desc: "Communes >50 000 hab. + SLA", color: "bg-gray-50 border-gray-200" },
];

type Step = 1 | 2 | 3 | 4;

function PlatformOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: commune info
  const [communeName, setCommuneName] = useState("");
  const [codeInsee, setCodeInsee] = useState("");
  const [department, setDepartment] = useState("");

  // Step 2: admin account
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");

  // Step 3: plan
  const [plan, setPlan] = useState<string>("trial");

  // Step 4: result
  const [createdData, setCreatedData] = useState<{ communeId: string; communeName: string } | null>(null);

  async function handleCreate() {
    if (!communeName || !adminEmail) {
      toast.error("Nom de commune et email admin requis");
      return;
    }
    setSaving(true);
    try {
      // 1. Create collectivity
      const { data: coll, error: collErr } = await supabase
        .from("collectivities")
        .insert({ name: communeName, insee_code: codeInsee || null })
        .select("id, name")
        .single();
      if (collErr) throw collErr;

      // 2. Create commune_license
      const expiresAt = plan === "trial"
        ? addDays(new Date(), 30).toISOString()
        : addDays(new Date(), 365).toISOString();

      const { error: licErr } = await supabase.from("commune_licenses").insert({
        collectivity_id: coll.id,
        plan,
        status: "active",
        expires_at: expiresAt,
      });
      if (licErr) throw licErr;

      // 3. Invite admin user (create profile placeholder or send invite)
      // We can't create an auth user from client — we'll note the email for manual invite
      // In a real flow this would go through a service_role edge function

      setCreatedData({ communeId: coll.id, communeName: coll.name });
      setStep(4);
      toast.success("Commune créée avec succès !");
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { num: 1, label: "Commune", icon: Building2 },
    { num: 2, label: "Admin", icon: User },
    { num: 3, label: "Licence", icon: CreditCard },
    { num: 4, label: "Confirmation", icon: CheckCircle },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding commune</h1>
        <p className="text-sm text-muted-foreground mt-1">Créer un nouvel espace commune en 3 étapes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map(({ num, label, icon: Icon }, i) => (
          <div key={num} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1 ${i < steps.length - 1 ? "" : ""}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                step > num ? "border-blue-600 bg-blue-600 text-white" :
                step === num ? "border-blue-600 bg-white text-blue-600" :
                "border-border bg-white text-muted-foreground"
              }`}>
                {step > num ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <p className={`text-xs mt-1 font-medium ${step === num ? "text-blue-600" : "text-muted-foreground"}`}>{label}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 -mt-5 mx-1 ${step > num + 1 ? "bg-blue-600" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">

        {/* Step 1: Commune info */}
        {step === 1 && (
          <>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" /> Informations de la commune
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nom de la commune *</label>
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
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Code INSEE</label>
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
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Département</label>
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
                className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Admin account */}
        {step === 2 && (
          <>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Compte administrateur
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email de l'admin *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@commune.fr"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nom d'affichage</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                L'invitation sera envoyée manuellement. L'admin devra s'inscrire et sera associé à la commune lors de son premier accès.
              </p>
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
                disabled={!adminEmail}
                className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Plan & licence */}
        {step === 3 && (
          <>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" /> Plan et licence
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlan(p.value)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    plan === p.value
                      ? "border-blue-600 bg-blue-50"
                      : `${p.color} hover:opacity-80`
                  }`}
                >
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  {plan === p.value && (
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-2" />
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
                className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Création…</> : <>Créer la commune <ChevronRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && createdData && (
          <>
            <div className="text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-lg font-bold">Commune créée !</h2>
              <p className="text-muted-foreground text-sm mt-1">
                <span className="font-semibold text-foreground">{createdData.communeName}</span> est maintenant enregistrée.
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin (à inviter)</span>
                <span className="font-medium">{adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-medium">{plan === "trial" ? "30 jours" : "12 mois"}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Pensez à envoyer manuellement l'invitation à <strong>{adminEmail}</strong>.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => { setStep(1); setCommuneName(""); setCodeInsee(""); setDepartment(""); setAdminEmail(""); setAdminName(""); setPlan("trial"); setCreatedData(null); }}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Nouvelle commune
              </button>
              <button
                onClick={() => navigate({ to: "/platform/communes" })}
                className="rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700"
              >
                Voir les communes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
