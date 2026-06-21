# RUNBOOK — VigieCity Platform

> Procédures de déploiement, monitoring, et maintenance.  
> Mis à jour : 2026-06-21 (J11 — Monitoring & Ops)

---

## 1. Déploiement standard

### Prérequis
- Git configuré sur `Vigie_City/` (remote = Vercel GitHub integration)
- Supabase MCP ou CLI disponible pour les Edge Functions / migrations
- `commit-platform.bat` à la racine du dépôt

### Procédure

```
1. Modifications dans _delivery/src/   (code React/TypeScript)
   OU dans public/                      (SW, manifest, icons, offline.html)

2. Double-cliquer commit-platform.bat
   → Copie _delivery/* vers la racine (Copy-Item -Recurse -Force)
   → git add -A
   → git commit -m "feat: ..."
   → git push origin main

3. Vercel détecte le push → build automatique (≈ 2 min)
   Logs : https://vercel.com/dashboard → projet vigiecity

4. Post-deploy : tester https://vigiecity.fr/health-check (JSON "ok")
```

> **Important** : les fichiers statiques (`public/sw.js`, `public/manifest.webmanifest`, `public/icons/*`) 
> doivent être modifiés directement dans `Vigie_City/public/` ET dans `Vigie_City/_delivery/public/`
> pour être inclus dans le commit.

### Rollback
```bash
git revert HEAD
git push
# Vercel re-déploie automatiquement le commit précédent
```

---

## 2. Edge Functions Supabase

### Liste des EFs déployées

| Slug | JWT | Cron | Description |
|------|-----|------|-------------|
| `health-check` | ❌ non | — | Endpoint UptimeRobot / monitoring |
| `send-email` | ✅ | — | Emails transactionnels via Resend |
| `brave-news-fetch` | ✅ | — | Fetch actualités via Brave Search |
| `send-push` | ✅ | — | Push Web notifications |
| `send-push-notification` | ✅ | — | Alias push notification |
| `posthog-query` | ✅ | — | Query analytics PostHog |
| `invite-commune` | ✅ | — | Invitation admin commune |
| `meteo-vigilance` | ✅ | Horaire | Récupère alertes Météo-France |
| `event-reminder-push` | ✅ | Quotidien 9h | Push rappels événements J-1 |
| `vapid-key` | ✅ | — | Clé publique VAPID pour push |
| `create-commune` | ✅ | — | Création commune (super admin) |

### Déployer / redéployer une EF via Supabase MCP
```
deploy_edge_function(
  project_id: "xfhkngecpbvmlstjymfy",
  name: "<slug>",
  files: [{ name: "index.ts", content: "..." }],
  verify_jwt: true|false
)
```

### Variables d'environnement EF (Supabase Secrets)
- `SUPABASE_URL` — auto-injecté
- `SUPABASE_SERVICE_ROLE_KEY` — auto-injecté
- `RESEND_API_KEY` — clé Resend (configurée dans Supabase Dashboard → Edge Functions → Secrets)
- `BRAVE_API_KEY` — clé Brave Search (idem)

---

## 3. pg_cron — Tâches planifiées

### Liste des jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `expire-alerts` | `0 * * * *` | Marque les alertes expirées |
| `fetch-rss-hourly` | `0 * * * *` | Pipeline RSS → `news_articles` |
| `meteo-vigilance-hourly` | `30 * * * *` | Alertes Météo-France |
| `clean-meteo-daily` | `0 3 * * *` | Purge anciennes météo-vigilances |
| `event-reminder-push-daily` | `0 9 * * *` | Push rappels événements (9h UTC) |
| `rss-health-alert-daily` | `0 8 * * *` | Alerte email si 0 articles/24h |

### Ajouter un job
```sql
SELECT cron.schedule(
  'mon-job',
  '0 6 * * *',
  $job$
  -- SQL à exécuter
  $job$
);
```

### Désactiver un job temporairement
```sql
UPDATE cron.job SET active = false WHERE jobname = 'mon-job';
```

### Supprimer un job
```sql
SELECT cron.unschedule('mon-job');
```

---

## 4. Health Monitoring

### Endpoint de santé

**URL :** `https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/health-check`  
**Méthode :** GET  
**Auth :** Aucune (public)

**Réponse OK (200) :**
```json
{
  "status": "ok",
  "timestamp": "2026-06-21T10:00:00.000Z",
  "checks": {
    "db": true,
    "active_communes": 42,
    "articles_last_24h": 156,
    "rss_last_fetch": "2026-06-21T09:00:12.000Z",
    "active_rss_sources": 8
  },
  "version": "v1"
}
```

**Réponse dégradée (503) :** `status: "degraded"` + `articles_last_24h: 0` ou `db: false`

### Configuration UptimeRobot
1. Créer un moniteur **HTTP(s)** sur `https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/health-check`
2. Intervalle : **5 minutes**
3. Alert contact : `swordaa01@gmail.com`
4. Keyword monitor : `"status":"ok"` (optionnel)

### PostHog — Alerting
- Dashboard : https://eu.posthog.com
- Alerts configurés sur événements critiques (erreurs de connexion, abandons onboarding)
- Voir section Insights → Funnels → Onboarding

---

## 5. Pipeline RSS

### Architecture
```
cron (hourly) → cron_fetch_rss() [SQL function]
  → appelle brave-news-fetch EF (optionnel)
  → INSERT INTO news_articles (rss_source_id, title, url, fetched_at, ...)
```

### Debug : aucun article en 24h
1. Vérifier `cron.job` : `SELECT * FROM cron.job WHERE jobname = 'fetch-rss-hourly';`
2. Vérifier `rss_sources` actives : `SELECT * FROM rss_sources WHERE is_active = true;`
3. Tester manuellement : `SELECT public.cron_fetch_rss();`
4. Vérifier les logs EF Supabase : Dashboard → Edge Functions → brave-news-fetch → Logs

### Ajouter une source RSS
```sql
INSERT INTO rss_sources (collectivity_id, name, url, category, is_active)
VALUES ('<uuid>', 'Ma commune', 'https://ma-commune.fr/rss', 'local', true);
```

---

## 6. Base de données

### Migrations
Appliquées directement via Supabase MCP `apply_migration`. Listées dans :
```
Supabase Dashboard → Database → Migrations
```

### Vault (secrets SQL)
- `app.service_role_key` — utilisé par pg_cron pour appeler les EFs
- `app.supabase_url` — URL du projet
- Configurer : `ALTER DATABASE postgres SET "app.service_role_key" = '...'`

### RLS — Règles importantes
- `profiles` : lecture publique si `auth.uid() = id` OU rôle admin
- `news_articles` : lecture publique, écriture service role seulement
- `user_roles` : lecture si `auth.uid() = user_id`, écriture super_admin seulement
- `collectivities` : lecture publique, écriture admin seulement

### Sauvegardes
- Supabase Pro : backups automatiques quotidiens (PITR disponible)
- Dashboard → Database → Backups

---

## 7. Variables d'environnement Vercel

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | `https://xfhkngecpbvmlstjymfy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `VITE_POSTHOG_KEY` | Clé PostHog EU |

Configurer : Vercel Dashboard → Project → Settings → Environment Variables

---

## 8. Contacts & Ressources

| Ressource | URL |
|-----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/xfhkngecpbvmlstjymfy |
| Vercel Dashboard | https://vercel.com/dashboard |
| PostHog EU | https://eu.posthog.com |
| Resend Dashboard | https://resend.com/emails |
| App en production | https://vigiecity.fr |
| Admin platform | https://vigiecity.fr/platform |
| Health endpoint | https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/health-check |
