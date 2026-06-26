# VigieCity — Roadmap Commerciale (S37-S41+)

**Stratégie :** Implémenter les 5 propositions tarifaires pour multiplier ARR par 27×  
**Période :** S37-S41+ (6 mois intensive)  
**Responsable :** Vous (commercialement), Claude (support technique + onboarding)

---

## 🎯 OBJECTIFS CLÉS

| Horizon | ARR | Communes | EPCI | Détail |
|---------|-----|----------|------|--------|
| **S37 (actuel)** | 82k€ | 35 test | 0 | Baseline |
| **S39 (3 mois)** | 400k€ | 250 | 20 | Solidarité + Prop A lancées |
| **S41 (6 mois)** | 2.2M€ | 1 500 | 150 | Scaling complet |
| **S43 (1 an)** | 7.4M€ | 2 000+ | 300+ | Portfolio complet |

---

## 📋 PHASE 1 — IMMÉDIAT (S37-S38, 3 semaines)

### Tâche 1.1 : Valider proposition A avec 5 EPCI pilot

**Qu'est-ce :** Tester le nouveau modèle "agrégation communes + réductions" avec 5 petites EPCI réelles

**Étapes :**
1. Identifier 5 EPCI actuelles ou prospect avec 5-20 communes
   - Critère : Hétérogène (mix petit + grand) pour voir l'impact
2. Présenter Proposition A : "Modèle plus juste, transparent, parrainage"
3. Négocier : offrir -15% première année (pioneer discount)
4. Configurer système : chaque commune = entrée base, agrégation prix + réduction
5. Onboarding : validation technique + comptabilité

**Livrables :**
- ✅ 5 contracts signés (Prop A)
- ✅ Scripts import communes dans système
- ✅ Documentation pour commercial

**Timeline :** 2-3 semaines

---

### Tâche 1.2 : Lancer plan Solidarité (19€/mois)

**Qu'est-ce :** Offre pour villages < 500 hab (5k communes en France)

**Étapes :**
1. **Créer offre dans DB :** nouvelle ligne `plans` table
   - Name: "Solidarité"
   - Price: 19€/mois, 190€/an
   - Population: 0-500 hab
   - Features: signalements, alertes, agenda, FAQ (pas email dédié)
2. **Documenter :** page /pricing + FAQ
3. **Go-to-market :** campaign villages sur LinkedIn/email maires
   - Angle : "Pour les petites communes, on rend accessible"
   - Offre : 1 mois gratuit test
4. **Target :** 100 villages Solidarité dans 3 mois

**Livrables :**
- ✅ Plan Solidarité actif
- ✅ Landing page Solidarité
- ✅ Campaign maires villages

**Timeline :** 1-2 semaines

---

### Tâche 1.3 : Mettre à jour page /pricing (déploiement)

**Qu'est-ce :** Remplacer l'ancienne tarification par page complète (4 tabs)

**Étapes :**
1. Déployer `/pricing.tsx` en prod
2. Tester : Communes tab, EPCI tab, Services tab, Calculateur
3. Documenter : liens internes landing / formulaires
4. A/B test : "Calculateur EPCI" augmente conversions ?

**Livrables :**
- ✅ Page /pricing production
- ✅ Calculateur fonctionnel
- ✅ Analytics : tracker conversions tab

**Timeline :** 1 semaine

---

## 📊 PHASE 2 — COURT TERME (S39-S40, 4 semaines)

### Tâche 2.1 : Scaling Solidarité (100 → 500 communes)

**Qu'est-ce :** Acquérir villages via canal direct + partenaires (associations maires)

**Étapes :**
1. **Campaign wave 1 :** LinkedIn targeting "maires communes < 500 hab"
   - Message : "VigieCity Solidarité, enfin accessible pour petites communes"
   - CTA : 1 mois gratuit + consultation gratuite setup
   - Budget : 2k€ (test)
2. **Partenariats :** Associations nationales maires (AMRF, etc.)
   - Proposition : accord blanc label, discount groupe
   - Target : 10-20 communes/mois via partenaires
3. **Onboarding rapide :** bot setup + documentation + FAQ
   - Pas d'appel sales (coût trop élevé)
   - Support email dédié FAQs (pas prioritaire)
4. **Tracking :** cohort analysis — churn Solidarité vs autres plans ?

**Metrics :**
- Cible : 500 communes Solidarité = 9.5k€/mois
- Churn cible : < 5% (villages fidèles)
- Upgrade Nano : 10% (croissance commune)

**Timeline :** 4 semaines

---

### Tâche 2.2 : Packaging Services (Training + SLA + White Label)

**Qu'est-ce :** Créer offres additionnelles pour upsell

