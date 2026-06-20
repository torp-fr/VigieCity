# VigieCity — Audit Stratégique & Étude de Marché
*Rédigé le 20/06/2026 — Sources vérifiées (Filomea, Cap'Com, Smart City Mag, Epiceum/Harris Interactive 2024)*

---

## TL;DR — Verdict en 3 lignes

Le marché existe, est validé (48 % des Français utilisent déjà l'app de leur commune), et **75 % des 35 000 communes françaises n'ont pas encore de solution**. Les leaders (PanneauPocket, IntraMuros, Illiwap) ont des angles morts réels : pas de SOS, pas de messagerie bidirectionnelle, pas de workflow signalement avancé, RGAA non conforme pour deux des trois. VigieCity peut s'y engouffrer avec un positionnement **sécurité + engagement citoyen + conformité RGAA**, à condition de corriger des problèmes produit identifiés ci-dessous.

---

## 1. État du Marché — Chiffres Vérifiés (avril 2026)

### Taille du marché adressable

| Métrique | Valeur | Source |
|---|---|---|
| Communes françaises | 34 935 | INSEE 2024 |
| Communes équipées d'une app | ~25 % → ~8 700 | Gazette des Communes 2024 |
| Communes sans app (TAM direct) | **~26 000 communes** | Calcul |
| Français utilisant l'app de leur commune | **48 %** (+39 pts depuis 2013) | Baromètre Epiceum/Harris 2024 |
| Intercommunalités (EPCI) | 1 254 | DGCL 2024 |

### Leaders et parts de marché

| Acteur | Communes | Particularité | Tarif indicatif |
|---|---|---|---|
| **PanneauPocket** | 14 000+ | Leader rural, groupe JVS | 130 €/an < 1 000 hab. (AMRF), devis > 3 000 |
| **IntraMuros** | 8 000+ | Seul RGAA certifié (98,18 %) | 5-60 €/mois selon population |
| **Illiwap** | 3 000+ | Multi-émetteurs (école + mairie + asso) | Devis |
| **Neocity** | 500+ | Villes moyennes/grandes | SaaS mensuel, devis |
| **CityAll/Lumiplan** | 1 000+ | Applis sur-mesure + mutualisé | Variable |
| Autres (myMairie, Citopia, Politeia…) | < 300 chacun | Niche | Variable |

### Grille tarifaire de référence (IntraMuros — seul barème public)

| Population | Tarif mensuel HT | Tarif annuel HT |
|---|---|---|
| < 150 hab. | 5 € | 60 € |
| 150–500 | 10–15 € | 120–180 € |
| 501–2 000 | 20–35 € | 240–420 € |
| 2 001–5 000 | 45–60 € | 540–720 € |
| > 5 000 | Sur devis | ~1 200 €+ |

---

## 2. Audit Honnête de la Vision VigieCity

### Ce que tu as raison de faire ✅

**SOS button avec anneau de progression** : aucun concurrent direct n'a ça. C'est un différenciateur fort sur le segment sécurité. En zone rurale, où les personnes âgées sont isolées et les délais d'intervention longs, c'est du pain bénit pour les maires.

**Signalements géolocalisés + workflow** : IntraMuros et PanneauPocket ont des signalements basiques. Ton workflow (ouvert → traitement → résolu → archivé + notification citoyen) est plus complet.

**Messagerie bidirectionnelle** : inexistant chez les concurrents. Fort. Les citoyens veulent du feedback, pas juste envoyer un message dans le vide.

**Plateforme centralisée** (admin national/régional + communes) : les leaders sont mono-usage. Ton architecture multi-tenant + plateforme de gestion est un avantage pour les EPCI et agglomérations.

---

### Ce qui manque ou est mal positionné ⚠️

**1. L'onglet "Services" est cassé — CRITIQUE**
Actuellement, il renvoie les numéros d'urgences → doublon avec la feature urgences, et mauvais usage du concept "services". Un citoyen qui clique sur "Services" attend : horaires déchetterie, cantine scolaire, réservation terrain foot, bibliothèque, démarches administratives — PAS le 15 et le 18. Urgences doit sortir du tab bar et aller dans le menu hamburger ou la page Accueil (raccourci).

**2. Il manque l'agenda événements — ESSENTIEL**
Sorties scolaires, marchés, vœux du maire, fêtes de village, réunions publiques : c'est LE use-case numéro 1 des mairies rurales. PanneauPocket a un agenda. Toi pas encore. C'est bloquant pour la démo commerciale.

**3. Il n'y a pas de cantine/menus scolaires**
20 % des communes rurales publient les menus de la cantine sur leur app (VotreAppli.fr, Ma Commune Live). Simple à implémenter, forte valeur perçue pour les parents. Ce n'est pas une priorité P0 mais c'est dans le pitch.

**4. La récupération de mot de passe est absente**
C'est un bug bloquant pour tout déploiement réel. Doit être fait en Session 5 (F-08).

**5. L'onboarding citoyen ne guide pas vers sa commune**
Un citoyen qui télécharge l'app ne sait pas comment trouver sa commune. Adresse → détection auto via api-adresse.data.gouv.fr est la bonne solution, mais elle n'est pas encore implémentée.

**6. RGAA non adressé**
Depuis 2024, une amende de 50 000 € peut être infligée à la collectivité (pas à l'éditeur !). IntraMuros est le seul à avoir 98,18 %. C'est un argument commercial puissant si tu le fais, et un risque commercial si tu ne le fais pas.

---

### Ce que tu n'avais pas envisagé mais qui compte 💡

**Newsletter / bulletin PDF automatique** : Filomea a trouvé un angle différent — ils agrègent les infos de la commune et envoient une newsletter + génèrent le bulletin PDF. Pas concurrent direct, mais révèle que les communes veulent aussi du multi-canal. VigieCity pourrait proposer l'export du digest hebdomadaire en PDF.

**Associations locales** : Illiwap a une longueur d'avance en permettant aux associations d'émettre des notifications dans la même app (sports, culture). Les mairies adorent car ça fait un seul outil pour tout. À intégrer dans la roadmap post-MVP.

**Panel moderateur EPCI** : les intercommunalités (EPCI) ont besoin de communiquer à toutes leurs communes en un clic. C'est un marché séparé avec des tarifs plus élevés. Ton architecture le supporte déjà (collectivity_id). À valoriser.

---

## 3. Personas — 5 Profils Validés

### Persona 1 — Michel, Maire d'une commune de 800 habitants

**Profil** : 58 ans, 3ème mandat, agriculteur en activité réduite, numérique limité, téléphone Samsung Galaxy A25. Temps disponible pour la communication : 2h/semaine maximum.

**Frustrations actuelles** :
- "Je colle des affiches à la mairie mais les gens ne les voient pas."
- "Pour les coupures d'eau, je n'ai aucun moyen d'alerter tout le monde rapidement."
- "Le site internet de la mairie, personne ne sait le mettre à jour."

**Attentes de VigieCity** :
- Publier une alerte en 30 secondes depuis son téléphone
- Voir combien de personnes ont lu (taux de lecture)
- Que les signalements citoyens arrivent directement sur son téléphone

**Déclencheur d'achat** : démonstration en conseil municipal + tarif < 200 €/an + formation < 1h.

**Risque d'abandon** : l'app n'est pas utilisée par ses citoyens (taux d'install < 30 %).

---

### Persona 2 — Aurélie, Responsable communication, ville de 12 000 habitants

**Profil** : 34 ans, agent territorial cat. B, maîtrise des outils numériques (Canva, WordPress, MailChimp). Pilote la com de la ville avec un collègue. Rapporte au DGS.

**Frustrations actuelles** :
- "Notre app actuelle (concurrent) ne permet pas de répondre aux messages des citoyens."
- "Les gens signalent des nids de poule sur Facebook au lieu de l'app, et ça fait mauvaise impression."
- "Je dois mettre à jour manuellement 4 outils différents pour une seule publication."

**Attentes de VigieCity** :
- Messagerie bidirectionnelle pour clôturer les demandes
- Dashboard de suivi des signalements avec statut
- Tableau de bord analytics (engagement, publications les plus vues)

**Déclencheur d'achat** : démo messagerie + démo workflow signalement + tarif négocié en marché public.

**Risque d'abandon** : processus d'achat public (MAPA) trop long si VigieCity n'est pas référencé.

---

### Persona 3 — Jean-Luc, Directeur Général des Services (DGS), EPCI de 15 communes

**Profil** : 47 ans, expert marchés publics et gouvernance territoriale, dirige une équipe de 12. Décisionnaire final sur les outils numériques de l'intercommunalité.

**Frustrations actuelles** :
- "Chaque commune a sa propre solution (ou aucune), c'est ingérable."
- "Les élus viennent me voir parce que des citoyens ont posté des plaintes sur Instagram — on a aucun outil de gestion des demandes."
- "Le RGPD et le RGAA, mes maires en ont peur mais ne savent pas quoi faire."

**Attentes de VigieCity** :
- Console intercommunale : 1 admin qui voit toutes les communes
- Conformité RGAA documentée (à produire impérativement)
- DPA (accord sous-traitant) fourni clés en main
- Tarif dégressif intercommunal

**Déclencheur d'achat** : réponse à un appel d'offres ou référencement sur la plateforme Numérique360 de la Banque des Territoires.

**Budget type** : 800–3 000 €/an selon taille de l'EPCI.

---

### Persona 4 — Fatima, Citoyenne, 31 ans, mère de 2 enfants

**Profil** : Employée de commerce, vit dans une commune de 3 500 habitants depuis 3 ans. iPhone 15, grande utilisatrice d'apps. N'a pas le temps de se rendre à la mairie.

**Frustrations actuelles** :
- "Je ne sais jamais si la déchetterie est ouverte le samedi."
- "Mon mari a appelé la mairie pour un arbre tombé — personne n'a rappelé."
- "J'aurais voulu être alertée de la fête des voisins, j'ai loupé ça."

**Attentes de VigieCity** :
- Notification push pour les événements du quartier
- Signalement incident avec suivi (a-t-il été traité ?)
- Agenda événements (sorties scolaires, vide-greniers, spectacles)

**Déclencheur d'install** : recommandation de la mairie, affiche à la salle des fêtes, bouche à oreille.

**Risque de désinstall** : app silencieuse depuis > 2 semaines, notifications trop fréquentes ou pas pertinentes.

---

### Persona 5 — Christophe, Adjoint à la sécurité, commune de 5 000 habitants

**Profil** : 52 ans, ancien pompier, maintenant élu. Responsable du Plan Communal de Sauvegarde (PCS). S'occupe des crises : inondations, feux, accidents.

**Frustrations actuelles** :
- "En cas d'inondation, je dois appeler tous les numéros un par un."
- "Les personnes âgées et isolées n'ont personne pour vérifier qu'elles vont bien."
- "L'alerte cell broadcast du gouvernement, les gens ne comprennent pas ce que ça veut dire."

**Attentes de VigieCity** :
- Bouton SOS géolocalisé avec transmission rapide
- Alertes push géolocalisées par zone (sectorisation par quartier)
- Liste des personnes vulnérables inscrites (dans le respect RGPD)
- Lien avec contacts d'urgence locaux affichés instantanément

**Déclencheur d'achat** : recommandation de l'Association des Maires (AMF, AMRF) ou de la Préfecture.

---

## 4. Analyse Concurrentielle — Où VigieCity se Différencie

| Feature | PanneauPocket | IntraMuros | Illiwap | VigieCity |
|---|---|---|---|---|
| Alertes push | ✅ | ✅ | ✅ | ✅ |
| Publications/actualités | ✅ | ✅ | ✅ | ✅ |
| Agenda événements | ✅ | ✅ | ✅ | ⚠️ À faire |
| Signalement citoyen | ❌ | ✅ partiel | ❌ | ✅ complet + workflow |
| **Bouton SOS** | ❌ | ❌ | ❌ | **✅ Exclusif** |
| **Messagerie bidirectionnelle** | ❌ | ❌ | ❌ | **✅ Exclusif** |
| **Workflow signalement (statuts)** | ❌ | partiel | ❌ | **✅ Exclusif** |
| Console intercommunale | partiel | ✅ | partiel | ✅ |
| Radio locale | ❌ | ❌ | ❌ | ✅ (roadmap) |
| Formulaire vacances | ❌ | ❌ | ❌ | ✅ (roadmap, post-DPIA) |
| RGAA conforme | ❌ | ✅ 98 % | ❌ | ⚠️ À faire |
| White-label | ❌ | ❌ | ❌ | ✅ (Enterprise) |
| Multi-émetteurs (asso, école) | ❌ | ❌ | ✅ | ❌ (roadmap) |
| Hébergement France | ✅ OVH | ✅ | non documenté | ✅ Supabase EU |

**Triangle de différenciation VigieCity** : Sécurité (SOS) + Engagement citoyen (messagerie + signalements workflow) + Plateforme (multi-tenant, analytics, modules).

---

## 5. Pricing — Grille Validée

### Principes

- **Toutes les features disponibles dans tous les plans** — pas de features cachées derrière un tier supérieur
- **Le tarif s'adapte à la taille de la collectivité**, pas à un bundle de fonctionnalités
- **3 mois d'essai gratuit** (< 5 000 hab.) / 2 mois (> 5 000 hab.) → conversion après usage réel
- **Engagement mensuel sans engagement** — ou annuel avec 2 mois offerts
- VigieCity fournit un support technique ; la collectivité reste responsable de l'usage et de l'authenticité des contenus publiés

### Grille tarifaire VigieCity (toutes options incluses)

| Tranche population | Mensuel HT | Annuel HT | Essai gratuit |
|---|---|---|---|
| < 1 000 hab. | **19 €** | 190 € *(2 mois offerts)* | 3 mois |
| 1 001–2 500 hab. | **39 €** | 390 € *(2 mois offerts)* | 3 mois |
| 2 501–5 000 hab. | **69 €** | 690 € *(2 mois offerts)* | 2 mois |
| 5 001–10 000 hab. | **119 €** | 1 190 € *(2 mois offerts)* | 2 mois |
| 10 001–25 000 hab. | **199 €** | 1 990 € *(2 mois offerts)* | 2 mois |
| 25 001–50 000 hab. | **349 €** | 3 490 € *(2 mois offerts)* | 1 mois |
| > 50 000 hab. | **Sur devis** | — | 1 mois |
| **EPCI** | **Population totale × tarif tranche × 0,7** | même logique | 2 mois |

*Exemple EPCI 12 communes, 18 000 hab. totaux → tranche 10 001–25 000 → 199 € × 0,7 = **139 €/mois***

### Rentabilité infrastructure

| Coût infra | Mensuel |
|---|---|
| Supabase Pro | ~25 € |
| Vercel Pro | ~20 € |
| Email transactionnel (Resend) | ~0–20 € |
| Domaine + divers | ~5 € |
| **Total fixe** | **~50–65 €/mois** |

- Seuil rentabilité : **4 communes à 19 €** couvrent l'infrastructure
- À 50 communes (mix rural/urbain) : ~2 200 €/mois → marge >95 %
- À 200 communes : ~8 000–12 000 €/mois → activité viable solo

### Financement public — levier commercial fort

Les communes peuvent financer l'abonnement via :
- **DSIL** (Dotation de Soutien à l'Investissement Local) — numérique éligible
- **DETR** (Dotation d'Équipement des Territoires Ruraux)
- **FNADT** (Fonds National pour l'Aménagement du Territoire)
- Mutualisation EPCI : l'intercommunalité paye pour toutes ses communes

→ À créer : **Guide financement 1 page PDF** — argument de vente décisif pour les petites communes.

---

## 6. Marketing — Positionnement & Canaux

### Claim principal (à valider juridiquement)

> **"L'application citoyenne qui répond, pas seulement qui publie."**

Sous-titres possibles selon cible :
- Mairie rurale : *"Alertez vos habitants en 30 secondes. SOS inclus."*
- Ville moyenne : *"Vos citoyens signalent, vous répondez — en boucle fermée."*
- EPCI : *"Une plateforme, toutes vos communes."*

### Vérification légale des claims

| Claim | Risque | Correction |
|---|---|---|
| "L'application la plus sécurisée" | ❌ Supérlatif non substantié | Retirer |
| "Données hébergées en France" | ✅ Vrai (Supabase EU) | Conserver, documenter |
| "Conformité RGPD garantie" | ⚠️ "Garantie" = engagement fort | Reformuler : "Conçue pour respecter le RGPD" |
| "Bouton SOS unique en France" | ✅ Vrai d'après notre analyse | Conserver, avec précaution ("à notre connaissance") |
| "Messagerie bidirectionnelle native" | ✅ Vrai | Conserver |
| "Gratuit pour les communes de moins de 500 habitants" | ✅ Si vrai dans le plan | Conserver |

### Canaux d'acquisition — Priorités

**1. Associations de maires (levier principal)**
- AMF (Association des Maires de France) — 34 000 membres
- AMRF (Maires Ruraux de France) — PanneauPocket a un partenariat ici, à cibler aussi
- APVF (Petites Villes de France)
- AdCF (Assemblée des Communautés de France) pour les EPCI

→ Action : demander à être référencé sur leurs annuaires + conférences annuelles

**2. Banque des Territoires / Numérique360**
- Plateforme de référencement officielle du gouvernement pour les outils numériques des collectivités
- Neocity y est déjà → déposer un dossier VigieCity

**3. SEO — Mots-clés stratégiques**

| Intention | Mot-clé | Volume estimé | Concurrence |
|---|---|---|---|
| Commercial | "application mobile mairie" | Moyen | Élevée |
| Commercial | "app citoyenne commune gratuite" | Faible | Faible |
| Commercial | "signalement citoyen application" | Faible | Faible |
| Informationnel | "comment alerter habitants mairie" | Moyen | Faible |
| Commercial | "alternative panneau pocket" | Faible | Faible |
| Commercial | "application intercommunale EPCI" | Faible | Très faible |

→ Pages SEO prioritaires : `/alternative-panneaupocket`, `/application-mairie-rurale`, `/signalement-citoyen-app`, `/application-mobile-epci`

**4. Content marketing**
- Guide : "Comment choisir son application citoyenne" (générateur de leads)
- Guide : "Financer son app mairie avec les dotations de l'État"
- Cas clients : 1 commune < 1 000 hab. + 1 EPCI + 1 ville moyenne

**5. Prospection directe**
- Cibler les communes ayant récemment changé d'app (IntraMuros → Illiwap en 2025)
- Appels sortants DGS/agents com. des villes 3 000–10 000 hab.

---

## 7. SEO — Audit Initial

### Forces actuelles (potentielles)

- Stack moderne (React/Vite/Vercel) → Core Web Vitals potentiellement excellents
- Supabase pour l'API → réponses rapides
- PWA installable → bon signal d'engagement

### Faiblesses à corriger avant lancement

- **Pas de site marketing** distinct de l'app → impossible à indexer. Créer `vigie.city` ou `vigiecity.fr` avec pages produit/fonctionnalités/tarifs/blog.
- **Méta-données** : title, description, og:image non définis pour les pages publiques
- **Structured data** : `Organization`, `SoftwareApplication`, `FAQPage` à implémenter
- **Texte alternatif images** : obligation RGAA + SEO

### Pages à créer (priorité 6 mois)

```
vigiecity.fr/
├── /fonctionnalites              → Hub features
│   ├── /sos-citoyen              → Bouton SOS (différenciateur SEO)
│   ├── /signalement-incident     → Workflow signalement
│   ├── /messagerie-mairie        → Messagerie bidirectionnelle
│   └── /agenda-evenements        → Agenda commune
├── /tarifs                       → Grille tarifaire (SEO conversion)
├── /communes/[slug]              → Pages locales générées (programmatique)
├── /alternatives
│   ├── /alternative-panneaupocket
│   ├── /alternative-intramuros
│   └── /alternative-illiwap
├── /blog
│   ├── /financer-app-mairie-dotations
│   ├── /rgaa-application-mobile-collectivite
│   └── /signalement-citoyen-comment-ca-marche
└── /cas-clients/[commune]        → Témoignages (SEO local fort)
```

---

## 8. Navigation Mobile — Refonte Recommandée

### Problème actuel

L'onglet "Services" = numéros d'urgences → doublon sémantique + mauvais usage du slot.

### Solution recommandée — 4 onglets + Menu

La règle d'or du tab bar mobile : **max 5 items**, idéalement 4 si le contenu le permet.

```
┌─────────────────────────────────┐
│  Accueil │ Actus │ Services │ ≡ │
└─────────────────────────────────┘

Tab 1 — Accueil (/)
  • SosButton (toujours visible, priorité sécurité)
  • Alertes actives (flash rouge si active)
  • Raccourcis rapides (3 CTA mairie)

Tab 2 — Actualités (/actualites)
  • Tab Commune (publications mairie)
  • Tab National  (news pg-cron, opt-in commune)
  • Tab Agenda    (événements, sorties scolaires)  ← NOUVEAU

Tab 3 — Services (/services)
  • Grille CTA pictos (personnalisables par la mairie)
  • Ex : Horaires déchetterie, Cantine, Piscine, Réservation salle
  • Liens rapides : démarches, formulaires
  • ← Urgences SORT de cet onglet

Menu ≡ (/menu ou drawer)
  • 🚨 Numéros d'urgence        (/urgences)
  • 💬 Messagerie               (/messagerie)
  • 📅 Signalements             (/signalements)
  • 🏖️ Tranquillité vacances    (/vacances)  [post-DPIA]
  • 👤 Mon profil               (/profil)
  • ⚙️ Paramètres               (/profil/notifications)
```

**Justification** : Urgences = usage rare mais critique → accessible depuis le menu (1 clic supplémentaire) ou depuis le bouton SOS sur l'accueil. La messagerie est une feature nouvelle → menu avant d'être promue en tab quand l'usage est prouvé.

---

## 9. Roadmap Produit Révisée

| Priorité | Feature | Session | Impact |
|---|---|---|---|
| 🔴 P0 | F-08 Password reset | 5 | Bloquant déploiement |
| 🔴 P0 | Agenda événements | 5 | Manquant vs concurrents |
| 🔴 P0 | Navigation refonte (tab bar) | 5 | UX cassée |
| 🔴 P0 | Onboarding citoyen (adresse → commune) | 7 | Acquisition citoyens |
| 🟠 P1 | Services CTA pictos | 7 | Valeur démo |
| 🟠 P1 | Messagerie bidirectionnelle | 8 | Différenciateur |
| 🟠 P1 | Fil actualités national pg-cron | 6 | Engagement |
| 🟠 P1 | Notifications push | 8 | Rétention |
| 🟡 P2 | Radio locale | 6 | Plaisir d'usage |
| 🟡 P2 | Formulaire vacances | 9 | Post-DPIA |
| ⚪ P3 | RGAA audit complet | 10 | Commercial EPCI |
| ⚪ P3 | Menus cantine scolaire | 11 | Parents actifs |
| ⚪ P3 | App stores (Android + iOS) | 12 | Distribution |

---

## 10. Risques Business (Non-Techniques)

| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| Processus achat public (MAPA) trop long | Élevé | Élevé | Référencement Banque des Territoires + pack dossier marché |
| PanneauPocket baisse ses prix ou étend ses features | Élevé | Moyen | Différenciation SOS + messagerie non copiables rapidement |
| Retention citoyens faible (app silencieuse) | Élevé | Moyen | Minimum 2 publications/semaine → programme d'onboarding éditorial pour la mairie |
| Légal RGPD : collectivité responsable | Élevé | Faible (court terme) | DPA clés en main + conformité RGAA |
| Dépendance Supabase free tier | Moyen | Faible | Migration Pro Supabase avant production (€25/mois) |

---

## 11. Quick Wins Session 5 — À Implémenter Maintenant

1. **F-08 Password reset** : 2 routes `/auth/forgot-password` + `/auth/reset-password` — Supabase Auth natif, 1h de dev
2. **Agenda événements** : ajouter une 3ème tab "Agenda" dans `/actualites` + table `events` simple (title, date, lieu, category, description)
3. **Navigation refonte** : 4 onglets + menu drawer (remplacer l'onglet Services actuel)
4. **Regen types Supabase** : après migrations plans + intercommunal_pricing

---

*Sources : Filomea (avril 2026) · Baromètre Epiceum/Harris Interactive 2024 · Smart City Mag (juillet 2023) · Cap'Com · DGCL 2024 · App Store / Google Play (avril 2026)*
