import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Constantes ────────────────────────────────────────────────────────────────
const HOLD_DURATION   = 2000;  // ms pour déclencher le SOS
const SOS_QUOTA       = 2;     // nb d'envois max par session
const SIZE            = 160;   // px — taille du conteneur SVG
const RADIUS          = 70;    // px — rayon du cercle de progression
const STROKE_WIDTH    = 7;
const CIRCUMFERENCE   = 2 * Math.PI * RADIUS; // ≈ 439.82
const CX              = SIZE / 2;
const CY              = SIZE / 2;
const TICK_MS         = 40;    // fréquence de mise à jour de la barre (ms)

// ─── Composant ─────────────────────────────────────────────────────────────────
export default function SosButton() {
  const [open, setOpen]               = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [userId, setUserId]           = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [sosCount, setSosCount]       = useState(0);

  const holdTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef     = useRef<number>(0);

  // Charger le profil utilisateur
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", uid)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
      }
    });
  }, []);

  // ── Gestion du hold ───────────────────────────────────────────────────────────
  const cancelHold = () => {
    if (holdTimerRef.current)     clearTimeout(holdTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    holdTimerRef.current     = null;
    progressIntervalRef.current = null;
    setHoldProgress(0);
  };

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    if (sosCount >= SOS_QUOTA) return;

    holdStartRef.current = performance.now();

    // Progression de l'anneau
    progressIntervalRef.current = setInterval(() => {
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(pct);
    }, TICK_MS);

    // Déclenchement final
    holdTimerRef.current = setTimeout(() => {
      clearInterval(progressIntervalRef.current!);
      setHoldProgress(0);
      navigator.vibrate?.([100, 50, 100]);
      setSosCount((n) => n + 1);
      handleSosSent();
    }, HOLD_DURATION);
  };

  const handleSosSent = async () => {
    if (!userId || !collectivityId) {
      setOpen(true);
      return;
    }
    try {
      await supabase.from("reports").insert({
        title:       "Alerte SOS",
        description: "Alerte déclenchée via le bouton SOS.",
        category:    "urgence",
        severity:    "critical",
        collectivity_id: collectivityId,
        user_id:     userId,
        is_anonymous: false,
        lat:         null,
        lng:         null,
      });
    } catch (_) {/* silence */}
    setOpen(true);
  };

  // Empêcher le menu contextuel sur l'appui long mobile
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Bouton SOS circulaire + anneau SVG ──────────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative select-none"
          style={{ width: SIZE, height: SIZE }}
          onContextMenu={handleContextMenu}
        >
          {/* Anneau de progression SVG */}
          <svg
            width={SIZE}
            height={SIZE}
            className="absolute inset-0"
            style={{ transform: "rotate(-90deg)" }}
            aria-hidden="true"
          >
            {/* Piste (track) */}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="rgba(220,38,38,0.18)"
              strokeWidth={STROKE_WIDTH}
            />
            {/* Arc de progression */}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="#dc2626"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={
                CIRCUMFERENCE - (holdProgress / 100) * CIRCUMFERENCE
              }
              style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear` }}
            />
          </svg>

          {/* Bouton circulaire */}
          <button
            className={[
              "sos-pulse",
              "absolute inset-[14px] z-10",
              "flex flex-col items-center justify-center gap-1",
              "rounded-full bg-sos shadow-lg",
              "select-none touch-none",
              sosCount >= SOS_QUOTA
                ? "opacity-50 cursor-not-allowed"
                : "active:scale-95 transition-transform",
            ].join(" ")}
            onPointerDown={sosCount < SOS_QUOTA ? startHold : undefined}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            aria-label="Bouton SOS — maintenez 2 secondes"
            disabled={sosCount >= SOS_QUOTA}
          >
            <AlertTriangle className="h-8 w-8 text-white" strokeWidth={2.5} />
            <span className="text-[11px] font-extrabold tracking-widest text-white uppercase">
              SOS
            </span>
          </button>
        </div>

        {/* Légende */}
        <p className="text-xs text-muted-foreground">
          {sosCount >= SOS_QUOTA
            ? "Quota SOS atteint pour cette session"
            : "Maintenez 2 secondes pour déclencher"}
        </p>
      </div>

      {/* ── Modal d'urgence ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sos/10">
                  <AlertTriangle className="h-4 w-4 text-sos" />
                </div>
                <h2 className="text-lg font-bold">Urgence</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-5 text-sm text-muted-foreground">
              Votre alerte a été envoyée. Appelez les secours si nécessaire :
            </p>

            {/* Boutons d'appel */}
            <div className="space-y-3">
              <a
                href="tel:112"
                className="flex items-center gap-4 rounded-2xl bg-sos px-5 py-4 text-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none">112</div>
                  <div className="text-xs text-white/80 mt-0.5">Numéro d'urgence européen</div>
                </div>
              </a>

              <a
                href="tel:17"
                className="flex items-center gap-4 rounded-2xl bg-muted px-5 py-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none">17</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Police / Gendarmerie</div>
                </div>
              </a>

              <a
                href="tel:18"
                className="flex items-center gap-4 rounded-2xl bg-muted px-5 py-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <Phone className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none">18</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pompiers</div>
                </div>
              </a>
            </div>

            {/* Lien signalement */}
            <Link
              to="/signaler"
              onClick={() => setOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-medium"
            >
              Signaler un incident
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
