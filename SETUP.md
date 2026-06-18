# VigieCity - Configuration et Déploiement

## 📋 Prérequis
- Node.js 18+ / Bun
- Un compte Vercel
- Un compte Supabase
- Git configuré

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
# ou
bun install
```

### 2. Configuration des variables d'environnement
```bash
cp .env.example .env
```

Mettez à jour `.env` avec vos clés Supabase:
- `SUPABASE_URL`: L'URL de votre projet Supabase
- `SUPABASE_PUBLISHABLE_KEY`: Votre clé publique Supabase
- `SUPABASE_PROJECT_ID`: L'ID de votre projet Supabase

### 3. Développement local
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 🔧 Configuration Vercel

### Déploiement Initial
```bash
npx vercel
```

Le CLI Vercel vous guidera pour:
- Connecter votre compte Vercel
- Créer un nouveau projet
- Configurer les variables d'environnement
- Déployer votre application

### Variables d'environnement Vercel
Ajoutez ces variables dans le tableau de bord Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## 🗄️ Configuration Supabase

### Projet Existant
Votre projet Supabase est configuré dans `.env`:
- **Project ID**: `cowumtvwvbeolwsnwglb`
- **URL**: `https://cowumtvwvbeolwsnwglb.supabase.co`

### Migrations
Pour exécuter les migrations Supabase:
```bash
npx supabase migration up
```

## 📦 Structure du Projet

```
.
├── src/                    # Code source
├── supabase/              # Migrations et fonctions Supabase
├── package.json           # Dépendances
├── vite.config.ts         # Configuration Vite
├── tsconfig.json          # Configuration TypeScript
└── .env                   # Variables d'environnement (git ignored)
```

## 🔐 Sécurité

- ✅ `.env` n'est jamais commité (inclus dans `.gitignore`)
- ✅ Les variables publiques utilisent le préfixe `VITE_`
- ✅ Les clés sensibles restent côté serveur

## 📝 Scripts disponibles

- `npm run dev` - Démarrer le serveur de développement
- `npm run build` - Construire pour la production
- `npm run preview` - Prévisualiser la build de production
- `npm run lint` - Vérifier la qualité du code
- `npm run format` - Formater le code

## 🚢 Déploiement

### Vercel (Recommandé)
```bash
git push                  # Push vers main/master
# Vercel déploiera automatiquement
```

### Manuel
```bash
npm run build
npx vercel --prod
```

## 📚 Documentation Utile

- [Lovable Documentation](https://lovable.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [TanStack Start](https://tanstack.com/start/latest)

## ✨ Prochaines Étapes

1. [ ] Configurer les variables Supabase
2. [ ] Déployer sur Vercel
3. [ ] Configurer le domaine personnalisé
4. [ ] Mettre en place l'authentification
5. [ ] Configurer les policies Supabase RLS

---

**Dernière mise à jour**: 2026-06-18
