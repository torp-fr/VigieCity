# VigieCity — Audit Complet, Roadmap & Plan Marketing
**Date :** 21 juin 2026 | **Préparé par :** Claude (CRBR Group)
**Statut :** Document de travail interne — Non diffusable

---

## PARTIE 1 — ÉTAT DES LIEUX : CE QUI EST CONSTRUIT

### 1.1 Application Citoyenne (PWA mobile-first)

| Route | Page | Statut | Notes |
|---|---|---|---|
| `/landing` | Landing marketing | ✅ Live | CTA inscription |
| `/onboarding` | Sélection commune | ✅ Live | Recherche INSEE |
| `/auth` | Connexion / Inscription | ✅ Live | Email + reset |
| `/forgot-password` | Mot de passe oublié | ✅ Live | Resend email |
| `/reset-password` | Nouveau mot de passe | ✅ Live | Token Supabase |
| `/accueil` | Fil d'actualité citoyen | ✅ Live | RSS + signalements |
| `/actualites` | Actualités commune | ✅ Live | Articles RSS |
| `/carte` | Carte interactive | ✅ Live | Leaflet / signalements |
| `/signaler` | Formulaire signalement | ✅ Live | Photo + géoloc |
| `/mes-signalements` | Historique perso | ✅ Live | Filtres statut |
| `/messagerie` | Messagerie | ✅ Scaffold | UX présente, pas temps réel |
| `/services` | Services locaux | ✅ Live | CRUD depuis admin |
| `/urgences` | Numéros d'urgence | ✅ Live | SAMU, pompiers, etc. |
| `/radio` | Radio locale | ✅ Live | MiniRadioPlayer persistant |

**Composants transversaux :**
- `BottomNav` — navigation mobile 5 onglets ✅
- `SosButton` — bouton SOS floating ✅
- `PWAInstallBanner` — invite installation ✅
- `NotificationBanner` — alertes push ✅
- `MiniRadioPlayer` — player persistant entre pages ✅

**État général App Citoyenne : 80% fonctionnel.** Les pages existent et sont accessibles. La messagerie temps réel et les notifications push end-to-end restent à finaliser.

---

### 1.2 Panel Admin Commune & Intercommunalité (sidebar verte)

| Route | Page | Statut | Notes |
|---|---|---|---|
| `/admin/login` | Connexion admin | ✅ Live | + mot de passe oublié inline |
| `/admin/reset-password` | Réinit. mot de passe | ✅ Live | Magic link Supabase |
| `/admin` | Tableau de bord | ✅ Live | KPIs commune |
| `/admin/settings` | Paramètres + mdp | ✅ Live | Changement password |
| `/admin/analytics` | Analytics commune | ✅ Live | PostHog + Supabase |
| `/admin/signalements` | Gestion signalements | ✅ Live | CRUD, statut, assignation |
| `/admin/publications` | Publications | ✅ Scaffold | Structure présente |
| `/admin/evenements` | Événements | ✅ Scaffold | Structure présente |
| `/admin/messagerie` | Messagerie admin | ✅ Scaffold | Structure présente |
| `/admin/services` | Gestion services | ✅ Live | CRUD services locaux |
| `/admin/urgences` | Numéros d'urgence | ✅ Live | CRUD numéros |
| `/admin/radio` | Radio locale | ✅ Live | Gestion flux ARIA |
| `/admin/alertes` | Alertes | ✅ Scaffold | Structure présente |
| `/admin/epci` | Intercommunalité | ✅ Live | Visib. interco_admin+ |
| `/admin/terrain` | Mode terrain agents | ✅ Live | TerrainShell dédié |
| `/admin/terrain/traites` | Signalements traités | ✅ Live | Vue agents terrain |

**Rôles gérés :**
- `commune_admin` → accès `/admin`, 12 pages opérables
- `interco_admin` → idem + onglet EPCI
- `super_admin` → redirigé vers `/platform`

