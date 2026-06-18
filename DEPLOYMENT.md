# 🚀 Guide de Déploiement VigieCity sur Vercel

## Phase 1: Configuration Locale

### 1.1 Vérifier l'environnement
```bash
node --version    # Doit être v18+
npm --version     # Doit être 10+
vercel --version  # Vercel CLI
```

### 1.2 Configurer les variables d'environnement
```bash
# Copier le template
cp .env.example .env

# Ajouter vos clés Supabase
# VITE_SUPABASE_URL=https://cowumtvwvbeolwsnwglb.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_yv2Oatfwe8QlTUreO0zKeQ_UuWYzlif
# VITE_SUPABASE_PROJECT_ID=cowumtvwvbeolwsnwglb
```

### 1.3 Tester localement
```bash
npm run dev
# Accéder à http://localhost:5173
```

## Phase 2: Connexion Vercel

### 2.1 Authentification
```bash
vercel login
# Connectez-vous avec votre compte Vercel
```

### 2.2 Lier le projet
```bash
vercel link
# Choisir: [Create and deploy] - créer un nouveau projet
# Projet: VigieCity
# Répertoire: .
```

Cela va:
- Créer un projet Vercel
- Remplir `.vercel/project.json` avec projectId et orgId
- Créer une branche `vercel` pour les déploiements d'aperçu

### 2.3 Configuration des variables d'environnement
```bash
vercel env pull
# Cela télécharge les variables d'env de Vercel vers .env.local
```

Ou manuellement via le tableau de bord Vercel:
1. Aller à Project Settings > Environment Variables
2. Ajouter:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

## Phase 3: Premier Déploiement

### 3.1 Via CLI
```bash
vercel deploy --prod
```

### 3.2 Via Git (Recommandé)
```bash
git push origin main
# Vercel déploiera automatiquement
```

### 3.3 Vérification
```bash
vercel ls
# Affiche vos déploiements récents
```

## Phase 4: Configuration Post-Déploiement

### 4.1 Domaine personnalisé
1. Dashboard Vercel > Project > Domains
2. Ajouter le domaine
3. Configurer DNS selon les instructions

### 4.2 Authentification Supabase
1. Aller à [supabase.co](https://supabase.co)
2. Project Settings > Auth
3. Site URL: `https://vigiecity.vercel.app` (ou votre domaine)
4. Redirect URLs:
   - `https://vigiecity.vercel.app/auth/callback`
   - `https://vigiecity.vercel.app`

### 4.3 Logs et monitoring
```bash
vercel logs --prod
vercel insights
```

## Phase 5: Workflow de Développement

### Développement Local
```bash
npm run dev
# Travailler sur les features
```

### Avant le commit
```bash
npm run lint
npm run format
npm run build  # Vérifier la build
```

### Push et Déploiement
```bash
git add .
git commit -m "feat: description"
git push origin feature-branch
# Vercel crée un déploiement d'aperçu (preview)

# Quand prêt à déployer:
git push origin main
# Vercel déploie en production
```

## 🔄 Redéploiement

### Manuel
```bash
vercel deploy --prod
```

### Via Git (Recommandé)
```bash
git push origin main
```

### Rollback
```bash
vercel rollback
# Revenir au déploiement précédent
```

## 🐛 Troubleshooting

### Build échoue
```bash
vercel logs --prod
# Vérifier les logs

npm run build
# Tester localement
```

### Variables d'env manquantes
```bash
vercel env list
vercel env pull
# Synchroniser les variables
```

### Cache issue
```bash
vercel deploy --prod --skip-build
# Forcer un redéploiement
```

## 📊 Monitoring

### Performance
- Vercel Analytics Dashboard
- Lighthouse CI intégration
- Web Vitals tracking

### Erreurs
- Error Tracking intégré
- Logs en temps réel
- Alertes email

## 🔐 Sécurité

- ✅ HTTPS automatique
- ✅ DDoS protection
- ✅ WAF protection
- ✅ Environment variables encryptées
- ✅ Deployments immutables

## 📝 Commandes Utiles

```bash
# Infos projet
vercel projects list
vercel project info

# Équipe
vercel teams list

# Environnements
vercel env list
vercel env add VARIABLE_NAME
vercel env pull

# Déploiements
vercel list
vercel deploy
vercel promote <deployment-url>  # Promouvoir en production
vercel rollback                  # Rollback

# Analytics
vercel analytics
vercel insights

# Logs
vercel logs                      # Production logs
vercel logs --tail               # Stream logs
```

---

**Documentation Complète**: https://vercel.com/docs
