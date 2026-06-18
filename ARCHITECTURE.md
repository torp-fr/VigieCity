# 🏗️ Architecture VigieCity

## Vue d'ensemble

VigieCity est une application de surveillance communautaire construite avec la stack moderne:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel CDN)                    │
├─────────────────────────────────────────────────────────────┤
│  TanStack Start + React 19 + TypeScript + Tailwind CSS      │
│  ├── Pages (TanStack Router)                                │
│  ├── Components (Radix UI)                                  │
│  └── Styling (Tailwind + CSS-in-JS)                         │
├─────────────────────────────────────────────────────────────┤
│              Backend (Supabase PostgreSQL)                  │
├─────────────────────────────────────────────────────────────┤
│  ├── Database (PostgreSQL)                                  │
│  ├── Auth (Supabase Auth + JWT)                             │
│  ├── Real-time (WebSocket)                                  │
│  ├── Storage (S3-compatible)                                │
│  └── Functions (Edge Functions)                             │
└─────────────────────────────────────────────────────────────┘
```

## Stack Technologique

### Frontend
- **Framework**: TanStack Start 1.167+ (React metaframework)
- **Runtime**: Node.js 18+ / Bun
- **Build Tool**: Vite 8.0+
- **Language**: TypeScript 5.8+
- **Styling**: Tailwind CSS 4.2+, Radix UI
- **Routing**: TanStack Router 1.168+
- **State Management**: TanStack React Query 5.83+
- **Forms**: React Hook Form 7.71+ + Zod validation
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts 2.15+
- **Code Quality**: ESLint 9.32 + Prettier 3.7

### Backend
- **Database**: PostgreSQL (via Supabase)
- **ORM/Query**: Supabase JS SDK 2.108+
- **Authentication**: Supabase Auth + JWT
- **Real-time**: Supabase Realtime (WebSocket)
- **File Storage**: Supabase Storage
- **Messaging**: Sonner Toast
- **Server**: Nitro 3 (optional, for edge functions)

### DevOps
- **Hosting**: Vercel (Serverless platform)
- **Git**: GitHub integration with Lovable
- **Package Manager**: npm 11+ or Bun
- **CI/CD**: Vercel automatic deployments
- **Monitoring**: Vercel Analytics + Web Vitals

## Structure des Dossiers

```
VigieCity/
├── src/
│   ├── components/           # Composants réutilisables
│   │   ├── ui/              # Radix UI + Tailwind components
│   │   ├── forms/           # Formulaires avec validation
│   │   ├── layout/          # Layout components
│   │   └── ...specific/     # Composants métier
│   ├── routes/              # TanStack Router pages
│   │   ├── index.tsx        # Page d'accueil
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── alertes/
│   │   └── ...other/
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client config
│   │   ├── api.ts           # API helpers
│   │   ├── utils.ts         # Utilitaires
│   │   └── types.ts         # Types TypeScript
│   ├── hooks/               # React hooks custom
│   ├── styles/              # CSS global + Tailwind config
│   └── root.tsx             # Root component + layout
│
├── supabase/
│   ├── migrations/          # Migrations SQL
│   │   └── 20260618120000_initial_schema.sql
│   ├── seed.sql             # Seed data
│   ├── functions/           # Edge functions
│   └── types.ts             # Types générés automatiquement
│
├── public/                  # Fichiers statiques
│   ├── logo.svg
│   └── ...assets/
│
├── .vercel/                 # Configuration Vercel
│   └── project.json
├── .lovable/                # Configuration Lovable
├── .env                     # Variables d'env (local)
├── .env.example             # Template env
├── .gitignore
├── .prettierrc               # Prettier config
├── eslint.config.js         # ESLint rules
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── vercel.json              # Vercel deployment config
├── package.json             # NPM dependencies
├── bun.lock                 # Bun lockfile (optionnel)
└── package-lock.json        # npm lockfile
```

## Configuration Environment

### Variables d'env (Production - Vercel)
```env
# Supabase Public (exposed au client)
VITE_SUPABASE_URL=https://cowumtvwvbeolwsnwglb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_yv2Oatfwe8QlTUreO0zKeQ_UuWYzlif
VITE_SUPABASE_PROJECT_ID=cowumtvwvbeolwsnwglb

# Supabase Secret (server-only)
SUPABASE_URL=https://cowumtvwvbeolwsnwglb.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_yv2Oatfwe8QlTUreO0zKeQ_UuWYzlif
```

### Variables d'env (Local Development)
Même config dans `.env.local`

## Flux de Données

### Client → Supabase
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default supabase

// Utilisation dans les composants
const { data, error } = await supabase
  .from('alerts')
  .select('*')
  .eq('status', 'active')
```

### Real-time Updates
```typescript
// Subscribe aux changements en temps réel
supabase
  .channel('alerts')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'alerts' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe()
```

## Authentification

### Flow
1. User signup/login via Supabase Auth UI
2. JWT token stocké dans localStorage
3. Token inclus dans les headers API
4. Supabase RLS policies valident l'accès

### Exemple
```typescript
// Auth hook
import { useQuery } from '@tanstack/react-query'

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = 
        await supabase.auth.getUser()
      return user
    }
  })
}
```

## Base de Données

### Schéma Principal
```sql
-- Users (géré par Supabase Auth)
-- Profils utilisateur personnalisés
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Alertes/Signalements
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  location POINT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT
);
```

### Row Level Security (RLS)
```sql
-- Users ne peuvent voir que leurs propres données
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  USING (user_id = auth.uid());

-- Users ne peuvent modifier que leurs propres alertes
CREATE POLICY "Users can modify own alerts"
  ON alerts FOR UPDATE
  USING (user_id = auth.uid());
```

## Déploiement

### Vercel
- **Build**: `npm run build`
- **Start**: Vite preview ou Node server
- **Framwork**: Vite (auto-detected)
- **Environment Variables**: Automatiquement injectées
- **Domains**: Custom domains + vercel.app

### CI/CD Pipeline
```
Git Push → GitHub → Vercel Webhook
  → Build (`npm run build`)
  → Test (eslint, type-check)
  → Deploy (Production ou Preview)
  → CDN propagation (∼30s)
```

## Performance

### Optimisations
- Code splitting automatique (Vite)
- Image optimization (Vercel Image Optimization)
- CSS purging (Tailwind)
- Tree-shaking (ES modules)
- Caching headers configurés

### Web Vitals
- Core Web Vitals monitoring via Vercel Analytics
- Real User Monitoring (RUM)
- Edge function analytics

## Sécurité

### Best Practices
- ✅ HTTPS/TLS automatique (Vercel)
- ✅ Environment variables encryptées
- ✅ RLS policies sur Supabase
- ✅ Input validation (Zod)
- ✅ CORS configuré
- ✅ Rate limiting (edge)
- ✅ Content Security Policy headers

## Monitoring

### Logs
```bash
vercel logs --prod          # Production logs
vercel logs --tail          # Stream logs
```

### Analytics
- Vercel Web Analytics
- Custom event tracking
- Error tracking

### Alertes
- Email notifications
- Slack integration (optionnel)

---

**Dernière mise à jour**: 2026-06-18
