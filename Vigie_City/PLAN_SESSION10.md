# Plan Session 10 — VigieCity Platform
> Exhaustif · Actualisé le 2026-06-21

---

## ✅ Livré dans cette session

| # | Feature | Fichier(s) |
|---|---------|------------|
| 24 | Collectivités pagination serveur (10 lignes), search debounce, tabs statut, modal CRM | `_delivery/src/routes/platform/collectivites.tsx` |
| 25 | Migration SQL — colonnes email/phone/website/mayor_name + index trgm/dept/status | Supabase prod ✅ |
| 26 | Script Python import ZIP mairies | `scripts/import_mairies_zip.py` |
| 27 | Layout 2-3 colonnes — plans + knowledge | `plans.tsx`, `knowledge.tsx` |
| BAT | commit-platform.bat mis à jour session 10 | `commit-platform.bat` |

---

## 🔜 Tâches restantes — plan précis

---

### A. Email transactionnel — Resend

**Problème actuel** : Supabase envoie les mails via son propre SMTP (limité, non brandé, pas de templates).

**Solution** : [Resend](https://resend.com) — API simple, 3 000 emails/mois gratuits, domaine custom.

#### Étapes

1. **Créer compte Resend** → https://resend.com → onglet "Domains" → ajouter `vigiemessage.fr` ou sous-domaine.
2. **Vérifier le domaine** → 3 entrées DNS (MX + TXT SPF + DKIM).
3. **Obtenir la clé API Resend** → Settings → API Keys → `re_xxxx`.
4. **Configurer dans Supabase** → Project Settings → Auth → SMTP :
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: `<clé API>`
   - Sender: `VigieCity <noreply@vigiemessage.fr>`
   → Cela couvre **password reset + magic link** automatiquement.
5. **Templates email** → créer une Edge Function `send-email` qui appelle l'API REST Resend avec des templates HTML VigieCity.
6. **Templates à créer** (via Edge Function + `email_templates` table Supabase) :
   - `welcome` — inscription d'une commune
   - `password_reset` — réinitialisation (override Supabase Auth)
   - `report_notification` — nouveau signalement pour une mairie
   - `alert_broadcast` — alerte urgence envoyée aux citoyens
   - `weekly_digest` — résumé hebdo pour les maires

#### Code Edge Function send-email (squelette)
```typescript
// supabase/functions/send-email/index.ts
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  const { template, to, data } = await req.json();
  const html = renderTemplate(template, data);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "VigieCity <noreply@vigiemessage.fr>", to, subject: SUBJECTS[template], html }),
  });
  return new Response(await res.text(), { status: res.status });
});
```

**Besoin Baptiste** : clé API Resend + DNS vérifié sur le domaine.

---

### B. Analytics — Trafic & Usage

**Contexte** : panel platform doit montrer le trafic de l'app citoyenne (visites, téléchargements, carte des visiteurs, funnel).

**Candidats** :
| Tool | GDPR | Map | Funnels | Gratuit | Intégration |
|------|------|-----|---------|---------|-------------|
| **PostHog** (🏆 recommandé) | ✅ EU Cloud | ✅ Heatmaps | ✅ Complet | 1M events/mo | SDK React + Dashboard embeddable |
| Plausible | ✅ EU | ❌ | ❌ | 30 jours trial | Script léger |
| Umami (self-host) | ✅ | ❌ | ❌ | Gratuit | Supabase-compatible |

**Choix recommandé : PostHog**
- `posthog-js` SDK React → `capture()` pour chaque action clé
- Dashboard intégré dans le panel platform via `<iframe>` ou API
- Carte des sessions (heatmap, click map)
- Funnels : inscription → validation → signalement

#### Intégration (après clé PostHog)

```tsx
// main.tsx
import posthog from "posthog-js";
posthog.init("phc_xxxx", { api_host: "https://eu.posthog.com" });
```

```tsx
// events à tracker :
posthog.capture("report_submitted",   { commune_id, category });
posthog.capture("publication_viewed", { publication_id });
posthog.capture("alert_viewed",       { alert_id });
posthog.capture("radio_played",       { station });
```

#### Page analytics platform (`/platform/analytics`)
À créer — appelle l'API PostHog `/api/projects/.../insights` :
- KPIs : DAU/WAU/MAU, sessions, pageviews
- Graphe 30j visites
- Top pages
- Carte (PostHog GeoIP)
- Funnel inscription → activation
- Trafic par commune (filtrable)

**Besoin Baptiste** : créer compte PostHog EU → https://eu.posthog.com → clé `phc_xxxx`.

---

### C. Brave Search API — Enrichissement RSS

**Plan gratuit** : 2 000 requêtes/mois → https://api.search.brave.com

**Usage VigieCity** : quand une commune n'a pas de flux RSS local, on recherche automatiquement les actualités via Brave Search par mots-clés `"[nom commune] actualités"`.

#### Architecture

```
pg_cron (toutes les 6h)
  → Edge Function `brave-news-fetch`
    → Brave Search API (query: "commune actualités")
    → filtrage pertinence
    → INSERT news_articles (source = 'brave')
```

#### Edge Function sketch
```typescript
const BRAVE_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY")!;

async function searchBrave(query: string) {
  const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=10&country=fr&lang=fr`;
  const res = await fetch(url, { headers: { "X-Subscription-Token": BRAVE_KEY } });
  return res.json();
}
```

**Stratégie** : seulement pour les communes `status = 'active'` sans flux RSS propre. Budget 2000 req/mois → ~66 communes/jour → bien adapté à la phase de lancement.

**Besoin Baptiste** : créer API key → https://api.search.brave.com/register.

---

### D. Radio Player — Optimisation

**Problème actuel** : le lecteur radio mobile peut être peu réactif, peu accessible.

**Améliorations à apporter** :

#### 1. Accessibilité ARIA
```tsx
<audio ref={audioRef} aria-label="Lecteur radio VigieCity" />
<button aria-label={isPlaying ? "Pause" : "Lecture"} aria-pressed={isPlaying}>
```

#### 2. Buffering & Préchargement
```tsx
<audio preload="none" /> // ne pas pré-charger, économise batterie mobile
// Afficher spinner pendant buffering (events: waiting / canplay)
audioRef.current.addEventListener("waiting",  () => setBuffering(true));
audioRef.current.addEventListener("canplay",  () => setBuffering(false));
```

#### 3. Persistance du volume
```tsx
// Sauvegarder dans sessionStorage (pas localStorage — non supporté dans artifact)
const savedVol = parseFloat(sessionStorage.getItem("radio_vol") || "0.8");
```

#### 4. Design
- Mini-player persistant en bas de l'écran quand la radio est lancée
- Artwork de la station (logo commune ou VigieCity)
- Affichage du titre en cours si l'API stream le retourne (`onplay` → fetch `icy-title`)
- Bouton Mute visible + slider volume accessible

#### 5. Erreurs réseau
```tsx
audioRef.current.addEventListener("error", (e) => {
  if (retryCount < 3) { setTimeout(() => audioRef.current?.load(), 3000); retryCount++; }
  else toast.error("Stream radio indisponible");
});
```

---

### E. Performance — Zéro temps de chargement

**Architecture cible** :

#### 1. React Query — Prefetch systématique
```tsx
// Dans le routeur TanStack, on précharge les données avant le mount :
export const Route = createFileRoute("/app/signalements")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery({ queryKey: [...], queryFn: ... }),
  component: SignalementsPage,
});
```

#### 2. Skeleton Loading (zéro flash blanc)
Remplacer tous les `if (isLoading) return <Spinner />` par des skeletons qui correspondent visuellement à la vraie UI.

#### 3. Optimistic Updates
Pour les actions fréquentes (toggle is_active, like, etc.) :
```tsx
useMutation({
  mutationFn: saveToSupabase,
  onMutate: async (newValue) => {
    await qc.cancelQueries({ queryKey });
    const prev = qc.getQueryData(queryKey);
    qc.setQueryData(queryKey, optimisticUpdate(newValue)); // MAJ immédiate UI
    return { prev };
  },
  onError: (_err, _vars, ctx) => qc.setQueryData(queryKey, ctx?.prev), // rollback
});
```

#### 4. Supabase — Index manquants à vérifier
```sql
-- Vérifier avec EXPLAIN ANALYZE :
EXPLAIN ANALYZE SELECT * FROM reports WHERE collectivity_id = 'xxx' ORDER BY created_at DESC LIMIT 20;
-- Si Seq Scan → ajouter index
CREATE INDEX CONCURRENTLY reports_collectivity_created_idx ON reports(collectivity_id, created_at DESC);
```

#### 5. Images & Assets
- Utiliser `loading="lazy"` sur toutes les images non-above-the-fold
- SVG inline pour les icônes (déjà fait avec lucide-react)
- Compression AVIF via Supabase Storage transform : `supabase.storage.from('x').getPublicUrl('img.png', { transform: { width: 400, format: 'avif' } })`

#### 6. CDN & Edge
- Vercel edge caching pour les routes statiques
- Supabase Edge Functions déjà distribuées (Frankfurt → FR users)

---

### F. Panel Platform — Pages manquantes

#### `/platform/analytics` (À créer)
- KPIs live : DAU, MAU, sessions, pages vues
- Graphe 30j (Recharts)
- Carte visiteurs (PostHog ou leaflet)
- Top pages / actions

#### `/platform/users` (À vérifier/enrichir)
- Tableau des profils utilisateurs par commune
- Statut actif/inactif
- Dernier login

#### `/platform/rss` (À enrichir)
- Liste des sources RSS + statut alive/dead
- Bouton "Tester maintenant"
- Historique des fetches (logs)

---

### G. Import ZIP mairies — Procédure

**Script créé** : `scripts/import_mairies_zip.py`

**Pour Baptiste** :
1. Copier `mairies-france-population.zip` dans `C:\Users\Baptiste-\VigieCity\Vigie_City\`
2. Créer `C:\Users\Baptiste-\VigieCity\Vigie_City\.env` :
   ```
   SUPABASE_URL=https://xfhkngecpbvmlstjymfy.supabase.co
   SUPABASE_SERVICE_KEY=<service_role_key depuis Supabase Settings→API>
   ```
3. Dans un terminal PowerShell depuis `Vigie_City/` :
   ```powershell
   pip install pandas openpyxl supabase python-dotenv --break-system-packages
   python scripts/import_mairies_zip.py --dry-run   # aperçu
   python scripts/import_mairies_zip.py              # import réel
   ```

**Ce que le script fait** :
- Lit le CSV/Excel dans le ZIP
- Détecte auto les colonnes (INSEE, email, téléphone, maire, population, CP)
- Met à jour uniquement les lignes matchant par code INSEE
- Batch de 200 lignes pour ne pas timeoutr
- N'écrase pas les champs déjà remplis (sauf `--force`)

---

## 🎯 Ordre de priorité recommandé

```
1. Baptiste lance commit-platform.bat  → déploie session 9+10
2. Baptiste copie le ZIP               → import mairies
3. Baptiste crée compte Resend          → email transactionnel
4. Baptiste crée compte PostHog EU     → analytics
5. Baptiste crée clé Brave API         → enrichissement RSS
6. Session 11 : on code les intégrations avec les clés
```

---

## Variables d'environnement à ajouter (Supabase Vault ou Vercel)

| Variable | Obtenir où |
|----------|------------|
| `RESEND_API_KEY` | https://resend.com → API Keys |
| `POSTHOG_API_KEY` | https://eu.posthog.com → Settings |
| `BRAVE_SEARCH_API_KEY` | https://api.search.brave.com |

Ces clés sont à ajouter dans :
- Supabase → Project Settings → Edge Functions → Secrets (pour les Edge Functions)
- Vercel → Settings → Environment Variables (pour le front si besoin)
