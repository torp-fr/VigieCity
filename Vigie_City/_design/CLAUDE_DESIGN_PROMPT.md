# PROMPT CLAUDE DESIGN — VigieCity
## Prototype UI fonctionnel complet

---

## CONTEXTE PRODUIT

**VigieCity** est une Progressive Web App (PWA) mobile-first destinée aux communes françaises. Elle connecte les citoyens à leur mairie sur les sujets de sécurité de proximité, d'information locale et de vie communale.

**Tagline :** « Veillons ensemble sur le quartier. »

**Modèle B2B2C :** la mairie souscrit une licence (SaaS) → ses citoyens utilisent l'app gratuitement.

**Stack technique réelle :** React 18 + TanStack Router + Supabase + Tailwind CSS. Le prototype peut être du HTML/CSS/JS vanilla ou React — l'important est qu'il soit **navigable et fonctionnel dans un navigateur**, simulant les vraies interactions sans backend.

---

## PERSONAS & RÔLES

### 1. CITOYEN (rôle principal, 90 % des utilisateurs)
- Habitant(e) d'une commune abonnée
- Smartphone Android ou iOS, connexion parfois limitée
- Objectifs : être informé en temps réel des alertes, signaler un problème, contacter la mairie, s'informer sur la vie locale
- Usage : matin pour lire les actualités, urgence ponctuelle pour signaler

### 2. AGENT MAIRIE / MODÉRATEUR (rôle "admin")
- Employé municipal : secrétaire, responsable sécurité, élu
- Desktop ou tablette principalement
- Objectifs : traiter les signalements citoyens, publier alertes/actualités, gérer les services, répondre aux messages
- Usage : journée de travail, plusieurs sessions courtes

### 3. SUPER-ADMIN PLATEFORME (rôle "platform", interne VigieCity)
- Équipe VigieCity
- Gère l'onboarding des communes, l'activation des modules, la facturation

---

## DESIGN SYSTEM À RESPECTER

### Palette de couleurs
```
Primary (civic blue) : #2563EB  — boutons principaux, accents
SOS / Danger         : #DC2626  — bouton SOS, alertes urgentes
Warning / Vigilance  : #D97706  — alertes modérées
Success              : #16A34A  — confirmations
Background light     : #F8FAFC
Background dark      : #0F172A
Card light           : #FFFFFF  (border #E2E8F0)
Card dark            : #1E293B  (border #334155)
Text primary         : #0F172A / #F1F5F9
Text muted           : #64748B / #94A3B8
Gradient civic       : linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)
```

### Typographie
- Font : Inter (Google Fonts)
- Headings : font-semibold ou font-bold
- Body : font-normal, 14-16px
- Small/caption : 12px, text-muted