**Étapes :**
1. **Créer produits DB :**
   - "Formation 4h" = 500€ (delivered by you or partner)
   - "SLA 99,9% annuel" = +15% du plan
   - "White Label light" = 2k€/an (custom domain + logo)
2. **Pricing page :** ajouter Services tab
3. **Sales toolkit :** quand proposer chaque service
   - Training : post-activation (J+30)
   - SLA : upgrade vers Urbain
   - White Label : EPCI > 30 communes
4. **Pilot :** 20 communes testent 1 service (50% discount)

**Revenue target :**
- Training : 30 communes × 500€ = 15k€ (S40)
- SLA : 50 Urbain × +15% = +10k€/an
- White Label : 5 EPCI × 2k€ = 10k€/an

**Timeline :** 2-3 semaines

---

### Tâche 2.3 : Pilot Freemium (50 communes)

**Qu'est-ce :** Tester modèle gratuit + ads pour villages ultra-petits

**Étapes :**
1. **Créer Freemium plan :** pop 0-300 hab, 0€/mois, ads inclus
2. **Selector automatique :** si pop < 300 et not premium → show Freemium option
3. **Ads engine :** intégrer mockcup ads (commerces locaux)
   - Pas real CPC yet (juste dashboard mock)
   - See if users engage
4. **Pilot 50 communes :** mesurer :
   - Adoption rate vs Solidarité (19€)
   - Ad impression rates / CTR
   - Community sentiment (gratuit = moins engaged ?)
5. **Decision S41 :** scale ou abandon Freemium ?

**Timeline :** 2-3 semaines (pilot)

---

## 🚀 PHASE 3 — MOYEN TERME (S40-S41, 4 semaines)

### Tâche 3.1 : Lancer White Label Régional (pilote)

**Qu'est-ce :** Servir CCI / Syndicats avec domaine custom + branding

**Étapes :**
1. **Identifier 1 partenaire pilot :** CCI région ou Syndicat
   - Critère : 100-300 communes dans périmètre
   - Budget : 5k€/an + 100€/commune/an
2. **Architecture :** déployer instance dédiée avec custom domain
   - Domaine : ex. logement-bourgogne.vigiecity.fr
   - Branding : leur logo + couleurs + texte custom
   - Moderation : leur équipe (pas nous)
3. **Commercial :** partenaire devient reseller
   - Ils vendent communes sous leur marque
   - Margin : par exemple, ils facturent 60€ Nano, on en donne 50€
4. **Support :** account manager dédié (vous)

**Revenue :**
- Base : 5k€/an
- Communes : si 200 communes avg Micro = 200 × 99 × 12 = 237k€/an → nous touch 50% = 118k€

**Timeline :** 4 semaines

---

### Tâche 3.2 : Scaling Communes Totales (500 → 1500)

**Qu'est-ce :** Croissance organique + sales directe

**Étapes :**
1. **Organic :** EPCI pilot (Prop A) font le parrainage
   - Chaque EPCI = 5-10 communes contacts chaque mois
   - Discount parrainage : -10% 1ère année
2. **Direct sales :** vous ou sales rep
   - Target : villes Urbain (10k-50k) = high ARR
   - Approach : démo personnalisée + benchmark vs competitors
   - Win rate target : 30% de prospects qualifiés
3. **Referral program :** communes qui parrinent = -5% annuel
   - Automate : tracking dans system

**Metrics :**
- MRR communes : S39 = 50k€, S41 = 150k€
- CAC (customer acquisition cost) : target 200€ (ROI 12 mois)
- Churn : target 2-3% MRR

**Timeline :** Ongoing (8+ semaines)

---

## 💼 PHASE 4 — LONG TERME (S41-S43, ~8 semaines)

### Tâche 4.1 : Advertising Plateforme (MVP)

**Qu'est-ce :** RegioPub = SaaS pub locale (communes créent campagnes)

**Étapes :**
1. **MVP features :**
   - Dashboard communes : créer campagne pub (texte + image)
   - Audience : (future) target paroisses, categories commerces
   - Pricing : CPC 0,50€ / CPM 5€
   - Analytics : impressions, clics, CTR
2. **Revenue model :**
   - Commune paie advertisers (PME locales) via VIGIE
   - Vigie prend 20% commission
   - Commune peut aussi monétiser ads (50/50 split)
3. **Pilot :** 100 communes, 50 advertisers (PME)
4. **Scaling :** si proof of concept, expand à 500 communes

**Timeline :** 6-8 semaines

---

### Tâche 4.2 : Data Reports Monetization

**Qu'est-ce :** Vendre rapports territoriaux anonymisés

**Étapes :**
1. **Products :**
   - "Benchmarking communes" = 500€/mois (comparez vous vs similaires)
   - "Trends thématiques" = 2k€/mois (CCI, syndicats)
   - "API data" = 5k€/mois (chercheurs, think tanks)
