# VigieCity — Plan d'Enrichissement Session 5+
*Généré le 20/06/2026 — Confidentiel*

---

## 0. Session 5 Technique (rappel)

Avant toute nouvelle feature, deux tâches bloquantes :

| # | Tâche | Commande |
|---|---|---|
| 5.1 | Migration SQL `plans` + `intercommunal_pricing` | STOP → confirmation requise |
| 5.2 | Régénération des types Supabase | `supabase gen types typescript --project-id xfhkngecpbvmlstjymfy > src/integrations/supabase/types.ts` |

Les `as any` restants dans le code seront supprimés après 5.2.

---

## 1. Inventaire des Features Citoyens — Vision Complète

### 1.1 Feature Map

| ID | Feature | Catégorie | Complexité | Priorité |
|----|---------|-----------|-----------|---------|
| F-01 | App stores (Android + iOS) — publication + config | Distribution | Haute | 🔴 P0 |
| F-02 | Onboarding citoyen — adresse → commune auto-détectée | UX/Data | Moyenne | 🔴 P0 |
| F-03 | Chargement auto des données commune (adhérente) | Data | Faible | 🔴 P0 |
| F-04 | Services locaux — CTA pictos personnalisables par la mairie | Admin | Moyenne | 🟠 P1 |
| F-05 | Formulaire tranquillité vacances | Civique | Haute | 🟠 P1 |
| F-06 | Fil d'actualités national/régional via pg-cron | Média | Haute | 🟠 P1 |
| F-07 | Radio in-app | Média | Haute | 🟡 P2 |
| F-08 | Récupération de mot de passe | Auth | Faible | 🔴 P0 |
| F-09 | Workflow événement → service (réception/traitement/archivage) | Process | Haute | 🟠 P1 |
| F-10 | Messagerie bidirectionnelle citoyen ↔ service | Messaging | Haute | 🟠 P1 |
| F-11 | Notifications push (confirmation prise en charge) | Messaging | Moyenne | 🟠 P1 |

---

## 2. Legal Risk Assessment

*Cadre : RGPD (UE 2016/679) · Loi Informatique et Libertés · CNIL · Loi n° 2019-775 (droits voisins presse)*

---

### RISK #1 — Formulaire tranquillité vacances + photos domicile 🔴 CRITIQUE

**Score : 20/25 (Sévérité 5 × Probabilité 4)**

**Risques** :
1. **RGPD Art. 6 — Base légale** : transmission à la police = mission service public à documenter dans délibération de la collectivité
2. **Photos domicile = données personnelles sensibles** : stockage chiffré obligatoire, accès strictement limité
3. **Durée de conservation** : suppression automatique obligatoire J+1 après date de retour (pg-cron)
4. **DPIA obligatoire** (Art. 35 RGPD) : traitement à risque élevé → Analyse d'Impact avant tout déploiement
5. **DPA (Data Processing Agreement)** : VigieCity = sous-traitant → DPA requis avec chaque collectivité

**Mitigations** :
- ✅ DPIA réalisée avant développement
- ✅ Consentement explicite et granulaire (photos optionnelles)
- ✅ Suppression automatique pg-cron post-retour
- ✅ Chiffrement AES-256 des photos en Storage
- ✅ Accès police via lien sécurisé temporaire (token)
- ✅ Mentions légales dédiées dans l'app

**Résidu après mitigations : ORANGE (12) — acceptable avec DPIA validée**

---

### RISK #2 — Fil d'actualités agrégé 🔴 → 🟡 (après mitigation)

**Score initial : 16/25 (Sévérité 4 × Probabilité 4)**

**Risques** :
- Droits voisins de la presse (Loi 2019-775) : reproduction de snippets illégale sans accord éditeurs
- Droit d'auteur : tout extrait reproduit = contrefaçon possible

**Solution ✅** : Utiliser NewsAPI.org (free: 100 req/jour) ou MediaStack — afficher UNIQUEMENT titre + source + lien vers l'article original. Aucune reproduction de contenu. **Résidu : VERT (4).**

---

### RISK #3 — Radio in-app 🟠 → 🟢 (après mitigation)

**Score initial : 15/25 (Sévérité 3 × Probabilité 5)**

**Solution ✅** : Flux HLS officiels des radios publiques uniquement (`<audio>` HTML5) — aucune licence requise car la radio a déjà payé ses droits pour la diffusion web. Exemples :
- France Inter : `https://direct.franceinter.fr/live/franceinter-midfi.mp3`
- France Info : `https://direct.francetvinfo.fr/live/franceinfo.mp3`
- France Culture : `https://direct.franceculture.fr/live/franceculture-midfi.mp3`

