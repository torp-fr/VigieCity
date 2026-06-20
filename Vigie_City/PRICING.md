# VigieCity — Grille tarifaire interne (confidentiel)

> Document de référence interne. Ne pas diffuser publiquement.  
> Dernière mise à jour : juin 2026

---

## Philosophie tarifaire

- **Tous les modules inclus** dans chaque offre (alertes, signalements, agenda, infos, messagerie, admin).
- **Prix selon la taille** du territoire : nombre d'habitants de la commune ou du groupement.
- **Paiement annuel** recommandé (aligné avec les budgets votés des collectivités).
- **Facturation mensuelle** possible, sans remise.

---

## Grille publique (à afficher sur le site)

| Offre | Population | Mensuel (HT) | Annuel (HT) | Économie |
|-------|-----------|-------------|------------|---------|
| **Nano** | < 1 000 hab. | 49 € | 490 € | 2 mois offerts |
| **Micro** | 1 000 – 2 500 hab. | 99 € | 990 € | 2 mois offerts |
| **Commune** | 2 500 – 10 000 hab. | 189 € | 1 890 € | 2 mois offerts |
| **Ville** | 10 000 – 50 000 hab. | 490 € | 4 900 € | 2 mois offerts |
| **Métropole** | > 50 000 hab. | *Sur devis* | *Sur devis* | — |

> Le prix annuel = 10 × le mensuel (2 mois offerts systématiquement).

---

## Grille interne — Métropoles (> 50 000 hab.) « Sur devis »

Ces tarifs servent de base de négociation. Ils ne sont jamais affichés publiquement.

| Tranche population | Mensuel HT (base) | Annuel HT (base) |
|-------------------|-----------------|-----------------|
| 50 000 – 100 000 hab. | 890 € | 8 900 € |
| 100 000 – 250 000 hab. | 1 490 € | 14 900 € |
| 250 000 – 500 000 hab. | 2 490 € | 24 900 € |
| > 500 000 hab. | 3 990 € minimum | 39 900 € minimum |

### Logique du calcul (marge de négociation)

Le prix par habitant diminue avec la taille (économies d'échelle) :

| Tranche | Prix/hab/mois | Logique |
|---------|--------------|---------|
| Nano | ~0,05 – 0,10 € | Floor : minimum viable |
| Micro | ~0,04 – 0,10 € | |
| Commune | ~0,019 – 0,076 € | |
| Ville | ~0,010 – 0,049 € | |
| 50k–100k | ~0,009 – 0,018 € | Dégressif |
| 100k–250k | ~0,006 – 0,015 € | |
| > 250k | ~0,005 – 0,010 € | Quasi-fixe : maintenance |

**En négociation** : prix de base − jusqu'à 20 % si :
- Engagement 3 ans
- Communauté à fort potentiel de référencement (grande ville connue)
- Accord de témoignage ou de référence client

---

## Intercommunalités (CC, CA, CU, Métropole)

Les groupements de communes sont tarifés sur la **population totale du groupement** (somme des communes membres), avec la même grille.

**Supplément intercommunal** : +20 % sur le prix de la tranche correspondante, pour l'accès au tableau de bord multi-communes (vue consolidée, gestion multi-admin, rapports croisés).

**Exemple :**  
Communauté de communes de 12 000 hab. → tranche « **Ville** » (10 000–50 000 hab.) : 490 €/mois  
+ supplément intercommunal 20 % → **588 €/mois** (5 880 €/an)

> ⚠️ Attention : 12 000 hab. dépasse le seuil de 10 000 → c'est bien la tranche **Ville** qui s'applique, pas **Commune**.

**Option package** : si toutes les communes membres signent en même temps → −10 % sur l'ensemble (équivalent à un pré-paiement groupé).

---

## Remises multi-annuelles

| Engagement | Remise | Calcul |
|-----------|--------|--------|
| 1 an (défaut) | 0 % | Prix annuel = 10 × mensuel |
| 2 ans | −10 % | Prix total = 1,9 × annuel |
| 3 ans | −15 % | Prix total = 2,55 × annuel |

---

## Offre premiers clients (phase de lancement)

Pour les **20 premières collectivités** :
- **2 mois offerts avant le début de l'abonnement payant** (tests, corrections, adaptation)
- Tarif "partenaire fondateur" : **−30 % à vie** sur leur tranche tarifaire
- Accès prioritaire aux nouvelles fonctionnalités
- Statut de référence client (avec accord)

> Objectif : collecter les premiers retours terrain et construire des cas d'usage réels avant de commercialiser à grande échelle.

---

## Ce qui est inclus dans toutes les offres

- Application mobile iOS & Android (habitants)
- Espace d'administration web (agents et modérateurs)
- Notifications push illimitées
- Signalements, alertes, agenda, actualités, messagerie
- Carte des signalements
- Statistiques d'usage
- Support par email (réponse < 48h)
- Mises à jour de la plateforme

---

## Ce qui n'est pas inclus (options futures possibles)

- Intégration API personnalisée avec SI mairie → sur devis
- Formation présentielle des agents → sur devis
- SLA renforcé (99,9 % uptime garanti) → option à +15 %/an
- Dédoublement des données sur serveur mairie → non disponible actuellement

---

## Infrastructure (à connaître pour répondre aux collectivités)

| Élément | Fournisseur | Note |
|---------|------------|------|
| Application web & mobile | Vercel | CDN mondial, déploiement continu |
| Base de données | Supabase (AWS EU) | Région Europe, RGPD conforme |
| Nom de domaine | ionos.fr (non encore acheté) | vigiecity.fr — achat à faire |

> **Hébergeur ≠ registrar de domaine.** Vercel et Supabase sont les hébergeurs de l'application. Le nom de domaine (`vigiecity.fr`) est une adresse séparée, à enregistrer auprès d'un registrar (Gandi, OVHcloud, etc.).  
> OVHcloud pourrait être utilisé comme registrar du domaine, mais ce n'est PAS l'hébergeur de l'app.

---

## Intégration dans le panel super-admin (à développer)

La gestion des licences sera intégrée dans le panel `platform` (super-admin) :
- Table `licenses` : `collectivity_id`, `tier`, `status` (trial / active / expired / suspended), `started_at`, `expires_at`, `annual_price_eur`, `discount_pct`
- Attribution manuelle par super-admin
- Vue liste des collectivités avec statut de licence
- Blocage automatique de l'accès admin si licence expirée