**État général Admin : 70% fonctionnel.** Dashboard, signalements, services, urgences, radio, analytics, terrain = opérationnels. Publications, événements, messagerie, alertes = interfaces présentes mais logique métier à compléter.

---

### 1.3 Panel Platform (Dev & Support — sidebar bleue)

| Route | Page | Statut | Notes |
|---|---|---|---|
| `/platform` | Tableau de bord global | ✅ Live | KPIs plateforme |
| `/platform/analytics` | Analytics + carte Leaflet | ✅ Live | PostHog + géo régions |
| `/platform/collectivites` | CRM communes | ✅ Live | Pagination, filtres, modal édition |
| `/platform/users` | Gestion utilisateurs | ✅ Live | Vue globale profils |
| `/platform/plans` | Plans tarifaires | ✅ Live | CRUD complet |
| `/platform/tarification` | Tarif intercommunal | ✅ Live | Tranches communes/prix |
| `/platform/rss` | Sources RSS | ✅ Live | CRUD sources + cron |
| `/platform/knowledge` | Base de connaissances | ✅ Live | Articles internes |
| `/platform/modules` | Modules features | ✅ Live | Activation par commune |
| `/platform/publishers` | Éditeurs contenu | ✅ Live | Gestion partenaires |
| `/platform/onboarding` | Onboarding communes | ✅ Live | Suivi activation |
| `/platform/retention` | Rétention | ✅ Live | Métriques fidélisation |
| `/platform/settings` | Paramètres plateforme | ✅ Live | Config RSS, KPIs live |

**État général Platform : 85% fonctionnel.** Panel le plus mature. CRM, plans, analytics, RSS = entièrement opérationnels.

---

### 1.4 Infrastructure & Services Backend

| Service | État | Détails |
|---|---|---|
| **Supabase DB** | ✅ Live | Tables : profiles, collectivities, reports, news_articles, services, urgences, events, publications, push_notifications_log, user_roles |
| **RLS Policies** | ✅ Live | Isolation par collectivity_id, rôles EPCI, super_admin bypass |
| **EF send-email** | ✅ ACTIVE | Resend, 5 templates HTML inline, FROM noreply@vigiecity.fr |
| **EF brave-news-fetch** | ✅ ACTIVE | Brave Search API, 20 communes/run, déduplique par URL |
| **EF posthog-query** | ✅ ACTIVE | Proxy HogQL, 7 presets, filtre par collectivity_id |
| **EF create-commune** | ✅ ACTIVE | Création commune depuis platform |
| **EF send-push** | ✅ ACTIVE | Push notifications VAPID |
| **EF vapid-key** | ✅ ACTIVE | Génération clé VAPID |
| **RSS Cron** | ✅ ACTIVE | pg_cron toutes les heures, 4 sources actives, 89+ articles |
| **PostHog EU** | ✅ ACTIVE | Tracking live, identify par commune, RGPD-compliant |
| **Resend** | ✅ ACTIVE | Domaine vigiecity.fr vérifié DNS |
| **Vercel** | ✅ ACTIVE | vigiecity.fr, builds auto depuis git |
| **Script import INSEE** | ✅ Prêt | `scripts/import_mairies_zip.py`, à exécuter |

---

## PARTIE 2 — ROADMAP AVANT LANCEMENT COMMERCIAL

### 🔴 CRITIQUE — Bloquant pour prospecter

#### C1. Application mobile native (Capacitor)
**Statut :** Non démarré  
**Pourquoi bloquant :** La PWA est fonctionnelle mais une commune ne signera pas un contrat pour "une page web". Il faut un app store presence (App Store + Google Play).  
**Travail :** Intégrer Capacitor.js dans le projet Vite, configurer iOS/Android builds, tester sur devices, soumettre aux stores.  
**Estimation :** 2-3 sessions.

