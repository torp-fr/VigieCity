# Tarification — Formulaire de Décision Finale

**Date :** 26 juin 2026  
**Status :** Awaiting your input  
**Next step :** Répondez à ces 4 questions → intégration immédiate `/pricing.tsx`

---

## ❓ Q1 : Tier 2-5 Pricing (Bourg, Local, Urbain, Métropole, Capitale)

**Votre candidat était :** 34.90 / 49.90 / 79 / 99 / 129 / 149 / 199 €  
**Mais incomplètement spécifié pour tous les tiers.**

**Choisissez une option :**

```
┌─────────────────────────────────────────────────────────────┐
│ OPTION A : CONSERVATIVE (easier sell to small communes)    │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Citoyen (freemium) <500         : GRATUIT           │
│ Tier 2: Bourg         501–3,500 hab    : 49€/mois (490€/an)│
│ Tier 3: Local         3,501–10k hab    : 99€/mois (990€/an)│
│ Tier 4: Urbain        10k–25k hab      : 189€/mois         │
│ Tier 5: Métropole     25k–50k hab      : 390€/mois         │
│ Tier 6: Capitale      50k+ hab         : 590€/mois         │
├─────────────────────────────────────────────────────────────┤
│ Avantages : Easy upgrade path (49→99→189), aligned your    │
│ Tier 2 candidate (49€), conservative growth strategy       │
│ Revenue (1000 communes adoption) : 1.8M€/an                │
└─────────────────────────────────────────────────────────────┘

OPTION A ☐
```

```
┌─────────────────────────────────────────────────────────────┐
│ OPTION B : PREMIUM (aggressive, higher revenue)            │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Citoyen (freemium) <500         : GRATUIT           │
│ Tier 2: Bourg         501–3,500 hab    : 69€/mois (690€/an)│
│ Tier 3: Local         3,501–10k hab    : 129€/mois(1,290€) │
│ Tier 4: Urbain        10k–25k hab      : 249€/mois         │
│ Tier 5: Métropole     25k–50k hab      : 499€/mois         │
│ Tier 6: Capitale      50k+ hab         : 799€/mois         │
├─────────────────────────────────────────────────────────────┤
│ Avantages : Higher margin, premium positioning, value-   │
│ based pricing (reflects full feature set)                  │
│ Revenue (1000 communes adoption) : 2.4M€/an               │
│ Risk : slower adoption, higher churn                      │
└─────────────────────────────────────────────────────────────┘

OPTION B ☐
```

```
┌─────────────────────────────────────────────────────────────┐
│ OPTION C : VALUE LEADER (undercut competitors)             │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Citoyen (freemium) <500         : GRATUIT           │
│ Tier 2: Bourg         501–3,500 hab    : 39€/mois (390€/an)│
│ Tier 3: Local         3,501–10k hab    : 79€/mois (790€/an)│
│ Tier 4: Urbain        10k–25k hab      : 149€/mois         │
│ Tier 5: Métropole     25k–50k hab      : 349€/mois         │
│ Tier 6: Capitale      50k+ hab         : 499€/mois         │
├─────────────────────────────────────────────────────────────┤
│ Avantages : Fast acquisition, competitive pricing,         │
│ network effects from volume                                │
│ Revenue (1000 communes adoption) : 1.2M€/an               │
│ Risk : Lower margin, need ad revenue to offset            │
└─────────────────────────────────────────────────────────────┘

OPTION C ☐
```

```
┌─────────────────────────────────────────────────────────────┐
│ OPTION D : CUSTOM (enter your prices below)                │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Citoyen       <500             : FREE              │
│ Tier 2: Bourg         501–3,500        : ___€/mois         │
│ Tier 3: Local         3,501–10k        : ___€/mois         │
│ Tier 4: Urbain        10k–25k          : ___€/mois         │
│ Tier 5: Métropole     25k–50k          : ___€/mois         │
│ Tier 6: Capitale      50k+             : ___€/mois         │
└─────────────────────────────────────────────────────────────┘

OPTION D ☐ (prices : ________________________)
```

**→ Select ONE and specify exact prices**

---

## ❓ Q2 : Tier 1 Naming

**Tier <500 hab : "Citoyen" ou alternative ?**

