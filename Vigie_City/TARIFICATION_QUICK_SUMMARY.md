# VigieCity Tarification — Quick Summary

**Status :** ✅ VALIDÉE & PRÊTE À DÉPLOYER  
**Date :** 26 juin 2026  
**Next:** Intégration dev (48h)

---

## ✅ CE QUI A ÉTÉ DÉCIDÉ

### Tier pricing (FINAL)

```
Hameau   (< 500 hab)      : 19€/mois   (190€/an)
Village  (501–3,500)      : 49€/mois   (490€/an)
Bourg    (3,501–10k)      : 99€/mois   (990€/an)
Bastide  (10k–25k)        : 189€/mois  (1,890€/an)
Cité     (25k–50k)        : 390€/mois  (3,900€/an)
Métropole (50k+)          : 590€/mois  (5,900€/an)
```

### Freemium model

```
App accessible WITHOUT city subscription :
  ✓ Signalements citoyens
  ✓ Urgences publiques
  ✓ Consultation agenda
  ✗ Admin dashboard (requires subscription)
  
Moderation : Hybrid (auto-filter + citizen reporting)
  • Auto-filter spam/profanity
  • Super-admin reviews flagged content (24h)
  • Once city subscribes → city auto-fetches their reports
  • City moderates own municipality
```

### Pioneer discount (Y1)

```
ALL new customers (commons + EPCI) :
  -15% best of [15% discount vs 2 months free]
  = 2 MONTHS FREE
  
Applies : All tiers, year 1 only
Purpose : Fast adoption, network effects, feedback loop
```

### EPCI Model A

```
Aggregation communes + progressive reductions :
  Σ(communes by tier) - reduction (2-20%) + 5% consolidation
  
Example : 10 communes = 2 Hameau + 5 Village + 3 Bourg
  = (2×19 + 5×49 + 3×99) - 10% + 5% = ~1,100€/mois
```

### Feature access

```
✅ ALL tiers have FULL feature access
❌ Difference = monitoring window (analytics depth)

Hameau     : 30-day window, no API
Village    : 30-day basic + 90-day advanced
Bourg      : 1-year trend analysis
Bastide    : 5-year custom date range
Cité       : All-time + dedicated account manager
Métropole  : SLA 99.9%, custom infrastructure option
```

---

## 📋 FILES CREATED (7 total)

| File | Purpose | For |
|------|---------|-----|
| `TARIFICATION_FINALE_VALIDÉE.md` | Complete spec | Dev |
| `TARIFICATION_OPTIMISÉE_FINAL.md` | Background analysis | Reference |
| `ANALYSE_ECONOMIQUE_COMPLÈTE.md` | Economic deep-dive | Commercial |
| `ROADMAP_COMMERCIALE.md` | 6-month timeline | Planning |
| `/pricing.tsx` | Page to update | Dev |
| `TARIFICATION_INDEX.md` | Navigation guide | All |
| `MEMO_EXECUTIF_TARIFICATION.md` | Exec summary | Decision-makers |

---

## 🎯 TESTING STRATEGY

```
Cohort 1 : Rural small (<1k)     → 50 communes, Hameau+Village
Cohort 2 : Urban small (5-10k)   → 30 communes, Village+Bourg
Cohort 3 : Metropolitan (20-50k) → 10 communes, Bastide+Cité
Cohort 4 : EPCI (mixed)          → 5-10 EPCI, aggregation model

Success metric : >60% adoption in rural, >40% in urban, >30% in metro
Pivot : Adjust messaging, pricing, or onboarding based on feedback
```

---

## 🚀 INTEGRATION TIMELINE

| When | What | Owner | Status |
|------|------|-------|--------|
| This week | Update `/pricing.tsx` (add final prices + tier names) | Dev | ⏳ |
| This week | Deploy freemium moderation (auto-filter + super-admin queue) | Dev | ⏳ |
| S37 W1 | Set up cohort tracking + analytics | Dev + Analytics | ⏳ |
| S37 W2 | Launch with 10 test communes + 2 EPCI | Sales + You | ⏳ |
| S37 W3 | Iterate based on feedback, scale | Product + Sales | ⏳ |

---

## 💰 EXPECTED REVENUE (VALIDATED MODEL)

```
Baseline (S37 current)       : 82k€/an
+ Tarification optimized (S41) : 2.2M€/an (27×)
+ Full portfolio (S43)        : 7.4M€/an (90×)
```

---

## ✍️ DECISIONS MADE

- ✅ Tier names (Hameau → Métropole)
- ✅ Freemium moderation (hybrid)
- ✅ Pioneer discount (all customers, 2 months free Y1)
- ✅ Feature access (all full, monitoring scope differs)
- ✅ Testing strategy (5 cohorts, adaptable)
- ✅ EPCI model (aggregation + reductions)

---

## 📞 NEXT STEP

**Dev :** Read `TARIFICATION_FINALE_VALIDÉE.md` → Update `/pricing.tsx` + freemium moderation config

**Sales :** Prepare 5-cohort outreach plan (contact list, messaging)

**You :** Validate dev implementation → launch S37 W2

---

**Estimated time to production : 48-72 hours**