#### C2. Templates email visuels (chantier Resend)
**Statut :** Planifié (mémoire projet)  
**Pourquoi bloquant :** Les emails actuels sont du HTML inline brut, non personnalisés par commune. Un email de bienvenue générique réduit la confiance.  
**Travail :** Brief → Claude Design → templates visuels → intégration Resend native → mise à jour EF.  
**Estimation :** 1 session de design + 1 session d'intégration.

#### C3. White-label par commune
**Statut :** Non démarré  
**Pourquoi bloquant :** Chaque commune doit voir son logo et ses couleurs dans l'app et les emails.  
**Travail :** Champ logo/couleur dans collectivities, CSS variables dynamiques injectées au runtime, logo dans emails.  
**Estimation :** 1 session.

#### C4. Import données communes (INSEE)
**Statut :** Script prêt, pas encore exécuté  
**Pourquoi bloquant :** La table collectivities ne contient que quelques communes de test. Sans données réelles, impossible de démo.  
**Travail :** Télécharger le ZIP INSEE mairies-france-population, exécuter `python scripts/import_mairies_zip.py`.  
**Estimation :** 30 minutes (manuel, Baptiste).

#### C5. Invitation admin commune (flow complet)
**Statut :** Non démarré  
**Pourquoi bloquant :** Actuellement, un admin commune doit être créé manuellement dans Supabase. Il faut un flow : platform → envoie email invitation → maire clique → crée son compte → configuré.  
**Travail :** Page platform "Inviter une commune", EF qui envoie l'email, page `/admin/accept-invite` côté commune.  
**Estimation :** 1 session.

#### C6. Pages légales RGPD
**Statut :** Routes `/mentions-legales` et `/confidentialite` existent dans `SKIP_ONBOARDING_ROUTES` mais contenu à vérifier  
**Pourquoi bloquant :** Obligations légales françaises. Sans CGU et politique de confidentialité complètes, l'app ne peut pas être soumise aux stores ni utilisée en production.  
**Travail :** Rédaction CGU, politique de confidentialité, mentions légales — conformes RGPD et loi Informatique et Libertés.  
**Estimation :** Rédaction légale externe recommandée.

---

### 🟡 IMPORTANT — Avant prospection sérieuse

#### I1. Push notifications end-to-end
**Statut :** EF déployées, non testées en conditions réelles  
**Travail :** Test complet : inscription VAPID → stockage → envoi depuis admin → réception sur mobile.

#### I2. Messagerie temps réel
**Statut :** UI présente, pas de Supabase Realtime  
**Travail :** `supabase.channel()` subscriptions, notifications en temps réel citoyen↔commune.

#### I3. Admin — pages scaffold à compléter
Pages avec interface mais logique métier incomplète :
- `/admin/publications` : éditeur de contenu, scheduling
- `/admin/evenements` : CRUD événements avec dates, lieu, capacité
- `/admin/messagerie` : fil de discussion par citoyen
- `/admin/alertes` : diffusion masse SMS/push/email

#### I4. Paiement Stripe (abonnements communes)
**Statut :** Non démarré  
**Travail :** Intégrer Stripe, créer les products/prices correspondant aux plans tarifaires, webhook Supabase → activation commune.

#### I5. Landing page dédiée acquisition communes
**Statut :** Landing citoyenne existe, pas de page B2B/communes  
**Travail :** Page `vigiecity.fr/communes` avec démo, pricing, témoignages, CTA "Demander une démo".

#### I6. Performance & PWA offline
**Statut :** PWA basique (install banner), pas de service worker  
**Travail :** Service Worker avec cache offline, prefetch pages critiques, skeleton loaders systématiques.

#### I7. Voisins vigilants (feature communautaire)
**Statut :** Mentionné dans les feature booleans du plan tarifaire mais pas implémenté  
**Travail :** Réseau de signalement communautaire, validation par voisins, carte partagée de quartier.

---

### 🟢 AMÉLIORATIONS — Post-lancement MVP

