# VigieCity — Index Complet Tarification & Stratégie commerciale

**Date :** 26 juin 2026  
**Généré par :** Claude (Cowork mode)  
**Scope :** Modèle économique optimisé + roadmap 6 mois  

---

## 📚 DOCUMENTS CRÉÉS (4 fichiers)

### 1. **MEMO_EXECUTIF_TARIFICATION.md** ⭐ LIRE EN PREMIER

**Durée :** 3 min  
**Pour qui :** Vous (décisions rapides)  
**Contient :**
- Résumé 3 propositions clés
- Impact financier (27× ARR en 6 mois)
- Clarification votre question EPCI
- Quick decision form

**Actionable :** Liste exacte des décisions à valider cette semaine

---

### 2. **ANALYSE_ECONOMIQUE_COMPLÈTE.md**

**Durée :** 20 min lecture  
**Pour qui :** Équipe commerciale + product  
**Contient :**
- **PART 1 :** Modèle actuel (grilles publiques, EPCI, logique)
- **PART 2 :** Problématiques identifiées (4 issues : EPCI plate, petites communes, Chorus Pro, advertising)
- **PART 3 :** 5 propositions tarifaires optimisées
  - **Prop A :** EPCI agrégation communes + réductions progressives ⭐ CLÉE
  - **Prop B :** Solidarité 19€/mois pour < 500 hab
  - **Prop C :** Freemium gratuit + ads (optionnel)
  - **Prop D :** Bundles parrainage EPCI
  - **Prop E :** Éléments commercialisables manquants (SLA, Training, White Label, Ads, Data)
- **PART 4 :** Scénarios financiers (baseline vs Prop A+B vs full portfolio)
- **PART 5 :** Clarification EPCI (votre question exactement)
- **PART 6 :** Recommendations

**Décisions requises :**
- [ ] Valider Prop A (nouveau modèle EPCI)
- [ ] Valider Solidarité (19€ villages)
- [ ] Valider Services (Training/SLA/WL)
- [ ] Décider Freemium (pilot ou skip)

---

### 3. **/pricing.tsx** (Page production)

**Type :** Code React (composant route)  
**Pour qui :** Frontend dev  
**Contient :**
- ✅ **Communes Tab :** 6 plans (Solidarité, Nano, Micro, Local, Urbain, Métropole)
- ✅ **EPCI Tab :** Comparaison ancien vs nouveau modèle + table réductions
- ✅ **Services Tab :** 6 services additionnels (Training, SLA, White Label, etc.)
- ✅ **Calculateur Tab :** Simulateur EPCI interactif (+ communes, calcule coût final)

**Features :**
- Responsive design (mobile-first)
- Color-coded plans (visual hierarchy)
- Interactive calculator (adds communes, shows reductions)
- Transparency (show breakdown pricing)

**Installation :**
```bash
# Remplacer l'ancienne page /pricing dans routes/
cp _delivery/src/routes/pricing.tsx [vercel-deploy]

# Test localement
npm run dev  # -> http://localhost:3000/pricing
```

**What's new :**
- Plan "Solidarité" (19€)
- EPCI section with new model
- Services pricing visible
- Live calculator for EPCI

---

### 4. **ROADMAP_COMMERCIALE.md**

**Durée :** 30 min lecture  
**Pour qui :** You (product strategy)  
**Contient :**
- **Objectives :** ARR 82k€ → 7.4M€ en 1 an (90×)
- **Phase 1 (S37-S38, 3 sem) :** Prop A pilot 5 EPCI, Solidarité launch, /pricing deploy
- **Phase 2 (S39-S40, 4 sem) :** Solidarité scaling (100→500), Services packaging, Freemium pilot
- **Phase 3 (S40-S41, 4 sem) :** White Label pilot, Communes scaling (500→1500)
- **Phase 4 (S41-S43, 8 sem) :** Advertising MVP, Data Reports monetization
- **Gantt :** Timeline visuelle 26 semaines
- **Financials :** Par phase (revenue breakdown)
- **Team required :** Roles + effort % + timeline
- **Risks & mitigations :** 6 risques identifiés