### Composants récurrents
- **Cards** : border-radius 16px, shadow légère, border subtil
- **Boutons primaires** : rounded-xl, bg-primary, text-white, py-3 px-6
- **Bouton SOS** : grand, rouge (#DC2626), pulse animation, centré
- **BottomNav** : 4 tabs fixes en bas (mobile), hauteur 64px, safe-area
- **Badges sévérité** : `urgent` = rouge, `vigilance` = orange, `info` = gris
- **AppHeader** : logo + ville de la commune + icône profil/cloche (notifications)
- **Chips/filtres** : petits boutons outline arrondis, actif = fond primary

### Principes UX
- Mobile-first (max-width 430px pour toutes les vues citoyennes)
- Tap targets minimum 44px
- Retours visuels immédiats (loading states, toasts)
- Mode clair ET mode sombre (toggle visible dans profil)
- Accessibilité : contraste AA minimum
- Offline : badge "Hors ligne" quand pas de connexion

---

## ARCHITECTURE DES ÉCRANS

### ─── VUE CITOYEN ───

#### ACCUEIL `/`
- Header : logo VigieCity + nom commune + cloche notifications (badge count)
- Météo locale : widget compact (température, icône météo, ville) — données API Open-Meteo, géolocalisé ou basé sur la commune
- Bouton SOS : grand bouton rouge pulsant « Appel d'urgence » — au tap : confirmation modal avec 3 numéros (17 Police, 18 Pompiers, 15 SAMU)
- Quick actions : 3 tuiles grid — « Urgences » (bleu), « Signaler » (orange), « Quartier » (gris)
- Section Alertes mairie : liste des alertes actives (max 3), avec badge sévérité, titre, message court — si vide : placeholder rassurant
- Section Actualités : 2-3 dernières publications de la mairie (titre + image thumbnail + date)
- Section Agenda : prochain événement à venir (date, titre, lieu)
- Player radio : mini-player collapsible en bas d'écran (au-dessus de la BottomNav) — play/pause + nom de la radio
- BottomNav : Accueil | Actualités | Signaler | Messagerie | +

#### FIL DU QUARTIER `/fil`
- Header avec titre « Fil du quartier » + nom de la commune + filtre par catégorie
- Chips de filtre : Tous | Véhicule suspect | Dégradation | Nuisance | Rôdeur | Intrusion | Autre
- Liste de signalements publiés : carte avec icône catégorie + badge sévérité + titre + adresse approximative + temps relatif (« il y a 2h »)
- Signalements anonymes : affichés « Citoyen anonyme »
- Realtime badge : « Mis à jour à l'instant » si nouveau signalement
- Skeleton loading state
- Message vide : illustration + « Aucun signalement dans votre commune pour l'instant »

#### SIGNALER `/signaler`
- Barre de progression (3 étapes)
- **Étape 1 — Catégorie**
  - Grid de catégories avec icônes : Véhicule suspect 🚗, Dégradation 🏚️, Nuisance sonore 🔊, Rôdeur/Personne suspecte 👤, Intrusion 🚪, Incendie 🔥, Inondation 💧, Autre ⚠️
  - Sévérité : Info | Vigilance | Urgent (radio buttons colorés)
- **Étape 2 — Détails**
  - Textarea « Description » (min 10 car.)
  - Adresse approximative (input texte optionnel)
  - Bouton géolocalisation GPS : « Localiser automatiquement » → affiche coord/adresse ou erreur
  - Upload photo : zone drag-drop + bouton caméra (max 3 photos, preview thumbnails, supprimable)
  - Toggle anonymat : « Rester anonyme » avec explication courte
- **Étape 3 — Confirmation**
  - Récap du signalement
  - Bouton « Envoyer le signalement »
  - État de traitement attendu (modération sous 24h)
- Post-envoi : écran succès avec animation confetti ou check ✅ + « Voir mes signalements »

#### CARTE `/carte`
- Carte interactive plein-écran (Leaflet / MapBox style mock)
- Marqueurs colorés selon sévérité (rouge/orange/gris)
- Tap sur marqueur → popup avec : catégorie, sévérité, description courte, adresse, date
- Filtre par sévérité (chips en overlay haut de carte)
- Bouton « Ma position » (geoloc)
- Légende sévérités (bas gauche)

#### ACTUALITÉS `/actualites`
- Tabs : « Publications » | « Agenda »
- **Publications** : liste de publications mairie avec image header, titre, catégorie (chip), date, texte tronqué → tap pour voir entier
  - Catégories : Info | Travaux | Sécurité | Événement | Santé | Social
  - Vue détail publication : image pleine largeur + titre + contenu + date + partage
- **Agenda** : liste d'événements à venir, triés chronologiquement
  - Carte événement : date (gros, coloré) + titre + lieu + description courte
  - Vue détail événement : image + infos complètes + bouton « Ajouter au calendrier »
  - Séparateur visuel entre mois

#### SERVICES LOCAUX `/services`
- Recherche en haut + filtre par catégorie
- Catégories : 🏛️ Mairie | 🏥 Santé | 🏫 Éducation | 🚌 Transport | ⚽ Sport | 🎭 Culture | 🛒 Commerce | 🌳 Espaces verts
- Grille ou liste de fiches : photo/emoji + nom + adresse + téléphone (tap to call) + horaires
- Vue détail service : photo, nom, catégorie, description, adresse (avec « Y aller » → maps), téléphone, site web, horaires détaillés par jour

#### URGENCES `/urgences`
- Titre « Numéros d'urgence »
- Grands boutons d'appel avec icône et couleur distinctive :
  - 🚨 Police — 17 (bouton bleu marine)
  - 🔥 Pompiers — 18 (bouton rouge)
  - 🚑 SAMU — 15 (bouton vert)
  - 🆘 Urgences EU — 112 (bouton violet)
  - 👴 Personnes âgées — 3977 (bouton orange)
- Numéros locaux configurés par la mairie (ex : « Gardien de nuit municipal — 06 XX XX XX XX »)
- Chaque bouton → confirmation avant appel
- Note légale : « VigieCity ne remplace pas les services de secours officiels »

#### MESSAGERIE `/messagerie`
- Liste des conversations : sujet + service destinataire + dernier message + date + badge non-lu
- Bouton « Nouveau message » (FAB ou bouton header)
- **Nouveau message** : sélecteur service destinataire (si mairie a configuré des services) + sujet + contenu textarea
- **Thread conversation** : bulles de messages (citoyen à droite, mairie à gauche), timestamps
  - Statut conversation : Ouverte | En attente | Fermée (chip coloré)
  - Zone saisie en bas avec bouton Envoyer
  - Scroll auto vers le bas

#### RADIO `/radio`
- Player plein-écran (ou page dédiée)
- Visuel de la radio (logo ou artwork générique)
- Boutons : play/pause, volume
- Nom de la station + description
- Equalizer animé quand en lecture
- Liste de radios disponibles (configurées par la mairie ou liste nationale par défaut)
  - Radio locale → en premier
  - France Info, France Bleu, RTL, Europe 1, etc.
- Mini-player persistant sur toutes les pages quand une radio joue (au-dessus BottomNav)

#### PROFIL `/profil`
- Avatar initiales (ou photo uploadée)
- Nom + email (modifiable)
- Commune (non modifiable ici → renvoie vers onboarding pour changer)
- Section « Mes signalements » : liste avec statut (En attente / Publié / Rejeté / Résolu)
- Section « Notifications » : toggle push + affichage des permissions
- Section « Apparence » : toggle Dark/Light mode
- Liens : Mentions légales | Confidentialité | Contact
- Bouton « Se déconnecter »

#### ONBOARDING `/onboarding`
- Écran 1 : Bienvenue + présentation VigieCity (3 points clés : Alertes, Signaler, Communiquer)
- Écran 2 : Sélection de commune (searchbox + liste filtrée)
- Écran 3 : Activation notifications push (skip possible)
- Écran 4 : Prêt ! → vers accueil

#### MOT DE PASSE OUBLIÉ `/forgot-password` + `/reset-password`
- Formulaire email
- Confirmation envoi
- Nouveau mot de passe + confirmation

---

### ─── VUE ADMIN MAIRIE ───

> Header admin différent : sidebar desktop OU bottom nav admin (mobile). Badge commune + rôle.

#### TABLEAU DE BORD ADMIN `/admin/`
- KPIs temps réel : signalements en attente | messages non lus | alertes actives | publications ce mois
- Graphique 7 derniers jours : signalements reçus (mini sparkline)
- Actions rapides : « Publier une alerte » | « Modérer signalements » | « Répondre aux messages »
- Dernière activité : flux chronologique (3-5 items)

#### SIGNALEMENTS `/admin/signalements`
- Tabs : En attente (badge count) | Publiés | Rejetés | Tous
- Filtre : catégorie + sévérité + période
- Tableau liste : photo thumb | catégorie | sévérité | description tronquée | adresse | date | statut | actions
- **Détail signalement** (modal ou page) :
  - Photos full-size (galerie)
  - Infos complètes : catégorie, sévérité, description, coordonnées GPS, adresse
  - Citoyen ou anonyme
  - Mini-carte avec position du signalement
  - Note interne admin (textarea)
  - Statut note visible du citoyen (textarea)
  - Boutons : Publier | Rejeter | Archiver
  - Si publié : option « Marquer comme résolu »

#### ALERTES `/admin/alertes`
- Liste alertes actives + historique
- **Créer/éditer alerte** :
  - Titre
  - Message (textarea)
  - Sévérité : Info | Vigilance | Urgent
  - Zone géographique : toute la commune ou quartier/secteur (input libre)
  - Date d'expiration (optionnel, date picker)
  - Bouton Publier → push notification vers tous les citoyens
- Toggle pour désactiver/supprimer une alerte

#### PUBLICATIONS `/admin/publications`
- Liste publications avec statut (Brouillon | Publié | Archivé)
- **Éditeur publication** :
  - Titre
  - Catégorie (select : Info, Travaux, Sécurité, Événement, Santé, Social)
  - Image hero (upload ou URL)
  - Contenu (textarea rich-ish : gras, liste, liens)
  - Statut : Brouillon | Publier maintenant | Planifier (date picker)
  - Prévisualisation avant publication

#### ÉVÉNEMENTS `/admin/evenements`
- Calendrier mensuel (vue mois) + vue liste
- **Créer/éditer événement** :
  - Titre
  - Catégorie
  - Date début + heure + Date fin optionnelle
  - Lieu (texte + optionnel géoloc)
  - Description
  - Image (upload)
  - Publié/Brouillon

#### MESSAGERIE ADMIN `/admin/messagerie`
- Tabs : Messages | Services
- **Messages** :
  - Liste conversations avec filtre : En cours | Fermées | Par service
  - Thread : affiche les messages, bulle admin à droite (bleu), citoyen à gauche
  - Zone réponse + bouton Fermer/Rouvrir la conversation
  - Indicateur non-lu : badge rouge sur onglet Messages
- **Services** :
  - Liste des services destinataires configurés (ex : Urbanisme, Voirie, Police Municipale)
  - Toggle actif/inactif
  - Ajouter / Modifier / Supprimer service (modal)

#### SERVICES LOCAUX ADMIN `/admin/services`
- Liste des services avec statut publié/brouillon
- **Créer/éditer service** :
  - Nom
  - Catégorie (select)
  - Description
  - Adresse + géocodage automatique → affichage sur mini-carte
  - Téléphone, Email, Site web
  - Horaires par jour (lun→dim, heure ouverture/fermeture ou « Fermé »)
  - Image (upload ou URL)
  - Publié/Brouillon

#### URGENCES ADMIN `/admin/urgences`
- Liste des numéros nationaux (non modifiables, pré-configurés)
- Section « Numéros locaux » :
  - Ajouter numéro : nom du service + numéro de téléphone + icône emoji + couleur
  - Réordonner (drag-drop ou flèches)
  - Supprimer

#### RADIO ADMIN `/admin/radio`
- URL du flux radio local (input)
- Nom de la radio locale
- Image/logo (upload)
- Bouton Test lecture
- Radios nationales disponibles (liste checkboxes : France Info, France Bleu, RTL…)
- Ordre d'affichage dans l'app

---

### ─── VUE PLATFORM (Super-admin VigieCity) ───

#### MODULES `/platform/modules`
- Liste des modules disponibles avec toggle actif par commune
- Modules : Signalements | Messagerie | Alertes | Publications | Événements | Services | Urgences | Radio | Météo | Carte | Push Notifications
- Statut : Actif | Inactif | Beta
- Pour chaque commune : voir quels modules sont activés

#### ONBOARDING COMMUNES `/platform/onboarding`
- Tunnel d'onboarding mairie : Infos commune → Charte graphique → Modules → Premier admin → Confirmation
- Tableau de bord des communes en cours d'onboarding

#### RÉTENTION `/platform/retention`
- Métriques d'engagement par commune : DAU/MAU, signalements/mois, messages/mois
- Alertes si commune inactive

---

## INTERACTIONS CLÉS À PROTOTYPER

1. **Bouton SOS** → modal de confirmation avec 3 numéros → tap appelle
2. **Signalement multi-étapes** → navigation étape 1→2→3 → succès
3. **Météo** → widget affiche température + icône selon condition
4. **Player radio** → play/pause → mini-player persiste en naviguant
5. **Messagerie** → liste → thread → saisie → envoi
6. **Alertes mairie** → admin publie → citoyen voit sur accueil
7. **Notifications** → badge cloche → liste notifs (alertes, réponses messagerie, changement statut signalement)
8. **Dark/light mode** → toggle dans profil → tout le site bascule
9. **Onboarding** → flow 4 étapes → activation push → accueil
10. **Admin modère signalement** → publie → visible dans /fil

---

## DONNÉES DE DÉMO (à injecter dans le prototype)

**Commune fictive :** Bois-sur-Mer (Var, 12 400 hab.)
**Citoyen démo :** Marie Dupont, marie@email.fr
**Admin démo :** Jean-Michel Rossi, DGS de la commune

### Signalements exemple
- 🚗 Véhicule suspect | Vigilance | « Berline noire stationnée depuis 3 jours, 12 rue des Mimosas » | il y a 2h
- 🏚️ Dégradation | Info | « Tag sur le mur de l'école maternelle Saint-Exupéry » | il y a 5h | Anonyme
- 🔊 Nuisance sonore | Vigilance | « Musique forte tous les soirs après 23h, résidence Les Pins » | il y a 1j
- 🔥 Incendie | Urgent | « Départ de feu dans un container poubelle, allée des Oliviers » | il y a 3h | RÉSOLU

### Alertes mairie exemple
- 🔴 URGENT : « Coupure d'eau potable rue du Port — durée estimée 4h » — expire aujourd'hui 18h
- 🟠 VIGILANCE : « Cambriolages signalés secteur nord — restez vigilants et sécurisez vos entrées »
- ℹ️ INFO : « Marché de Noël annulé en raison des conditions météo »

### Publications exemple
- « Travaux avenue de la Plage — du 23 juin au 15 juillet » — avec photo chantier
- « Résultats du budget participatif 2026 » — avec infographie
- « Guide prévention incendies estivaux »

### Événements exemple
- « Fête de la musique — 21 juin 2026 — Place de la Mairie — 18h→23h »
- « Réunion publique PLU — 28 juin 2026 — Salle des fêtes — 19h »
- « Marché estival — tous les samedis — Port de Bois-sur-Mer »

### Météo démo
- Bois-sur-Mer : ☀️ 28°C | Ensoleillé | Vent 12 km/h | Humidité 55%

### Messages démo
- Marie → Urbanisme : « Quand sera traité le signalement rue des Lilas ? » → Réponse mairie : « Intervention prévue semaine du 24 juin »
- Marie → Voirie : « Nid-de-poule dangereux angle rue Pasteur / avenue Victor Hugo »

---

## NOTES TECHNIQUES POUR LE PROTOTYPE

- **Navigation mobile** : BottomNav avec 4-5 tabs (Accueil, Actualités, Signaler, Messagerie, + overflow)
- **Navigation admin** : sidebar desktop rétractable OU onglets admin séparés
- **Transitions** : slide horizontal entre pages principales, slide up pour modals
- **États** : simuler loading (skeleton/spinner 500ms), empty states, error states
- **Radio player** : utiliser un vrai flux audio public si possible (ex: France Info : https://icecast.radiofrance.fr/franceinfo-midfi.mp3)
- **Carte** : utiliser Leaflet + OpenStreetMap (gratuit) ou une image statique de carte comme fallback
- **Météo** : appel réel à Open-Meteo API (https://api.open-meteo.com/v1/forecast?latitude=43.1&longitude=6.1&current=temperature_2m,weathercode&timezone=auto) — gratuit, sans clé
- **Tout dans un seul fichier HTML** si possible, ou maximum 3 fichiers

---

## LIVRABLES ATTENDUS

Un prototype HTML fonctionnel et navigable couvrant :
1. **Toutes les vues citoyennes** (accueil, fil, signaler, carte, actualités, services, urgences, messagerie, radio, profil)
2. **Les vues admin principales** (dashboard, signalements, alertes, messagerie, publications)
3. **Le flow d'onboarding**
4. **Le dark mode** toggle

Le prototype servira de **référence visuelle** pour migrer l'UI existante. Priorité à la **fidélité mobile**, la **cohérence du design system** et la **couverture exhaustive des features**.

---

*Prompt généré le 20 juin 2026 — VigieCity v2 Design Sprint*