- Tableau de bord analytics avancé (cohortes, rétention par commune)
- API publique communes (accès programmatique aux données)
- Intégration DEMAT.FRANCE / démarches administratives
- Module budget participatif
- Consultation citoyenne / sondage
- Covoiturage / annonces locales
- Application agents de terrain dédiée (Capacitor separate build)

---

## PARTIE 3 — PLAN MARKETING VIGIECITY

### 3.1 Positionnement

**VigieCity est la plateforme citoyenne de sécurité et de proximité, conçue pour les communes françaises qui veulent digitaliser leur relation avec leurs habitants — sans DSI, sans budget IT dédié.**

Positionnement en 3 axes :
1. **Sécurité locale** — signalements, alertes, SOS, numéros d'urgence
2. **Proximité** — fil d'actualité commune, événements, services
3. **Lien citoyen↔élu** — messagerie directe, consultations, transparence

---

### 3.2 Cible marché

#### Segment primaire — Communes 500 à 15 000 habitants
- **Volume :** ~25 000 communes en France dans cette tranche
- **Profil décideur :** Maire, DGS (Directeur Général des Services), ATSEM numérique
- **Douleurs :** Facebook comme seul canal de comm, signalements par téléphone, aucun suivi citoyen, zéro analytics
- **Budget :** 50€–300€/mois selon taille, budget "numérique" souvent disponible (DETR, FNADT)

#### Segment secondaire — Intercommunalités (EPCI)
- **Volume :** ~1 250 EPCI en France
- **Profil décideur :** DGA, responsable numérique EPCI
- **Avantage VigieCity :** Panel interco natif, facturation centralisée, analytics multi-communes

#### Segment tertiaire — Syndicats intercommunaux thématiques
- Gestion des déchets, eau potable, transport local
- Cas d'usage : signalements infrastructure, alertes coupures

---

### 3.3 Proposition de valeur par persona

| Persona | Douleur | VigieCity répond |
|---|---|---|
| **Maire** | "Je ne sais pas ce que pensent mes habitants" | Dashboard analytics, signalements géolocalisés, messagerie directe |
| **DGS** | "On gère les signalements par email et cahier" | CRUD signalements, statuts, assignation, historique |
| **Citoyen actif** | "Je ne sais pas comment signaler un problème" | App mobile simple, SOS, formulaire en 3 clics |
| **Agent terrain** | "Je n'ai pas les informations à jour sur le terrain" | TerrainShell dédié, vue signalements prioritaires |
| **Élu délégué** | "Comment je suis mon quartier ?" | Filtres géographiques, notifications push |

---

### 3.4 Canaux d'acquisition

#### Phase 1 — Pre-launch (actuelle → T3 2026)
**Objectif :** 5 communes pilotes gratuites pour générer des témoignages

- **Réseau personnel CRBR Group** — communes connues de l'équipe, contacts locaux
- **Cold email maires** — séquence 3 emails, personnalisée par région, objet : "Votre commune sur VigieCity — 3 mois gratuits"
- **LinkedIn** — contenu éducatif sur la digitalisation des communes, ciblage géographique élus
- **Associations d'élus** — AMF (Association des Maires de France), AMRF (ruraux), ANPP (petites villes)

#### Phase 2 — Lancement commercial (T4 2026)
**Objectif :** 50 communes payantes

- **Salons élus** — Salon des Maires (Paris, novembre), Forum des Acteurs Publics
- **Partenariats EPCI** — 1 EPCI signée = accès à ses 15–30 communes membres
- **Programme parrainage** — commune satisfaite parraine commune voisine, 1 mois offert
- **Presse spécialisée** — LaGazette des Communes, Le Courrier des Maires, Localtis
- **CNFPT** — formations élus numériques, VigieCity comme outil de référence

#### Phase 3 — Accélération (2027)
- **Intégrateurs numériques locaux** (ESN spécialisées communes)
- **Subventions DETR/FNADT** — aider les communes à financer l'abonnement via dotations État
- **Regions numériques** — conventions avec Régions engagées dans la transition numérique
- **API partnerships** — intégration avec logiciels RH/GRC collectivités (Berger-Levrault, JVS, Cosoluce)