**Key milestones :**
- S37 : 5 EPCI Prop A signing
- S39 : 100 Solidarité communes
- S41 : 1 500 communes total, 150 EPCI, ARR 2.2M€
- S43 : 2 000+ communes, ARR 7.4M€

**Success criteria :**
- [ ] S39 : ARR 400k€ (5×), 5 EPCI live
- [ ] S41 : ARR 2.2M€ (27×), 1500 communes
- [ ] S43 : ARR 7.4M€ (90×), full portfolio

---

## 🎯 STARTING WORKFLOW

### DAY 1 (Aujourd'hui)
1. ✅ Lire `MEMO_EXECUTIF_TARIFICATION.md` (3 min)
2. ✅ Remplir Quick Decision Form (1 min)

### DAY 2-3
1. ✅ Lire `ANALYSE_ECONOMIQUE_COMPLÈTE.md` (20 min)
2. ✅ Review financial impact (5 min)
3. ✅ Validate / adjust propositions

### DAY 4-7 (CETTE SEMAINE)
1. ✅ Identifier 5 EPCI pilot (contacter par téléphone)
2. ✅ Déployer `/pricing.tsx` en prod (test 4h)
3. ✅ Lancer campaign Solidarité (mailchimp + LinkedIn)
4. ✅ Assigner commercial budget (2k€ test)

### WEEK 2-3 (S37-S38)
1. ✅ Signer 5 contrats EPCI Prop A
2. ✅ Onboard 100 communes Solidarité (1 mois test gratuit)
3. ✅ Monitor /pricing analytics (conversions, engagement)

---

## 💼 QUICK REFERENCE TABLE

| Prop | Name | Target | Monthly | Annual | Revenue (500 adoption) | Risk |
|------|------|--------|---------|--------|-----------|------|
| **A** | EPCI Aggregation | 150 EPCI | 1,900€ avg | 22,800€ | 375k€/an | Transition friction |
| **B** | Solidarité | 500 villages | 19€ | 190€ | 114k€/an | Churn if low engagement |
| **C** | Freemium | 200 ultra-small | 0€ | 0€ | Ad-dependent | User experience |
| **D** | Services | 50 communes | 2k€ avg | +15% | 50k€/an | Low attach rate |
| **E** | White Label | 5 regions | 5k€ + 100€/commune | 25k€ | 125k€/an | Ops overhead |

---

## 🔍 DECISION TREE

```
START
  ↓
Approve Prop A (EPCI) ?
  ├─→ YES : Pilot 5 EPCI S37
  └─→ NO  : Use current model (risk: EPCI churn)
  
Approve Solidarité ?
  ├─→ YES : Launch S37, campaign 2k€
  └─→ NO  : Ignore 5k villages (risk: competitor enters)

Approve Services ?
  ├─→ YES : Package + sales toolkit S39
  └─→ NO  : Skip upsell (risk: revenue left on table)

Approve Freemium pilot ?
  ├─→ YES : 50 communes, 3 months, decide after
  └─→ NO  : Focus on Solidarité (safer)

All approved ? → Proceed Roadmap S37-S43
```

---

## 📊 FINANCIALS AT A GLANCE

**Baseline (S37) :**
- 35 communes = 77k€/an
- 0 EPCI = 0€
- Total = **82k€ ARR**

**Conservative (S39, Prop A+B only) :**
- 250 communes (incl. 100 Solidarité) = 250k€
- 20 EPCI Prop A = 50k€
- Services baseline = 20k€
- Total = **320k€ ARR** (4×)

**Aggressive (S41, full portfolio) :**
- 1 500 communes = 1.2M€
- 150 EPCI Prop A = 375k€
- 50+ Services = 100k€
- Advertising early revenue = 300k€
- Data Reports = 60k€
- Total = **2.2M€ ARR** (27×)

**Full scaling (S43+) :**
- All above + White Label + Freemium + full Ads
- Total = **7.4M€ ARR** (90×)

---

## ⚡ CRITICAL DATES

| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| **26/06/2026** | Documents ready | ✅ Done | ✅ |
| **27/06/2026** | Validate Prop A + decisions | You | ⏳ This week |
| **28/06/2026** | Identify 5 EPCI pilot | You | ⏳ This week |
| **01/07/2026** | Deploy /pricing.tsx | Dev | ⏳ This week |
| **S37 Week 1** | EPCI pilot contracts signed | You | ⏳ Upcoming |
| **S37 Week 2** | Solidarité campaign launch | Commercial | ⏳ Upcoming |
| **S39 Week 1** | 5 EPCI operationalized | Dev | ⏳ 4 weeks |
| **S39 Week 2** | Services packaging ready | Commercial | ⏳ 4 weeks |
| **S41 End** | 1500 communes, 2.2M€ ARR | Team | 🎯 Goal |

---

## 🚨 BLOCKERS & DEPENDENCIES

**For S37 launch :**
- [ ] Validate decisions (ASAP)
- [ ] Deploy /pricing.tsx (48h)
- [ ] Identify 5 EPCI (phone calls)

**For S39 scaling :**
- [ ] Solidarité campaign running (from S37 day 1)
- [ ] EPCI pilot operational (require Prop A database changes)
- [ ] Commercial headcount (if targeting 500 Solidarité)

**For S41+ :**
- [ ] Advertising infrastructure (MVP can be mocked first)
- [ ] Data anonymization (RGPD legal review)
- [ ] White Label ops (partner moderation TBD)

---

## 📞 CONTACTS & APPROVALS

**Approvals needed :**
1. **You (Baptiste) :** Validate Prop A + Solidarité + Services
2. **Dev lead :** Estimate /pricing.tsx deployment (48h?)
3. **Legal/RGPD :** Review data monetization (Part 5)
4. **Commercial/Sales :** Budget allocation (2k€ test campaign)

**Action items for you :**
1. Read `MEMO_EXECUTIF_TARIFICATION.md` (3 min)
2. Fill Quick Decision Form
3. Schedule 30-min call to finalize plan

---

## 📖 READING ORDER RECOMMENDED

### Executive track (you, 1 hour total)
1. ✅ This file (INDEX) = 5 min context
2. ✅ `MEMO_EXECUTIF_TARIFICATION.md` = 3 min decisions
3. ✅ `ANALYSE_ECONOMIQUE_COMPLÈTE.md` PART 1-3 = 15 min (Prop A+B+C)
4. ✅ `ROADMAP_COMMERCIALE.md` Phase 1-2 = 20 min (S37-S40)
5. ✅ Financial summary = 10 min verify

### Technical track (dev, 2 hours total)
1. ✅ `/pricing.tsx` code = 30 min (understand component)
2. ✅ `ANALYSE_ECONOMIQUE_COMPLÈTE.md` PART 5 = 15 min (infrastructure needs)
3. ✅ `ROADMAP_COMMERCIALE.md` Timeline = 30 min (estimate effort)
4. ✅ Database schema changes = 30 min (design Prop A storage)
5. ✅ Deployment plan = 15 min

### Commercial track (sales, 2 hours total)
1. ✅ `MEMO_EXECUTIF_TARIFICATION.md` = 3 min (decisions)
2. ✅ `ANALYSE_ECONOMIQUE_COMPLÈTE.md` PART 2 + 5 = 20 min (positioning)
3. ✅ `ROADMAP_COMMERCIALE.md` Phase 1-2 + Services = 30 min (timeline)
4. ✅ Competitor analysis = 30 min (how differentiate)
5. ✅ Campaign planning (Solidarité) = 30 min

---

## 🎁 BONUS : TALKING POINTS

**For EPCI pitch :**
> "Nous passons d'une tarification 'population totale' opaque à un modèle 'agrégation communes' transparent. Vous voyez exactement le coût de chaque commune, et vous économisez via réductions progressives. C'est plus juste et incentive le parrainage."

**For village pitch (Solidarité) :**
> "VigieCity Solidarité : 19€/mois pour les petites communes. Modules essentiels (signalements, alertes, agenda), support FAQ, pas de frais cachés. 1 mois gratuit pour tester."

**For investor pitch :**
> "27× ARR growth en 6 mois via 3 propositions : nouvelle tarification EPCI (juste, transparent), offre Solidarité pour petites communes (5k marché), services additionnels (upsell 80% margin). Roadmap S37-S43 validée."

---

**Généré par Claude — 26 juin 2026**

**Questions ?** Lire `MEMO_EXECUTIF_TARIFICATION.md` d'abord.
