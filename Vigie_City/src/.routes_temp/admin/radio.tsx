import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Radio, Plus, Pencil, Trash2, X, Save, Play, Pause, Loader2,
  ToggleLeft, ToggleRight, GripVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/radio")({
  component: AdminRadioPage,
});

type Stream = {
  id: string;
  name: string;
  stream_url: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  collectivity_id: string | null;
};

type FormData = {
  name: string;
  stream_url: string;
  logo_url: string;
  is_active: boolean;
  sort_order: number;
};

const BLANK: FormData = {
  name:       "",
  stream_url: "",
  logo_url:   "",
  is_active:  true,
  sort_order: 1,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
function AdminRadioPage() {
  const qc = useQueryClient();
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormData>(BLANK);
  const [deleteTarget, setDeleteTarget] = useState<Stream | null>(null);
  const [testUrl, setTestUrl]       = useState<string | null>(null);
  const [testAudio, setTestAudio]   = useState<HTMLAudioElement | null>(null);
  const [testPlaying, setTestPlaying] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", data.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
    return () => { testAudio?.pause(); };
  }, []);

  // ── Radios locales de la commune ──────────────────────────────────────────
  const { data: local = [], isLoading } = useQuery({
    queryKey: ["admin-radio-local", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_streams")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .order("sort_order");
      if (error) throw error;
      return data as Stream[];
    },
  });

  // ── Radios nationales (lecture seule) ─────────────────────────────────────
  const { data: national = [] } = useQuery({
    queryKey: ["radio-national"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_streams")
        .select("*")
        .is("collectivity_id", null)
        .order("sort_order");
      if (error) throw error;
      return data as Stream[];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async (f: FormData) => {
      const payload = {
        name:            f.name.trim(),
        stream_url:      f.stream_url.trim(),
        logo_url:        f.logo_url.trim() || null,
        is_active:       f.is_active,
        sort_order:      Number(f.sort_order),
        collectivity_id: collectivityId!,
      };
      if (editId) {
        const { error } = await supabase.from("radio_streams").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("radio_streams").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-radio-local", collectivityId] });
      toast.success(editId ? "Radio modifiée" : "Radio ajoutée");
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("radio_streams").update({ is_active: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-radio-local", collectivityId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("radio_streams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-radio-local", collectivityId] });
      toast.success("Radio supprimée");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Test audio ────────────────────────────────────────────────────────────
  const handleTest = (url: string) => {
    if (testAudio && testUrl === url && testPlaying) {
      testAudio.pause();
      setTestPlaying(false);
      return;
    }
    testAudio?.pause();
    const audio = new Audio(url);
    audio.onplay = () => setTestPlaying(true);
    audio.onpause = () => setTestPlaying(false);
    audio.onerror = () => { toast.error("Flux indisponible"); setTestPlaying(false); };
    setTestAudio(audio);
    setTestUrl(url);
    audio.play().catch(() => toast.error("Lecture impossible"));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditId(null);
    setForm({ ...BLANK, sort_order: (local.length + 1) });
    setShowForm(true);
  };
  const openEdit = (s: Stream) => {
    setEditId(s.id);
    setForm({ name: s.name, stream_url: s.stream_url, logo_url: s.logo_url ?? "", is_active: s.is_active, sort_order: s.sort_order });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };
  const set = (k: keyof FormData, v: string | boolean | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminShell activePath="/admin/radio">
    <div className="space-y-8 px-4 py-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Radio locale</h1>
            <p className="text-xs text-muted-foreground">Flux disponibles pour vos citoyens</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Radios locales */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          📍 Radios de votre commune
        </h2>

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && local.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Radio className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Aucune radio locale configurée</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajoutez un flux audio local pour vos citoyens.
            </p>
            <button
              onClick={openNew}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Ajouter une radio
            </button>
          </div>
        )}

        <ul className="space-y-2">
          {local.map((s) => (
            <StreamRow
              key={s.id}
              stream={s}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggle={(id, val) => toggleActive.mutate({ id, val })}
              onTest={handleTest}
              testPlaying={testPlaying && testUrl === s.stream_url}
            />
          ))}
        </ul>
      </section>

      {/* Radios nationales */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          🇫🇷 Radios nationales (gérées par VigieCity)
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Ces flux sont disponibles automatiquement pour tous vos citoyens.
        </p>
        <ul className="space-y-2">
          {national.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3"
            >
              <Radio className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{s.name}</span>
              <button
                onClick={() => handleTest(s.stream_url)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-label="Tester"
              >
                {testPlaying && testUrl === s.stream_url ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 pl-0.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Formulaire bottom-sheet ────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={closeForm}>
          <div className="w-full max-w-lg rounded-t-3xl bg-card px-6 pt-5 pb-10 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? "Modifier la radio" : "Nouvelle radio"}</h2>
              <button onClick={closeForm} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
              <Field label="Nom de la radio *">
                <input className={INPUT_CLS} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Radio Bois-sur-Mer FM" required maxLength={80} />
              </Field>
              <Field label="URL du flux audio *">
                <div className="flex gap-2">
                  <input className={INPUT_CLS + " flex-1"} value={form.stream_url} onChange={(e) => set("stream_url", e.target.value)} placeholder="https://..." required type="url" />
                  <button type="button" onClick={() => form.stream_url && handleTest(form.stream_url)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" title="Tester le flux">
                    {testPlaying && testUrl === form.stream_url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Format .mp3, .aac ou .ogg. Cliquez sur ▶ pour tester.</p>
              </Field>
              <Field label="URL du logo (optionnel)">
                <input className={INPUT_CLS} value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." type="url" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ordre">
                  <input type="number" min={1} max={99} className={INPUT_CLS} value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
                </Field>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-primary" />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold">Annuler</button>
                <button type="submit" disabled={saveMut.isPending} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Suppression ────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-t-3xl bg-card px-6 pt-5 pb-10 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 font-bold">Supprimer cette radio ?</h2>
            <p className="mb-5 text-sm text-muted-foreground">{deleteTarget.name}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold">Annuler</button>
              <button onClick={() => deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending} className="flex-1 rounded-xl bg-sos py-3 text-sm font-semibold text-white disabled:opacity-60">
                {deleteMut.isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminShell>
  );
}

// ─── StreamRow ────────────────────────────────────────────────────────────────
function StreamRow({
  stream, onEdit, onDelete, onToggle, onTest, testPlaying,
}: {
  stream: Stream;
  onEdit: (s: Stream) => void;
  onDelete: (s: Stream) => void;
  onToggle: (id: string, val: boolean) => void;
  onTest: (url: string) => void;
  testPlaying: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      <Radio className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-sm">{stream.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{stream.stream_url}</p>
      </div>
      <button onClick={() => onTest(stream.stream_url)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground" title="Tester">
        {testPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 pl-0.5" />}
      </button>
      <button onClick={() => onToggle(stream.id, !stream.is_active)} className={stream.is_active ? "text-primary" : "text-muted-foreground"} title={stream.is_active ? "Désactiver" : "Activer"}>
        {stream.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
      </button>
      <button onClick={() => onEdit(stream)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(stream)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-sos/10 text-sos">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────
const INPUT_CLS = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