---

### 3.5 Modèle de revenus

| Plan | Cible | Prix/mois | Inclus |
|---|---|---|---|
| **Starter** | Communes < 1 000 hab | 49 €/mois | App citoyenne, signalements, urgences, 100 utilisateurs |
| **Commune** | 1 000–5 000 hab | 99 €/mois | Tout Starter + publications, événements, analytics, push |
| **Pro** | 5 000–15 000 hab | 199 €/mois | Tout Commune + messagerie, radio, voisins vigilants, white-label |
| **Intercommunal** | EPCI (par commune) | 79 €/commune/mois | Tout Pro + panel EPCI, facturation centralisée, API |
| **Enterprise** | >15 000 hab / Métropole | Sur devis | White-label complet, SLA, support dédié, intégrations SI |

**Facturation annuelle : -15%**
**Fonctionnalités "modules" en option :** Radio (20€/mois), Budget participatif (30€/mois), API (50€/mois)

---

### 3.6 Métriques cibles (12 mois post-lancement)

| KPI | T+3 mois | T+6 mois | T+12 mois |
|---|---|---|---|
| Communes actives | 10 | 35 | 100 |
| Citoyens inscrits | 2 000 | 10 000 | 40 000 |
| MRR | 1 500 € | 5 000 € | 15 000 € |
| Churn mensuel communes | < 5% | < 3% | < 2% |
| NPS communes | > 40 | > 50 | > 60 |

---

### 3.7 Messages marketing et revue des claims

#### Claims validés (substantiés)
✅ **"Application citoyenne de sécurité de proximité"** — Signalements, SOS, numéros urgence : fonctionnel, prouvable  
✅ **"Numéros d'urgence locaux accessibles en un clic"** — Feature live, sobre et factuelle  
✅ **"Vos actualités locales, centralisées"** — RSS pipeline opérationnel, 89+ articles indexés  
✅ **"Signalement géolocalisé en 3 clics"** — UX validée, formulaire simple  
✅ **"Analytics RGPD-compliant"** — PostHog EU (Frankfurt), `person_profiles: 'identified_only'`

#### Claims à substantier avant diffusion
⚠️ **"La plateforme citoyenne n°1 des communes"** → **À ÉVITER** : supériorité non prouvée, pas de comparatif publié. Remplacer par : *"Une nouvelle façon de connecter les communes à leurs habitants"*  
⚠️ **"Temps réel"** pour la messagerie → Pas encore implémenté. Ne pas utiliser jusqu'à la session de développement Realtime  
⚠️ **"Application mobile"** → Actuellement PWA. Préciser *"Application web mobile"* ou attendre la publication Capacitor sur les stores  
⚠️ **"Notification push instantanée"** → EF déployée mais non testée end-to-end. À valider avant de promouvoir  
⚠️ **"Conforme RGPD"** → Nécessite CGU, politique de confidentialité, DPO ou délégation, registre de traitements. Formuler : *"Conçu pour la conformité RGPD"* en attendant l'audit légal complet

#### Claims à ne jamais utiliser
❌ **"100% sécurisé"** — aucun système n'est infaillible, claim non défendable  
❌ **"Utilisé par X communes"** — avant d'avoir les chiffres réels  
❌ **"Certifié [organisme]"** — sans certification effective  
❌ **"IA intégrée"** — sauf si fonctionnalité réelle documentée

---

## PARTIE 4 — FEATURES CITOYENS : ANALYSE & ROADMAP PRODUIT

### 4.1 Features existantes (MVP actuel)