```
OPTION A : CITOYEN ☐
  Why : Emphasize citizen-first, freemium DNA, community
  
OPTION B : SOLIDARITÉ ☐
  Why : Emphasize affordability, social mission
  
OPTION C : MICRO ☐
  Why : Simple, aligns with microservices naming
  
OPTION D : LIBRE ☐
  Why : "Free/open", freemium positioning
  
OPTION E : STARTER ☐
  Why : Entry-level, no setup friction

OTHER : _________________ ☐
```

**→ Select ONE**

---

## ❓ Q3 : Freemium Content Moderation

**Citizens post signalements/urgences sans city partner. Moderation policy ?**

```
OPTION A : AUTO-MODERATE ☐
  Method : Filter profanity, spam (AI-based)
  Pro : Reduce bad content, faster
  Con : False positives, manual review needed
  
OPTION B : MANUAL REVIEW ☐
  Method : Approve before visible (24h SLA)
  Pro : Control quality, professional
  Con : Slow, overhead cost
  
OPTION C : CITIZEN MODERATION ☐
  Method : Community reports (flag/upvote system)
  Pro : Scalable, community-driven
  Con : Potential for abuse
  
OPTION D : NO MODERATION (LAUNCH FIRST) ☐
  Method : Post immediately, caveat emptor
  Pro : Fast launch, user trust issue = risk mgmt later
  Con : City joins → sees bad content → leaves (churn risk)
  
OPTION E : HYBRID (AUTO + CITIZEN) ☐
  Method : Auto-filter + community reporting layer
  Pro : Best of both
  Con : Complex UX
```

**→ Select ONE (recommend HYBRID for Phase 1)**

---

## ❓ Q4 : Pioneer Discount (EPCI Year 1)

**You already said :** -15% best of [15% discount vs 2 months free]  
**= 2 months free (always wins)**

**Question :** Does 2-month free apply to :

```
OPTION A : EPCI ONLY ☐
  EPCI year 1 : -2 months
  Communes year 1 : no discount
  
OPTION B : EPCI + TIER 3-6 (urban communes) ☐
  EPCI year 1 : -2 months
  Local/Urbain/Métropole/Capitale year 1 : -1 month (scaled)
  Bourg/Citoyen : no discount
  
OPTION C : ALL TIERS (community launch incentive) ☐
  Everyone year 1 : -1 to -2 months
  Pro : Fast adoption, network effects
  Con : Lower Y1 revenue
  
OPTION D : CUSTOM _____________________ ☐
```

**→ Select ONE and specify if needed**

---

## 📋 SUMMARY TABLE (Complete when answered)

```
┌──────────────────────────────────────────────────────────────┐
│ FINAL TARIFICATION (Fill in from decisions above)            │
├──────────────────────────────────────────────────────────────┤
│ Tier 1: ________ <500             : FREE / 19€?            │
│ Tier 2: ________ 501–3,500        : ___€/mois              │
│ Tier 3: ________ 3,501–10k        : ___€/mois              │
│ Tier 4: ________ 10k–25k          : ___€/mois              │
│ Tier 5: ________ 25k–50k          : ___€/mois              │
│ Tier 6: ________ 50k+             : ___€/mois              │
├──────────────────────────────────────────────────────────────┤
│ FREEMIUM MODERATION     : [selected option]                 │
│ PIONEER DISCOUNT        : 2 months free → [scope]           │
│ EPCI MODEL              : Aggregation + reductions ✓         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 AFTER YOU COMPLETE THIS FORM

1. ✅ I update `/pricing.tsx` with your exact prices
2. ✅ I update database schema for new tier names
3. ✅ I create moderation config for freemium
4. ✅ I update homepage messaging (freemium positioning)
5. ✅ We launch S37 with finalized structure

---

## 📧 HOW TO SUBMIT

Reply with:
- **Q1 answer** (Option A/B/C/D + exact prices)
- **Q2 answer** (Tier 1 name)
- **Q3 answer** (Moderation policy)
- **Q4 answer** (Pioneer scope)

**Example :**
```
Q1: OPTION A (49/99/189/390/590)
Q2: CITOYEN
Q3: HYBRID (AUTO + CITIZEN)
Q4: EPCI ONLY (2 months free, EPCI year 1 only)
```

---

**Ready to finalize ? 👇**
