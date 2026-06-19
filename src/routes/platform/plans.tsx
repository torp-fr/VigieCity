import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, Edit2, Save, X } from 'lucide-react';

export const Route = createFileRoute('/platform/plans')({
  head: () => ({ meta: [{ title: 'Grille tarifaire — Platform' }] }),
  component: PlansPage,
});

const FEATURES_LABELS: Record<string, string> = {
  carte: 'Carte interactive',
  push_notifications: 'Notifications push',
  stats_avancees: 'Statistiques avancées',
  services_perso: 'Services personnalisés',
  white_label: 'White-label',
  api_acces: 'Accès API',
  publications: 'Publications & agenda',
  voisins_vigilants: 'Voisins vigilants',
  support: 'Support',
  sla: 'SLA garanti',
};

function PlansPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<Record<string, any>>({});

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').order('display_order');
      return data ?? [];
    },
  });

  const { data: interco } = useQuery({
    queryKey: ['intercommunal_pricing'],
    queryFn: async () => {
      const { data } = await supabase.from('intercommunal_pricing').select('*').order('display_order');
      return data ?? [];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...vals }: any) => {
      await supabase.from('plans').update(vals).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); setEditing(null); },
  });

  const PLAN_COLORS: Record<string, string> = {
    decouverte: 'bg-gray-50 border-gray-200',
    essentiel:  'bg-blue-50 border-blue-200',
    standard:   'bg-violet-50 border-violet-200',
    pro:        'bg-amber-50 border-amber-200',
    intercommunal: 'bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Grille tarifaire</h1>
        <p className="text-sm text-muted-foreground mt-1">Plans VigieCity — validés le 19 juin 2026. Cliquer sur un prix pour modifier.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {plans?.map((plan: any) => (
          <div key={plan.id} className={`rounded-2xl border-2 p-5 ${PLAN_COLORS[plan.id] ?? 'bg-card border-border'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  {plan.price_monthly > 0 && (
                    <span className="text-xs bg-white border border-current px-2 py-0.5 rounded-full font-mono">
                      {plan.price_monthly} €/mois HT
                    </span>
                  )}
                  {plan.price_monthly === 0 && (
                    <span className="text-xs bg-white border px-2 py-0.5 rounded-full">Sur devis</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {plan.max_users ? `Jusqu'à ${plan.max_users.toLocaleString('fr-FR')} habitants` : 'Illimité'}
                  {plan.price_monthly > 0 && ` · ${(plan.price_monthly * 12).toLocaleString('fr-FR')} €/an HT`}
                </p>
              </div>

              <div className="flex gap-2">
                {editing === plan.id ? (
                  <>
                    <button onClick={() => updatePlan.mutate({ id: plan.id, ...editVal })}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      <Save className="h-3.5 w-3.5" /> Sauvegarder
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setEditing(plan.id); setEditVal({ price_monthly: plan.price_monthly, max_users: plan.max_users }); }}
                    className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-white">
                    <Edit2 className="h-3.5 w-3.5" /> Modifier
                  </button>
                )}
              </div>
            </div>

            {editing === plan.id && (
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white p-4 border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Prix mensuel HT (€)</label>
                  <input type="number" value={editVal.price_monthly ?? 0}
                    onChange={e => setEditVal(v => ({ ...v, price_monthly: parseInt(e.target.value) || 0 }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Max habitants</label>
                  <input type="number" value={editVal.max_users ?? ''}
                    onChange={e => setEditVal(v => ({ ...v, max_users: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Illimité"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(plan.features ?? {}).map(([key, val]) => (
                <span key={key} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${val ? 'bg-white border text-foreground' : 'bg-white/50 border border-dashed text-muted-foreground line-through'}`}>
                  {val && <Check className="h-3 w-3 text-emerald-600" />}
                  {FEATURES_LABELS[key] ?? key}
                  {key === 'support' && typeof val === 'string' && ` (${val})`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Barème intercommunal interne</h2>
        <p className="text-xs text-muted-foreground mb-4">Usage interne uniquement — affiché "sur devis" en externe.</p>
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Périmètre</th>
                <th className="px-4 py-3 text-right font-medium">Prix/mois HT</th>
                <th className="px-4 py-3 text-right font-medium">Prix/an HT</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {interco?.map((row: any) => (
                <tr key={row.id} className="bg-card hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.price_monthly} €</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{(row.price_monthly * 12).toLocaleString('fr-FR')} €</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 border p-4 text-xs text-muted-foreground space-y-1">
        <p><strong>Rappel légal</strong> : Seuil dispense de publicité et mise en concurrence depuis 01/04/2026 : 60 000 € HT sur la durée totale du contrat (fournitures/services, collectivités). Tous nos plans restent en dessous sur 3 ans.</p>
        <p><strong>TVA</strong> : 20 % sur service SaaS. Les collectivités ne récupèrent pas la TVA — facturer HT + TVA systématiquement.</p>
        <p><strong>Remise annuelle</strong> : −10 % si paiement annuel. Exemple Standard : 129 × 12 × 0.9 = 1 393 € HT/an.</p>
      </div>
    </div>
  );
}