| Feature | Valeur | Adoption attendue |
|---|---|---|
| Signalement géolocalisé | Élevée — résout un vrai problème | Forte |
| Fil d'actualités commune | Élevée — remplace le bulletin papier | Forte |
| Numéros d'urgence | Élevée — utilité immédiate | Très forte (retention) |
| Carte des signalements | Moyenne — contexte quartier | Moyenne |
| Radio locale | Niché — forte valeur en zones rurales | Forte en rural |
| Services locaux | Moyenne — dépend du CRUD admin | Moyenne |

### 4.2 Features à intégrer — Priorité haute

#### F1. Notifications push personnalisées
**Impact :** Très élevé sur la rétention  
**Description :** Notifier le citoyen quand son signalement change de statut, quand une alerte est publiée par la commune, quand un événement approche  
**Dépendances :** Push EF à tester, abonnements Supabase Realtime  
**Monétisation :** Inclus Pro et +

#### F2. Voisins vigilants (réseau communautaire)
**Impact :** Très élevé — différenciant fort  
**Description :** Les citoyens peuvent créer des "rondes virtuelles", partager des observations avec leurs voisins validés, signaler des présences inhabituelles avec confidentialité protégée  
**Contraintes légales :** Encadrement strict, modération obligatoire, pas de délation anonyme, RGPD  
**Monétisation :** Module optionnel (30 €/mois), inclus Pro

#### F3. Consultation citoyenne / sondage
**Impact :** Élevé pour les élus — démo concrète de participation  
**Description :** La commune publie une question (ex: "Faut-il un nouveau banc parc Bellevue ?"), les citoyens votent, résultats visibles en temps réel  
**UX :** Carte avec options + commentaire optionnel  
**Monétisation :** Inclus Commune et +

#### F4. Agenda citoyen complet
**Impact :** Élevé — usage quotidien  
**Description :** Événements locaux (marchés, fêtes, conseils municipaux), inscriptions en ligne, rappels push, partage agenda  
**Dépendances :** `/admin/evenements` à compléter  
**Monétisation :** Inclus Commune et +

#### F5. Messagerie directe citoyen↔mairie
**Impact :** Élevé — remplace emails et appels téléphoniques  
**Description :** Thread de conversation par sujet, accusé de lecture, délai de réponse affiché, satisfaction post-résolution  
**Technique :** Supabase Realtime channels  
**Monétisation :** Inclus Pro et +

#### F6. Signalement avec suivi de progression
**Impact :** Élevé — rétention et confiance  
**Description :** Citoyen voit l'état de son signalement (reçu → en cours → résolu), peut ajouter des photos complémentaires, reçoit une notification à chaque étape  
**Exist :** Statuts existent, notifications pas encore end-to-end

### 4.3 Features à intégrer — Priorité moyenne

#### F7. Boîte à idées numérique
**Description :** Formulaire de proposition libre pour les citoyens, soumis à la commune, possibilité de voter pour les idées des autres  
**Valeur :** Participation citoyenne, soft-démocratie locale

#### F8. Carte services de proximité augmentée
**Description :** Médecins acceptant nouveaux patients, pharmacies de garde, défibrillateurs, points de collecte déchets, arrêts bus/TER  
**Sources :** Data.gouv.fr APIs (déjà publiques), API Santé.fr  
**Valeur :** Utilité quotidienne, forte rétention

#### F9. Alertes en temps réel (météo, crues, vigilance)
**Description :** Intégration API Météo-France (vigilance) et Vigicrues, push automatique aux citoyens de la zone  
**Sources :** APIs gouvernementales gratuites et documentées  
**Valeur :** Feature critique en zones à risque (inondations, tempêtes)

#### F10. Travaux et chantiers (info trafic local)
**Description :** La commune publie les chantiers en cours (date début/fin, zone impactée, déviation), carte en temps réel  
**Valeur :** Très demandé par les citoyens, très utile pour les maires

#### F11. Permanences des élus
**Description :** Agenda des permanences mairie, prise de RDV en ligne directement dans l'app  
**Intégration potentielle :** Cal.com, Calendly API

