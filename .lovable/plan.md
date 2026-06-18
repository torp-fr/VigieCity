
# VigieCity — Plan de développement

Application mobile de sécurité de proximité reliant habitants, voisins vigilants et services de la commune. Modèle : **gratuit citoyens, abonnement collectivités** (SaaS B2G).

Note techno : Lovable génère des **web apps responsive (PWA)** installables sur mobile, pas des apps natives iOS/Android. Pour une vraie app au Play Store / App Store, il faudra une étape Capacitor/wrapper après le MVP web. Le plan ci-dessous est conçu pour fonctionner en PWA d'abord, puis être packagée.

---

## 1. Audit produit & cibles

**Utilisateurs**
- **Citoyen / voisin vigilant** : usage simple, rapide, peu de friction, anonymat possible sur certains signalements.
- **Mairie / police municipale** : back-office de supervision, modération, statistiques, diffusion d'alertes officielles.
- **Admin VigieCity (nous)** : gestion des collectivités clientes, facturation, support.

**Principes UX non-négociables**
- Bouton SOS accessible en 1 tap depuis l'écran d'accueil.
- Appels d'urgence en 2 taps max, sans authentification requise.
- Onboarding < 60 secondes (code postal + n° de tel suffit).
- Mode "sans compte" pour numéros d'urgence (vital).
- Accessibilité : gros boutons, contraste élevé, mode senior.

---

## 2. Fonctionnalités MVP (V1)