2. **Compliance :** anonymisation stricte (RGPD), pas réidentifiable
3. **Pilot :** 5 clients payants (negotiate directly)

**Timeline :** 6-8 semaines

---

## 📈 ROADMAP RÉSUMÉE — GANTT

```
S37  | T1.1 (Prop A pilot)  | T1.2 (Solidarité)  | T1.3 (Pricing page)
     └─ 3 semaines ─────────────────────────────────────────────┘

S39  | T2.1 (Solidarité scaling 100→500)
     │                    | T2.2 (Services packaging)
     │                    │                | T2.3 (Freemium pilot)
     └─ 4 semaines ────────────────────────────────────────────┘

S41  | T3.1 (White Label pilot) | T3.2 (Communes scaling 500→1500)
     └─ 4 semaines ────────────────────────────────────────────┘

S43  | T4.1 (Advertising MVP) | T4.2 (Data Reports)
     └─ 8 semaines ────────────────────────────────────────────┘
```

---

## 💰 FINANCIAL IMPACT

| Horizon | Communes | EPCI | Services | Ads | Data | **Total ARR** |
|---------|----------|------|----------|-----|------|--------------|
| **S37 (baseline)** | 77k€ | 0€ | 0€ | 0€ | 0€ | **82k€** |
| **S39 (+100 Solidarité)** | 250k€ | 50k€ | 20k€ | 0€ | 0€ | **400k€** (5×) |
| **S41 (+1500 total)** | 1.2M€ | 300k€ | 100k€ | 300k€ | 60k€ | **2.2M€** (27×) |
| **S43 (scaling)** | 4M€ | 750k€ | 300k€ | 2M€ | 240k€ | **7.4M€** (90×) |

**Key drivers :**
- ✅ Solidarité = 500 communes × 19€ × 12 = 114k€ (low ARR but high volume)
- ✅ Prop A EPCI = 150 EPCI × 2,500€ = 375k€ (high margin)
- ✅ Advertising = 500 communes × 200€/mois = 120k€/mois (if proven)
- ✅ Data Reports = 10 clients × 2k€ = 240k€/an

---

## 🎯 SUCCESS CRITERIA

### S39 (3 mois)
- [ ] 5 EPCI Prop A opérationnelles (100% nouveau modèle)
- [ ] 100 communes Solidarité (19€/mois)
- [ ] Page /pricing productionalized
- [ ] ARR = 400k€ (5× baseline)

### S41 (6 mois)
- [ ] 150 EPCI Prop A
- [ ] 500 communes Solidarité
- [ ] 1 500 communes totales
- [ ] 20 clients Services (Training/SLA/White Label)
- [ ] 50 communes Freemium (pilot results)
- [ ] ARR = 2.2M€ (27× baseline)

### S43 (1 an)
- [ ] 300+ EPCI
- [ ] 2 000+ communes
- [ ] 5 White Label régionaux
- [ ] Advertising MVP profitable
- [ ] Data Reports 10+ clients
- [ ] ARR = 7.4M€ (90× baseline)

---

## ⚠️ RISQUES & MITIGATIONS

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Solidarité cannibalize Nano | Medium | Medium | Pricing wall (19€ vs 49€) + population guard |
| Freemium < engagement vs paid | Medium | Low | Fail fast (3 mois pilot), abandon si bad |
| Advertising saturation (user experience) | Low | High | Start conservative, A/B test ad placements |
| EPCI Prop A transition friction | Medium | Medium | Pilot with 5 volunteers, discounts early |
| White Label ops overhead | Low | Low | Partner manages moderation (not you) |
| Data privacy (RGPD) | Low | Critical | Anonymisation strict, legal review before launch |

---

## 👥 ÉQUIPE REQUISE

| Rôle | Effort | Timeline | Notes |
|------|--------|----------|-------|
| **Product (vous)** | 40% | S37-S43 | Stratégie, priorités, décisions |
| **Développeur backend** | 60% | S37-S41 | Prop A setup, Services, Ads |
| **Commercial** | 80% | S37-S43 | Sourcing EPCI, maires, partenaires |
| **Success Manager** | 40% | S39-S43 | Onboarding communes, services |
| **Designer/UX** | 20% | S37-S39 | Pricing page, ads dashboard |

---

## 📞 NEXT STEPS (CETTE SEMAINE)

1. ✅ **Valider Proposition A** avec vous (100% alignement)
2. ✅ **Identifier 5 EPCI pilot** (hétérogènes, < 50k communes)
3. ✅ **Déployer /pricing.tsx** (test en prod)
4. ✅ **Structurer campaign Solidarité** (messaging, targeting)
5. ✅ **Définir timeline exact** (S37 start date)

---

**Généré par Claude — 26 juin 2026**

Prochaine étape : Audit EPCI pilot pour Proposition A.
