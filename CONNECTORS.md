# 🔌 Guide des Connecteurs MCP (Model Context Protocol)

## Vue d'ensemble

Les connecteurs MCP permettent à Claude Code de s'intégrer avec des systèmes externes pour:
- Lire/modifier les données
- Exécuter des commandes
- Accéder aux APIs
- Automatiser les workflows

## Connecteurs Configurés

### 1. Vercel MCP
**Status**: ✅ Connecté et prêt

#### Outils disponibles
- `list_projects` - Lister les projets
- `get_project` - Détails d'un projet
- `deploy_to_vercel` - Déployer directement
- `list_teams` - Lister les équipes
- `list_deployments` - Historique des déploiements

#### Configuration
```javascript
// .vercel/project.json
{
  "projectId": "prj_vigiecity_xxxxx",  // À remplir après vercel link
  "orgId": "personal",
  "name": "vigiecity-community-guardian"
}
```

#### Utilisation
```bash
# Via CLI Claude Code
/deploy-verify    # Vérifier deployments
/code-review      # Review avant deploy

# Via Vercel CLI
vercel deploy --prod
vercel rollback
```

### 2. Supabase MCP
**Status**: ✅ Connecté et prêt

#### Outils disponibles
- `list_projects` - Lister les projets Supabase
- `create_project` - Créer un nouveau projet
- `get_project` - Détails du projet
- `list_tables` - Schéma de la base
- `execute_query` - Exécuter du SQL
- `get_logs` - Logs et diagnostics
- `apply_migration` - Appliquer migrations

#### Configuration
```env
# .env
SUPABASE_URL="https://cowumtvwvbeolwsnwglb.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_yv2Oatfwe8QlTUreO0zKeQ_UuWYzlif"
SUPABASE_PROJECT_ID="cowumtvwvbeolwsnwglb"

# Supabase CLI
supabase projects list
supabase db pull       # Récupérer le schéma
supabase migration new # Créer une migration
```

#### Utilisation
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

// Requêtes
const { data, error } = await supabase
  .from('table_name')
  .select('*')

// Real-time
supabase
  .channel('table_name')
  .on('postgres_changes', { event: '*' }, handler)
  .subscribe()
```

### 3. GitHub MCP
**Status**: ✅ Connecté via Lovable

#### Outils disponibles
- Lister les issues/PRs
- Créer des commentaires
- Mettre à jour les statuts
- Actions CI/CD

#### Workflow avec Lovable
```
Commit local → Push → GitHub
  → Lovable syncs ← → Claude Code
    → Merge PR
      → Vercel auto-deploy
```

### 4. Lovable Integration
**Status**: ✅ Actif (community-guardian)

#### Règles Importantes
⚠️ **IMPORTANT**: Voir [AGENTS.md](AGENTS.md)

- ✅ Créer des commits normaux
- ✅ Push des commits quand prêt
- ✅ Travailler sur branches protégées
- ❌ JAMAIS force-push
- ❌ JAMAIS rebase/amend des commits pushés
- ❌ JAMAIS squash dans l'historique

#### Workflow Recommandé
```bash
# 1. Créer une branche feature
git checkout -b feature/ma-feature

# 2. Développer et tester
npm run dev
npm run lint
npm run build

# 3. Commit (Lovable le verra)
git add .
git commit -m "feat: description"

# 4. Push (syncs avec Lovable)
git push origin feature/ma-feature

# 5. Créer une PR
gh pr create --title "feat: description"

# 6. Merge
gh pr merge --squash  # Ne pas squasher - la branche restera propre
# Merging avec Lovable...

# 7. Pull et continue
git checkout main
git pull
```

## Intégration Complète

### Setup Workflow
```bash
# 1. Initialiser les connecteurs
./init-connectors.sh

# 2. Authentifier Vercel
vercel login
vercel link

# 3. Configurer l'environnement
cp .env.example .env
# Ajouter les clés Supabase

# 4. Tester la connexion
npm run dev        # Frontend
supabase status    # Supabase

# 5. Deploy
git push origin main
# Vercel déploiera automatiquement
```

### CI/CD Pipeline
```
┌─────────────────────────────────┐
│   Git Push to main              │
├─────────────────────────────────┤
│   GitHub Actions (Lovable)      │
├─────────────────────────────────┤
│   ✓ Lint Check (ESLint)         │
│   ✓ Type Check (TypeScript)     │
│   ✓ Build Check (Vite)          │
├─────────────────────────────────┤
│   Vercel Webhook Triggered      │
├─────────────────────────────────┤
│   ✓ Build (npm run build)       │
│   ✓ Tests (ESLint rules)        │
│   ✓ Deploy to Edge Network      │
│   ✓ Cache Invalidation          │
├─────────────────────────────────┤
│   ✅ Production Deployment       │
└─────────────────────────────────┘
```

## Commandes Utiles

### Vercel
```bash
vercel                      # Status du projet
vercel link                 # Lier à un projet Vercel
vercel env pull             # Récupérer env vars
vercel env add KEY VALUE    # Ajouter env var
vercel deploy --prod        # Deploy en prod
vercel logs --prod          # Logs production
vercel analytics            # Web Vitals
```

### Supabase
```bash
supabase projects list      # Lister les projets
supabase db pull            # Sync le schéma local
supabase migration new      # Créer une migration
supabase migration up       # Appliquer migrations
supabase functions deploy   # Deploy edge functions
supabase logs tail          # Stream les logs
```

### GitHub / Lovable
```bash
gh pr create                # Créer une PR
gh pr list                  # Lister les PRs
gh pr view <number>         # Détails d'une PR
gh pr merge <number>        # Merger une PR
git log --oneline           # Voir les commits
git push origin main        # Sync avec Lovable
```

### Claude Code
```bash
/code-review                # Review de code
/verify                     # Vérifier le fonctionnement
/run                        # Lancer l'app
/help                       # Aide
```

## Troubleshooting

### Vercel Deploy Échoue
```bash
# Checker les logs
vercel logs --prod

# Vérifier les env vars
vercel env list

# Rebuild localement
npm run build
npm run preview
```

### Supabase Connection Error
```bash
# Vérifier les clés
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_PUBLISHABLE_KEY

# Tester la connexion
curl -X POST "${VITE_SUPABASE_URL}/rest/v1/rpc/healthcheck" \
  -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}"
```

### Lovable Sync Issues
```bash
# Vérifier le status Git
git status
git log --oneline -5

# Sync avec main
git pull origin main

# Push les changements
git push origin main
```

## Bonnes Pratiques

### Environment Variables
- ✅ Utiliser le préfixe `VITE_` pour les variables publiques
- ✅ Nunca committer `.env` (dans `.gitignore`)
- ✅ Ajouter les vars via Vercel dashboard pour la prod
- ✅ Utiliser `.env.example` pour la documentation

### Commits et Branches
- ✅ Convention: `feat:`, `fix:`, `docs:`, `refactor:`
- ✅ Messages clairs et en anglais
- ✅ Una commit = una feature
- ✅ Push fréquemment (Lovable synce)

### Déploiement
- ✅ Toujours tester localement avant de pusher
- ✅ Review le code avant merge (via PR)
- ✅ Vercel crée des preview deployments
- ✅ Main branch = production

## Documentation Externe

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Lovable Dev](https://lovable.dev)
- [TanStack Router](https://tanstack.com/router)
- [Claude Code](https://claude.com/code)

---

**Dernière mise à jour**: 2026-06-18
**Statut Connecteurs**: ✅ Tous configurés