**Résidu : VERT (4). Coût : 0 €.**

---

### RISK #4 — Messagerie citoyens ↔ services 🟡 MOYEN (9/25)

Mitigations : politique de conservation 3 ans documentée + TTL automatique + mentions dans CGU.

---

### RISK #5 — Notifications push 🟢 VERT (4/25)

Opt-in natif iOS/Android + désabonnement dans profil. Aucune action supplémentaire.

---

### Tableau Synthèse Légale

| Feature | Score | Niveau | Action |
|---|---|---|---|
| Vacances + photos | 20 | 🔴 ROUGE | **DPIA avant déploiement** |
| Fil actualités | 16 → 4 | 🔴→🟢 | API tiers + titre seul + lien |
| Radio in-app | 15 → 4 | 🟠→🟢 | Radios publiques flux HLS |
| Messagerie | 9 | 🟡 JAUNE | Politique conservation + CGU |
| Notifications | 4 | 🟢 VERT | Opt-in standard |
| Password reset | 1 | 🟢 VERT | Natif Supabase Auth |

---

## 3. Architecture Information App Citoyen

### 3.1 Navigation Bar (5 onglets)

```
Tab 1 — Accueil      /
Tab 2 — Actualités   /actualites
Tab 3 — Services     /services
Tab 4 — Messagerie   /messagerie      [NOUVEAU]
Tab 5 — Profil       /profil          [NOUVEAU]
```

### 3.2 Hiérarchie Complète

```
/ (Accueil)
├── SosButton (composant)
├── Alertes actives (composant)
└── Raccourcis rapides (composant)

/actualites
├── Tab Commune     → Publications mairie (existant)
├── Tab National    → Fil news pg-cron (NOUVEAU)
└── Tab Régional    → Fil news régional (NOUVEAU)

/services
├── /services                    → Grille CTA pictos mairie (NOUVEAU)
│   ├── Numéros pratiques
│   ├── Médecin / Pharmacie de garde
│   ├── Déchetterie / horaires
│   ├── Démarches administratives
│   └── [CTAs personnalisés par la mairie]
├── /services/urgences           → Contacts urgence (actuel)
└── /services/vacances           → Formulaire tranquillité (NOUVEAU, post-DPIA)
    ├── Étape 1 : Dates absence
    ├── Étape 2 : Infos domicile
    ├── Étape 3 : Photos fermetures (opt-in)
    ├── Étape 4 : Consentement RGPD explicite
    └── Étape 5 : Confirmation + référence dossier

/messagerie
├── /messagerie                  → Liste conversations (NOUVEAU)
├── /messagerie/:threadId        → Thread (NOUVEAU)
└── /messagerie/nouveau          → Nouveau message → choisir service

/profil
├── /profil                      → Infos + commune (NOUVEAU)
├── /profil/notifications        → Préférences push
├── /profil/securite             → Changer mot de passe
└── /profil/rgpd                 → Mes données + droit effacement

/auth
├── /auth                        → Login (existant)
├── /auth/register               → Inscription (existant)
├── /auth/forgot-password        → Saisie email (NOUVEAU — F-08)
└── /auth/reset-password         → Reset via lien Supabase (NOUVEAU)
```

### 3.3 Panel Admin (ajouts)

```
/admin
├── /admin/publications          → (existant)
├── /admin/urgences              → (existant)
├── /admin/services              → NOUVEAU — Gérer CTA pictos
│   ├── Bibliothèque pictogrammes (Lucide + emojis)
│   ├── Créer CTA (picto + couleur HEX + libellé + action)
│   └── Réordonner l'affichage
├── /admin/messagerie            → NOUVEAU — Réception messages citoyens
│   ├── Entrants (non lus / en cours / archivés)
│   └── Thread par citoyen avec statuts
├── /admin/actualites-feed       → NOUVEAU — Toggle fil national/régional
└── /admin/vacances              → NOUVEAU — Dossiers tranquillité
    ├── Liste déclarations actives
    ├── Export PDF pour la police
    └── Archivage automatique post-retour
```

---

## 4. Nouvelles Tables SQL

### `news_articles`
```sql
CREATE TABLE news_articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  source_name  TEXT NOT NULL,
  source_url   TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  category     TEXT NOT NULL,     -- national | regional
  region_code  TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
-- pg-cron nettoyage > 48h :
-- DELETE FROM news_articles WHERE published_at < now() - interval '48 hours'
```