#### F12. Annonces locales / Petites annonces
**Description :** Covoiturage, troc, garde animaux, baby-sitting de voisinage — modéré par la commune  
**Valeur :** Lien social, différenciateur par rapport aux apps sécurité pures

### 4.4 Features différenciantes long terme

#### F13. Budget participatif digital
**Description :** La commune alloue une enveloppe, les citoyens soumettent des projets, vote en ligne, suivi de réalisation  
**Valeur :** Fort engagement politique, démarche Open Gov  
**Monétisation :** Module 50 €/mois

#### F14. Qualité de l'air et de l'eau locale
**Description :** Intégration données ATMO (qualité air) et ARS (qualité eau), historique, alertes seuils  
**Sources :** APIs publiques régionales

#### F15. Scan et suivi des démarches administratives
**Description :** Scan d'un document officiel → identification de la démarche → lien vers France Connect ou demarches.gouv.fr  
**Valeur :** Massification adoption numérique en zones rurales peu équipées

#### F16. Mode accessibilité intégré
**Description :** Lecture vocale des alertes, contraste élevé, texte agrandi, traduction automatique (communes avec populations étrangères)  
**Valeur :** Obligations légales accessibilité numérique (RGAA), argument commercial communes

#### F17. Application agents terrain dédiée
**Description :** Build Capacitor séparé pour les agents de voirie, police municipale — avec GPS tracking, signalements vocaux, photos, synchronisation hors-ligne  
**Valeur :** Rend les agents de terrain 3x plus efficaces

---

## PARTIE 5 — CHECKLIST AVANT PROSPECTION COMMERCIALE

### Minimum viable pour une démo convaincante

- [ ] Import données réelles communes (script INSEE → exécuter)
- [ ] 1 commune pilote configurée complètement (logo, couleur, services, urgences réels)
- [ ] App Testflight iOS + APK Android (Capacitor)
- [ ] Flow invitation admin commune fonctionnel
- [ ] Push notifications testées end-to-end
- [ ] Landing page B2B `/communes` avec démo vidéo et pricing
- [ ] Email de démarchage séquence 3 emails rédigé
- [ ] 1 témoignage / cas client (interne ou partenaire)

### Minimum légal avant mise en production publique

- [ ] CGU rédigées et validées (avocat ou expertise RGPD)
- [ ] Politique de confidentialité complète (données traitées, durée, DPO)
- [ ] Mentions légales à jour
- [ ] Registre des traitements (RGPD Art. 30)
- [ ] Cookie banner conforme (si Google Analytics ou similaire)
- [ ] Hébergement données : Supabase EU ✅, Vercel Edge ✅, PostHog EU ✅
- [ ] Contrat DPA avec chaque sous-traitant (Supabase, Resend, PostHog, Brave)

### Minimum commercial

- [ ] Stripe configuré (abonnements, essai 30 jours, webhook)
- [ ] Contrat SaaS commune (modèle type)
- [ ] CGV fournisseur
- [ ] Présentation commerciale (deck 10 slides)
- [ ] Démo vidéo 3 minutes (enregistrée sur une commune fictive)

---

## RÉSUMÉ EXÉCUTIF

**VigieCity est techniquement à 75% du MVP nécessaire pour prospecter.**

Les 3 panels sont construits et fonctionnels dans leurs fonctions principales. L'infrastructure backend (Supabase, Resend, PostHog, Brave, push) est opérationnelle. Le niveau de finition UX est professionnel.

**Les 5 blockers principaux avant prospection :**
1. Capacitor iOS/Android (présence stores)
2. Import données communes réelles (démo crédible)
3. Flow invitation admin commune (onboarding commercial)
4. Pages légales RGPD (obligations)
5. Landing page B2B avec démo et pricing

**En 4 à 6 sessions de développement ciblées, VigieCity peut être prêt à prospecter ses premières communes.**

---

*Document préparé le 21 juin 2026 — CRBR Group / VigieCity*
*Confidentiel — usage interne uniquement*