### Côté citoyen (app mobile / PWA)
1. **Annuaire d'urgences géolocalisé** — appels en 1 tap : 17, 18, 15, 112, 114, 119, + numéros locaux injectés par la mairie (police municipale, garde champêtre, mairie, astreinte technique, vétérinaire de garde, etc.).
2. **Bouton SOS** — alerte la police municipale + contacts de confiance préalablement choisis (3 max) avec géolocalisation, déclenchement enregistrement audio 30s, possibilité d'annuler avec code PIN (anti-fausse alerte).
3. **Signalement d'évènement** avec catégories : véhicule suspect, rôdeur, incivilité, dégradation, accident, animal errant/dangereux, éclairage HS, dépôt sauvage, autre.
   - Photo / courte vidéo (15s max) / note vocale / texte.
   - Géoloc auto (modifiable, possibilité de flouter l'adresse exacte).
   - Niveau d'urgence (info / vigilance / urgent).
   - Envoi anonyme possible (mais traçable côté admin pour usage légal).
4. **Fil de quartier** — voir les signalements publiés/validés autour de soi (rayon paramétrable 200m–5km), avec modération mairie.
5. **Alertes diffusées par la mairie** — push notifications ciblées par zone (ex : cambriolage signalé rue X, alerte météo, recherche personne disparue).
6. **Témoin potentiel** — quand un signalement est posté, les utilisateurs dans la zone à l'heure des faits reçoivent un appel à témoin discret.
7. **Profil léger** : tel, adresse approximative (quartier), contacts de confiance, statut "voisin vigilant" (opt-in validé par la mairie).

### Côté collectivité (back-office web)
1. Tableau de bord : carte temps réel des signalements, file d'attente de modération.
2. Traitement d'un signalement : valider / classer / transférer à la gendarmerie / archiver / contacter l'auteur.
3. Diffusion d'alertes ciblées (dessin de zone sur carte + message + push).
4. Gestion de l'annuaire local (numéros, horaires).
5. Statistiques : volume, types, zones chaudes, temps de traitement, export PDF mensuel.
6. Gestion des comptes "voisin vigilant" référents.
7. Communication descendante : actualités sécurité, conseils prévention.

### Côté admin SaaS
- Gestion des collectivités clientes, abonnements, périmètres géographiques.

---

## 3. Fonctionnalités V2 (post-MVP)

- Intégration gendarmerie nationale (passerelle "Ma Sécurité"/pré-plainte en ligne).
- Mode marche sécurisée (partage de trajet temps réel avec un proche).
- Réseau "voisins vigilants" formalisé avec référents de rue.
- Module dédié commerçants (alerte braquage discrète).
- Géoclôture domicile : alerte si activité inhabituelle pendant les vacances déclarées.
- IA de pré-modération (filtrage doublons, contenu inapproprié, classification auto).
- Chiffrement E2E des preuves médias avec horodatage qualifié (valeur probatoire).
- Statistiques publiques anonymisées pour les citoyens (transparence).

---

## 4. Conformité & juridique (CRITIQUE — à cadrer avant dev)

- **RGPD** : DPO, registre des traitements, base légale (mission d'intérêt public pour la collectivité), durée de conservation courte (90 jours pour preuves non exploitées), droit à l'effacement.
- **CNIL** : consultation recommandée, analyse d'impact (AIPD) obligatoire vu la nature des données.
- **Diffamation / présomption d'innocence** : pas de publication de plaque, visage, nom dans le fil public — flouter automatiquement.
- **Pas de substitution aux services de secours** : disclaimers explicites, le 17/18/112 reste prioritaire.
- **Mentions légales, CGU citoyen, CGU collectivité, politique de confidentialité**.
- **Hébergement** : données en France/UE (Lovable Cloud = Supabase EU OK).

---

## 5. Architecture technique

```text
┌─────────────────────┐      ┌─────────────────────┐
│  App citoyen (PWA)  │      │ Back-office mairie  │
│  React + Tailwind   │      │  React + Tailwind   │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           └────────────┬───────────────┘
                        │
              ┌─────────▼──────────┐
              │  TanStack Start    │
              │  Server Functions  │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │   Lovable Cloud    │
              │ Postgres + Auth +  │
              │ Storage + Realtime │
              └────────────────────┘
```

- **Frontend** : TanStack Start (PWA), Tailwind, shadcn.
- **Backend** : Lovable Cloud (Postgres, Auth, Storage pour médias, Realtime pour la carte live).
- **Push notifications** : Web Push API (PWA) puis FCM/APNs quand wrappé Capacitor.
- **Géoloc & carte** : MapLibre + tiles OpenStreetMap (gratuit, RGPD-friendly).
- **Paiement collectivités** : Stripe (facturation annuelle, marchés publics → devis + bon de commande hors-app souvent).

### Schéma de données (tables principales)

- `profiles` (user_id, phone, district_id, role)
- `user_roles` (table séparée — pattern sécurité)
- `collectivities` (id, name, insee, subscription_status, perimeter_geojson)
- `emergency_contacts` (collectivity_id, label, phone, category, hours)
- `reports` (id, user_id, collectivity_id, category, severity, lat, lng, description, status, created_at)
- `report_media` (report_id, storage_path, type, hash)
- `alerts` (collectivity_id, zone_geojson, message, severity, expires_at)
- `trusted_contacts` (user_id, contact_phone, name)
- `sos_events` (user_id, lat, lng, audio_path, resolved_at)
- `audit_log` (acteur, action, cible, timestamp)

RLS strict : un citoyen ne voit que ses propres signalements + ceux publiés modérés de sa zone. Mairie ne voit que sa collectivité.

---

## 6. Modèle économique

- **Abonnement collectivité** indexé sur la population :
  - < 5 000 hab : 150 €/mois
  - 5 000–20 000 : 400 €/mois
  - 20 000–100 000 : 1 200 €/mois
  - \> 100 000 : sur devis
- **Setup fee** une fois : 500–2 000 € (paramétrage, formation agents).
- **Options** : module commerçants, intégration vidéoprotection, statistiques avancées.
- **Gratuit total pour le citoyen**, sans publicité, sans revente de données (argument commercial fort).

---

## 7. Roadmap proposée

| Phase | Durée | Livrable |
|---|---|---|
| **Phase 0** — Cadrage juridique + maquettes | 2 sem | AIPD démarrée, wireframes validés |
| **Phase 1** — MVP citoyen | 3 sem | Annuaire urgences, SOS, signalement, fil de quartier |
| **Phase 2** — Back-office mairie | 3 sem | Modération, alertes, stats |
| **Phase 3** — Pilote ville test | 4 sem | Déploiement 1 commune partenaire, ajustements |
| **Phase 4** — Packaging Capacitor + stores | 2 sem | Apps iOS/Android |
| **Phase 5** — Commercialisation | continu | Démarchage AMF, salons collectivités |

---

## 8. Risques & points d'attention

- **Fausses alertes** → PIN d'annulation SOS, modération mairie, score de confiance utilisateur.
- **Dérive délation / fichage** → catégories cadrées, pas de champ libre sur les personnes, modération obligatoire avant publication.
- **Dépendance opérateur mobile** (push, SMS de secours) → prévoir fallback SMS via Twilio.
- **Marchés publics** : cycle de vente long (6–18 mois), prévoir trésorerie.
- **Responsabilité** : bien marquer que l'app ne remplace JAMAIS le 17/18/112.

---

## Prochaines étapes proposées

1. Valider ce plan / ajuster le scope MVP.
2. Choisir une direction visuelle (institutionnel rassurant type bleu/blanc, ou plus moderne ?).
3. Lancer la Phase 1 : je peux commencer par scaffolder l'app citoyen avec annuaire d'urgences + bouton SOS + écran de signalement, avec Lovable Cloud activé pour Auth + DB + Storage des médias.

Dis-moi si tu veux ajuster le périmètre, prioriser différemment, ou si je démarre direct sur le MVP.
