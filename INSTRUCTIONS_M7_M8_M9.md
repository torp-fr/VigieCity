# Livraison M7 + M8 + M9 — Urgences · Météo · Radio

## Ce que cette livraison apporte

| Module | Fonctionnalité |
|--------|----------------|
| **M7** | Page `/urgences` avec 17 numéros nationaux seedés + contacts locaux configurables depuis l'admin |
| **M8** | Widget météo sur l'accueil (`/`) — géolocalisation + Open-Meteo API (gratuit, sans clé) |
| **M9** | Player radio embarqué : `/radio`, mini-player persistant au-dessus de la BottomNav, singleton audio |

---

## Étapes de déploiement

### 1. Migration SQL

Appliquer la migration (tables + RLS + seed des contacts nationaux et radios nationales) :

```bash
cd C:\Users\Baptiste-\VigieCity
supabase db push --project-ref xfhkngecpbvmlstjymfy
```

> Ou via le dashboard Supabase → SQL Editor → coller le contenu de
> `_delivery/supabase/migrations/20260620000006_emergency_contacts_radio.sql`

### 2. Copier les fichiers _delivery

Depuis `C:\Users\Baptiste-\VigieCity\` :

```powershell
Copy-Item -Recurse ".\Vigie_City\_delivery\*" "." -Force
```

Cela écrasera/créera :

```
src/
  lib/radio.ts                    ← singleton audio (nouveau)
  hooks/useRadio.ts               ← hook React (nouveau)
  components/MiniRadioPlayer.tsx  ← mini-player persistant (nouveau)
  routes/
    __root.tsx                    ← MiniRadioPlayer ajouté au-dessus de BottomNav
    index.tsx                     ← accueil avec widget météo + bannière radio
    urgences.tsx                  ← page numéros d'urgence (nouveau)
    radio.tsx                     ← page radio complète (nouveau)
    admin/
      index.tsx                   ← lien "Radio locale" ajouté
      radio.tsx                   ← config radios locales (nouveau)
      urgences.tsx                ← config contacts urgences locaux (nouveau)
  routeTree.gen.ts                ← /radio + /admin/radio ajoutés
```

### 3. Vérifications

```bash
cd C:\Users\Baptiste-\VigieCity
npm run build     # Doit passer sans erreur TypeScript
npm run dev       # Test local
```

Pages à tester :
- `/` → widget météo en haut à droite du hero (autorise la géolocalisation)
- `/urgences` → liste des 17 numéros nationaux + contacts locaux (si configurés)
- `/radio` → player avec France Info, France Bleu, etc.
- Lancer une radio → mini-player apparaît au-dessus de la BottomNav, persiste sur toutes les pages
- `/admin/radio` → ajouter/modifier/supprimer des radios locales
- `/admin/urgences` → ajouter/modifier/supprimer des contacts d'urgence locaux

---

## Notes techniques

### Météo (Open-Meteo)
- API gratuite, pas de clé requise
- Endpoint : `https://api.open-meteo.com/v1/forecast?latitude=LAT&longitude=LNG&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`
- Cache 5 minutes (staleTime TanStack Query)
- Geolocation : `navigator.geolocation.getCurrentPosition()` avec timeout 8s et cache 5min
- Si géoloc refusée → widget masqué silencieusement

### Radio (singleton audio)
- `src/lib/radio.ts` : instance `HTMLAudioElement` module-level, survit aux navigations
- Pattern subscriber : `radio.subscribe(cb)` → retourne un `unsub`
- `useRadio()` hook : s'abonne au singleton, expose `{ station, playing, loading, error, play, pause, toggle, stop }`
- Volume : contrôlé via `audio.volume` directement (pas d'état React)

### MiniRadioPlayer
- Injecté dans `__root.tsx` entre `<main>` et `<BottomNav />`
- Ne s'affiche que si `station !== null`
- Cliquable → navigue vers `/radio`
- Masqué sur les routes HIDE_NAV_PREFIXES (admin, plateforme, auth…)

### Contacts urgences
- Table `emergency_contacts` : `is_national = true` pour les 17 numéros seedés
- RLS : citoyens voient `is_national=true` OU `collectivity_id = leur commune`
- Admins : CRUD uniquement sur leur commune (`is_national = false`)

### Radios
- Table `radio_streams` : `collectivity_id IS NULL` = nationales (seedées), sinon locale
- Les 8 nationales sont seedées et visibles par tous
- Admin peut ajouter des flux locaux avec logo, ordre, activation