### `commune_news_settings`
```sql
CREATE TABLE commune_news_settings (
  collectivity_id UUID PRIMARY KEY REFERENCES collectivities(id),
  show_national   BOOLEAN DEFAULT true,
  show_regional   BOOLEAN DEFAULT true,
  radio_streams   JSONB DEFAULT '[]',   -- [{name, url}]
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### `service_ctas`
```sql
CREATE TABLE service_ctas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID NOT NULL REFERENCES collectivities(id),
  label           TEXT NOT NULL,
  icon_name       TEXT,              -- nom icône Lucide
  icon_emoji      TEXT,              -- fallback emoji
  color_bg        TEXT DEFAULT '#3B82F6',
  color_text      TEXT DEFAULT '#FFFFFF',
  action_type     TEXT NOT NULL,     -- tel | url | internal | mail
  action_value    TEXT NOT NULL,
  position        INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `message_threads` + `messages`
```sql
CREATE TABLE message_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID NOT NULL REFERENCES collectivities(id),
  citizen_id      UUID NOT NULL REFERENCES auth.users(id),
  subject         TEXT,
  status          TEXT DEFAULT 'open',  -- open | processing | resolved | archived
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id),
  sender_id   UUID NOT NULL REFERENCES auth.users(id),
  sender_type TEXT NOT NULL,  -- citizen | moderator
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ    -- suppression RGPD auto (3 ans)
);
```

### `holiday_declarations`
```sql
CREATE TABLE holiday_declarations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  collectivity_id  UUID NOT NULL REFERENCES collectivities(id),
  departure_date   DATE NOT NULL,
  return_date      DATE NOT NULL,
  address          TEXT NOT NULL,
  notes            TEXT,
  photo_paths      TEXT[],
  status           TEXT DEFAULT 'active',  -- active | expired | cancelled
  police_notified  BOOLEAN DEFAULT false,
  consent_given    BOOLEAN NOT NULL,
  consent_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  expires_at       TIMESTAMPTZ,  -- return_date + 1 day (pg-cron suppression auto)
  CONSTRAINT check_dates   CHECK (return_date > departure_date),
  CONSTRAINT check_consent CHECK (consent_given = true)
);
ALTER TABLE holiday_declarations ENABLE ROW LEVEL SECURITY;
```

---

## 5. Architecture Technique — Résumé

| Feature | Techno | Coût |
|---|---|---|
| Fil actualités | NewsAPI.org free + Edge Fn + pg-cron | 0 € |
| Radio | `<audio>` HTML5 + flux HLS public | 0 € |
| Messagerie | Supabase Realtime + tables messages | 0 € |
| Notifications push | Web Push API (Service Worker) | 0 € |
| Onboarding commune | api-adresse.data.gouv.fr (gratuit, illimité) | 0 € |
| CTA pictos | Lucide Icons (déjà intégré) + color picker | 0 € |
| App native (futur) | Capacitor.js (open source) | 25$+99$/an stores |
| Password reset | Supabase Auth natif (déjà configuré) | 0 € |

---

## 6. Roadmap Sessions

| Session | Features | Effort |
|---|---|---|
| **5** | Migrations plans/intercommunal_pricing + regen types + F-08 password reset | ~3h |
| **6** | F-06 fil actualités (NewsAPI + pg-cron) + F-07 radio + toggle admin | ~6h |
| **7** | F-04 CTA pictos admin/citoyen + F-02/F-03 onboarding commune auto | ~6h |
| **8** | F-09/F-10 messagerie Realtime + F-11 notifications push | ~8h |
| **9** | F-05 formulaire vacances (APRÈS DPIA validée) | ~6h |
| **10** | F-01 distribution app stores (PWA → Capacitor) | ~1j |

---

## 7. Checklist RGPD VigieCity

- [ ] DPD/DPO désigné
- [ ] Registre des traitements mis à jour (Art. 30)
- [ ] DPA fourni à chaque collectivité adhérente
- [ ] **DPIA réalisée pour la feature vacances avant développement**
- [ ] Politique de conservation des messages documentée (3 ans)
- [ ] Suppression automatique données vacances pg-cron
- [ ] Opt-in push notifications
- [ ] Droit d'accès/rectification/effacement dans `/profil/rgpd`

---

*À valider avec un juriste RGPD spécialisé secteur public avant déploiement des features à risque élevé*
