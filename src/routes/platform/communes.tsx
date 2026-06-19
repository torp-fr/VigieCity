import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Shield, CheckCircle2, XCircle, Building2, Pencil, Trash2, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/platform/communes')({
  head: () => ({ meta: [{ title: 'Communes — Platform Admin' }, { name: 'robots', content: 'noindex' }] }),
  component: PlatformCommunesPage,
});

type Commune = {
  id: string; name: string;
  department_code: string | null; postal_code: string | null;
  license: { plan: string; status: string; expires_at: string | null } | null;
};

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', decouverte: 'Découverte', essentiel: 'Essentiel',
  standard: 'Standard', pro: 'Pro', intercommunal: 'Intercommunal',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-600', suspended: 'text-amber-600', cancelled: 'text-red-600',
};

function PlatformCommunesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [editId,     setEditId]     = useState<string | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editPostal, setEditPostal] = useState('');
  const [editDept,   setEditDept]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase.from('user_roles').select('id')
        .eq('user_id', uid).eq('role', 'admin').is('collectivity_id', null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['platform_communes'],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [colRes, licRes] = await Promise.all([
        supabase.from('collectivities').select('id, name, department_code, postal_code').order('name'),
        supabase.from('commune_licenses').select('collectivity_id, plan, status, expires_at'),
      ]);
      if (colRes.error) { console.error('collectivities', colRes.error); throw colRes.error; }
      if (licRes.error) { console.error('commune_licenses', licRes.error); throw licRes.error; }
      const lic: Record<string, typeof licRes.data[0]> = {};
      for (const l of licRes.data ?? []) lic[l.collectivity_id] = l;
      return (colRes.data ?? []).map((c) => ({ ...c, license: lic[c.id] ?? null })) as Commune[];
    },
  });

  const updateCommune = useMutation({
    mutationFn: async ({ id, name, postal_code, department_code }: { id: string; name: string; postal_code: string; department_code: string }) => {
      const { error } = await supabase.from('collectivities')
        .update({ name: name.trim(), postal_code: postal_code.trim() || null, department_code: department_code.trim() || null })
        .eq('id', id);
      if (error) { console.error('updateCommune', error); throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform_communes'] }); setEditId(null); toast.success('Commune mise à jour.'); },
    onError: (e: Error) => toast.error('Erreur : ' + e.message),
  });

  const suspendCommune = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' }) => {
      const { error } = await supabase.from('commune_licenses').update({ status }).eq('collectivity_id', id);
      if (error) { console.error('suspendCommune', error); throw error; }
    },
    onSuccess: (_, { status }) => { qc.invalidateQueries({ queryKey: ['platform_communes'] }); toast.success(status === 'suspended' ? 'Commune suspendue.' : 'Commune réactivée.'); },
    onError: (e: Error) => toast.error('Erreur : ' + e.message),
  });

  const deleteCommune = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('collectivities').delete().eq('id', id);
      if (error) { console.error('deleteCommune', error); throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform_communes'] }); setDeleteTarget(null); toast.success('Commune supprimée.'); },
    onError: (e: Error) => toast.error('Erreur : ' + e.message),
  });

  const upsertLicense = useMutation({
    mutationFn: async ({ collectivityId, plan }: { collectivityId: string; plan: string }) => {
      const { error } = await supabase.from('commune_licenses')
        .upsert({ collectivity_id: collectivityId, plan, status: 'active' }, { onConflict: 'collectivity_id' });
      if (error) { console.error('upsertLicense', error); throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform_communes'] }); toast.success('Licence activée.'); },
    onError: (e: Error) => toast.error('Erreur : ' + e.message),
  });

  if (isAdmin === null) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return (
    <div className="px-4 pt-10 text-center">
      <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Accès refusé.</p>
      <button onClick={() => navigate({ to: '/' })} className="mt-4 text-sm text-primary underline">Retour</button>
    </div>
  );

  return (
    <div className="space-y-4 px-4 pt-5">
      <Link to="/platform" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Platform Admin
      </Link>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Communes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{data?.length ?? '—'} collectivité(s)</p>
        </div>
        <Link to="/platform/onboarding"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          + Onboarder
        </Link>
      </header>

      {/* Confirmation suppression inline */}
      {deleteTarget && (
        <div className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">Supprimer <span className="underline">{deleteTarget.name}</span> ?</p>
          </div>
          <p className="text-sm text-red-600">Cette action supprimera la commune, ses licences et tous ses accès. Irréversible.</p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteCommune.mutate(deleteTarget.id)}
              disabled={deleteCommune.isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
              {deleteCommune.isPending ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
            <button onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
              Annuler
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucune commune. <Link to="/platform/onboarding" className="underline text-primary">Onboarder la première</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card shadow-card">
              {/* Ligne principale */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.postal_code, c.department_code && 'Dép. ' + c.department_code].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {c.license ? (
                      <>
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                          {PLAN_LABELS[c.license.plan] ?? c.license.plan}
                        </span>
                        <span className={`text-xs font-medium ${STATUS_COLOR[c.license.status] ?? ''}`}>
                          {c.license.status === 'active'
                            ? <><CheckCircle2 className="inline h-3 w-3 mr-0.5" />Actif</>
                            : <><XCircle className="inline h-3 w-3 mr-0.5" />{c.license.status}</>}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground italic">Sans licence</span>
                        <button
                          type="button"
                          onClick={() => upsertLicense.mutate({ collectivityId: c.id, plan: 'trial' })}
                          disabled={upsertLicense.isPending}
                          className="rounded-lg bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90">
                          Activer Trial
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ActionMenu actions={[
                  {
                    label: 'Modifier',
                    icon: Pencil,
                    onClick: () => {
                      setDeleteTarget(null);
                      setEditId(editId === c.id ? null : c.id);
                      setEditName(c.name);
                      setEditPostal(c.postal_code ?? '');
                      setEditDept(c.department_code ?? '');
                    },
                  },
                  {
                    label: c.license?.status === 'suspended' ? 'Réactiver' : 'Suspendre',
                    icon: c.license?.status === 'suspended' ? PlayCircle : PauseCircle,
                    onClick: () => suspendCommune.mutate({ id: c.id, status: c.license?.status === 'suspended' ? 'active' : 'suspended' }),
                    disabled: !c.license,
                  },
                  {
                    label: 'Supprimer',
                    icon: Trash2,
                    onClick: () => { setEditId(null); setDeleteTarget({ id: c.id, name: c.name }); },
                    variant: 'danger',
                  },
                ]} />
              </div>

              {/* Formulaire modifier inline */}
              {editId === c.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modifier</p>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom de la commune"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                  <div className="flex gap-2">
                    <input value={editPostal} onChange={(e) => setEditPostal(e.target.value)} placeholder="Code postal" maxLength={5}
                      className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                    <input value={editDept} onChange={(e) => setEditDept(e.target.value)} placeholder="Dép. (66)" maxLength={3}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button"
                      disabled={updateCommune.isPending || !editName.trim()}
                      onClick={() => updateCommune.mutate({ id: c.id, name: editName, postal_code: editPostal, department_code: editDept })}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                      {updateCommune.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
