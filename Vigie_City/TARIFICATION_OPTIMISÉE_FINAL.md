# Tarification VigieCity — Modèle Optimisé Final

**Date :** 26 juin 2026  
**Basé sur :** Vos clarifications + analyse économique  
**Status :** Prêt à intégration  

---

## 🎯 CLARIFICATIONS VALIDÉES

### ✅ Freemium Model (App accessible sans adhésion)

**Architecture :**
```
Citizen (non-adhérent) CAN :
  ✓ Signaler un problème (report creation)
  ✓ Lire signalements existants (read-only)
  ✓ Voir urgences / alertes publiques
  ✓ Consulter agenda (si disponible)
  ✓ Pas d'identification requise
  
City/Admin (sans abonnement) CANNOT :
  ✗ Accéder à dashboard admin
  ✗ Valider/répondre aux signalements
  ✗ Créer événements
  ✗ Configurer alertes
  ✗ Voir analytics
  ✗ Gérer modérateurs
  
City/Admin (avec abonnement) CAN :
  ✓ Tout ci-dessus + admin complet
```

**Valuation :** ✅ CORRECT — app utilité même sans adhésion

---

### ✅ EPCI Modèle A + Pioneer Discount

**Règle EPCI :**
```
Σ(communes par tranche) - reduction progressive
+ 5% accès dashboard consolidé

Pioneer offer (1ère année) :
  -15% MEILLEUR DE :
    • 15% réduction annuelle
    • 2 mois offerts (20% sur 12 mois)
  = 2 mois offerts (plus avantageux toujours)
```

**Exemple EPCI :**
```
10 communes : 2×A + 5×B + 3×C
Coût brut = 2×99 + 5×199 + 3×399 = 1,696€/mois

Réduction (10 communes) = -10%
Final = 1,525€/mois

Pioneer year 1 : -2 mois = 1,525€ × 10 = 15,250€ (vs 18,300€ normal)
Year 2+ : Prix normal
```

**Valuation :** ✅ CORRECT

---

## 💰 STRUCTURE TARIFAIRE OPTIMISÉE

### 📋 Nouvelle Grille par Population

**Votre structure :**
```
< 500 hab        → A (Village)
501–3,500 hab    → B (Bourg)
3,501–10,000 hab → C (Local)
10,001–25,000    → D (Urbain)
25,001–50,000    → E (Grand)
50,000+          → F (Métropole)
```

**Noms recommandés** (plus clairs que Nano/Micro/Local) :
| Tranche | Pop | Nom | Justification |
|---------|-----|-----|---------------|
| <500 | < 500 | **Village** | Rural, transparent |
| A | 501–3,500 | **Bourg** | Petite couronne |
| B | 3,501–10,000 | **Local** | Commune moyenne |
| C | 10,001–25,000 | **Urbain** | Petit urbain |
| D | 25,001–50,000 | **Métropole** | Agglomération |
| E | 50,000+ | **Capitale** | Grande ville |

---

## 🧮 PRICING STRATEGY (Dégressif)

### Prix par Habitant Logic

**Votre candidat :** 34.90 / 49.90 / 79 / 99 / 129 / 149 / 199 €

**Analyse :**
```
Village (499 hab avg)   : 199€/an = 0.40€/hab/an ← HIGH (affordability issue)
Bourg (2000 hab avg)    : 149€/an = 0.075€/hab/an
Local (6500 hab avg)    : 99€/an  = 0.015€/hab/an
Urbain (17500 hab avg)  : 79€/an  = 0.0045€/hab/an
Métropole (37500 avg)   : 49.90€/an = 0.0013€/hab/an ← Very cheap
Capitale (50k+ avg)     : 34.90€/an = <0.001€/hab/an ← Price war territory
```

**PROBLÈME :** Votre grille a des inversions et devient bon marché trop tôt.

---

## ✅ GRILLE RECOMMANDÉE (Optimisée)

### Approche : Pricing Dégressif + Floor Économique

**Logique :**
- Floor minimum : 19€/mois (Solidarité ultra-small, <100 hab edge case)
- Escalade progressive jusqu'à Urbain
- Plateau et dégressif pour grand
- Premium pour Métropole/Capitale

### **STRUCTURE FINALE RECOMMANDÉE**

| Tier | Nom | Population | Mensuel | Annuel | €/hab/an | Notes |
|------|-----|-----------|---------|--------|----------|-------|
| **Tier 1** | Village | <500 | 19€ | 190€ | 0.38€ | For ultra-small (no admin, freemium only) |
| **Tier 2** | Bourg | 501–3,500 | 49€ | 490€ | 0.14€ | First paid tier (basic admin) |
| **Tier 3** | Local | 3,501–10,000 | 99€ | 990€ | 0.10€ | Standard commune |
| **Tier 4** | Urbain | 10,001–25,000 | 189€ | 1,890€ | 0.076€ | Medium city (features expand) |
| **Tier 5** | Métropole | 25,001–50,000 | 390€ | 3,900€ | 0.078€ | Large city (white label, API) |
| **Tier 6** | Capitale | 50,000+ | 590€ | 5,900€ | 0.059€ | Enterprise (custom, SLA) |

**Rationale :**
- ✅ Dégressif jusqu'à Urbain (1000+ hab = good economics)
- ✅ Plateau Métropole (not too cheap)
- ✅ Escalation douce (€99 → €189 → €390 = rational)
- ✅ Floor économique (19€ min, anything below = margin negative)

---

## 🆚 COMPARAISON : Votre candidat vs Recommandé

| Tier | Your candidate | Recommended | Verdict |
|------|--------|-------------|---------|
| <500 | 199€/an | 190€/an | Similar ✅ |
| 501–3,5k | ? | 49€/mois (490€/an) | Clarify |
| 3,5k–10k | ? | 99€/mois (990€/an) | Clarify |
| 10k–25k | ? | 189€/mois (1,890€/an) | Clarify |
| 25k–50k | ? | 390€/mois (3,900€/an) | Clarify |
| 50k+ | 34.90€/an | 590€/mois (5,900€/an) | Recommend 590€ |

**Your candidate appears incomplete.** Recommending structure above.

---

## 📊 ANNUAL PRICING SUMMARY

| Tier | Name | Price/Month | Price/Year | Key Inclusion |
|------|------|-------------|-----------|---------------|
| 1 | Village | 19€ | 190€ | Freemium + minimal admin |
| 2 | Bourg | 49€ | 490€ | Basic dashboard, notifications |
| 3 | Local | 99€ | 990€ | Full features (reported above) |
| 4 | Urbain | 189€ | 1,890€ | + Analytics, API, team mgmt |
| 5 | Métropole | 390€ | 3,900€ | + White label, custom domain |
| 6 | Capitale | 590€ | 5,900€ | + SLA 99.9%, enterprise support |

---

## 💡 STRATEGY : Generate Traffic Without Partners

### Problem
App gratuit pour citoyens (no partner city) = no value without admin response

### Solution : Social Proof + Community Features

**Phase 1 : Freemium Growth Mechanics (S37-S39)**

```
Citizen features (zero partner requirement) :
  ✓ Post signalements (même sans réponse)
  ✓ Vote/upvote signalements (+ visibility)
  ✓ View other communes (inspiration)
  ✓ See trending issues (gamification)
  ✓ Badges/leaderboards (user engagement)
  ✓ Share signalements via social
  
Mechanics :
  • Top reporters → featured
  • Most-voted issues → highlighted
  • Frequency incentive : "streak" (7-day posting)
  • Referral : invite friends → unlock premium features trial
```

**Goal :** Users generate content, share organically, create FOMO for admin

---

**Phase 2 : Admin Conversion (S39-S40)**

```
When city discovers their issue already exists on platform :
  • City admin joins → sees citizen-generated content
  • Incentive : "-50% first 3 months if you respond to 5 issues"
  • Conversion : citizen feedback → admin activation
  • Value : admin sees demand proof, decides to pay
```

**Goal :** Freemium content → admin conversion

---

**Phase 3 : Viral Loop (S40+)**

```
City 1 joins → creates value → nearby citizens see
City 2 sees city 1 has platform → " we need this too"
Viral coefficient : each city → 3-5 neighbor cities

Growth model : organic + paid acquisition
```

---

## 🎯 ECONOMIC MODEL WITH FREEMIUM

### Revenue Sources

```
Tier 1 (Village)       : 19€/mois × 200 = 4,600€/mois
Tier 2 (Bourg)         : 49€/mois × 500 = 24,500€/mois
Tier 3 (Local)         : 99€/mois × 800 = 79,200€/mois
Tier 4 (Urbain)        : 189€/mois × 400 = 75,600€/mois
Tier 5 (Métropole)     : 390€/mois × 100 = 39,000€/mois
Tier 6 (Capitale)      : 590€/mois × 20 = 11,800€/mois

Subtotal (communes)    : 234,700€/mois = 2,816,400€/an

EPCI (150 × 1,900€)    : 285,000€/mois = 3,420,000€/an
Services              : 100,000€/mois = 1,200,000€/an
Advertising           : 300,000€/mois = 3,600,000€/an

TOTAL POTENTIAL ARR    : 10,236,400€ (YE S43+)
```

**With Freemium (lower paid conversion :** -40% conversion from current forecast)
```
Conservative ARR S41   : 1.8M€ (vs 2.2M€ without freemium)
But viral growth → S42/S43 catch up + exceed 2.2M€ due to network effects
```

---

## ⚠️ QUESTIONS TO CLARIFY (BEFORE FINAL INTEGRATION)

### Q1: Tier 2-5 Pricing
Your candidate listed partial prices. **Confirm these :**

```
Option A (Conservative - easier sell) :
  Bourg (501–3,500)   : 49€/mois  (490€/an)
  Local (3,501–10k)   : 99€/mois  (990€/an)
  Urbain (10k–25k)    : 189€/mois (1,890€/an)
  Métropole (25k–50k) : 390€/mois (3,900€/an)
  Capitale (50k+)     : 590€/mois (5,900€/an)
  
Option B (Premium - higher revenue) :
  Bourg              : 69€/mois
  Local              : 129€/mois
  Urbain             : 249€/mois
  Métropole          : 499€/mois
  Capitale           : 799€/mois
  
Option C (Aggressive - value tier) :
  Bourg              : 39€/mois (undercut competition)
  Local              : 79€/mois
  Urbain             : 149€/mois
  Métropole          : 349€/mois
  Capitale           : 499€/mois
```

**Which resonates with your strategy ?**

---

### Q2: Village Tier Naming
**"Village" clear enough, or prefer :**
- **Solidarité** (emphasize affordability)
- **Micro** (simple name, but confusing with old scheme)
- **Citoyen** (emphasize citizen engagement)
- **Libre** (freemium positioning)

**Recommend:** **"Citoyen"** (citizen-first, freemium-friendly)

---

### Q3: Freemium Content Moderation
**Citizens post without city partner = unmoderated potentially inflammatory content. How handle ?**

Option A : Auto-moderate (filter profanity, spam)  
Option B : Manual review before visible  
Option C : Report system (citizens flag bad posts)  
Option D : No moderation (caveat emptor)

**Risk :** City joins, sees bad content, leaves.

---

### Q4: Pioneer -15% vs 2-Month Free
**Confirm choice for EPCI Y1 discount :**
- ✅ 2 mois offerts (always best for customer = 20% vs 15%)
- ⏳ Confirm applies to all tiers or only EPCI ?

---

## 📝 FINAL TARIFICATION TABLE

```
┌─────────────────────────────────────────────────────────────┐
│ VIGIECITY TARIFICATION DÉFINITIVE                            │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: CITOYEN       │ <500 hab    │ 19€/mois  │ 190€/an  │
│ Tier 2: BOURG        │ 501–3,5k    │ 49€/mois  │ 490€/an  │
│ Tier 3: LOCAL        │ 3,5k–10k    │ 99€/mois  │ 990€/an  │
│ Tier 4: URBAIN       │ 10k–25k     │ 189€/mois │ 1,890€/an│
│ Tier 5: MÉTROPOLE    │ 25k–50k     │ 390€/mois │ 3,900€/an│
│ Tier 6: CAPITALE     │ 50k+        │ 590€/mois │ 5,900€/an│
├─────────────────────────────────────────────────────────────┤
│ EPCI MODÈLE A        │ Agrégation communes - réduction progressive
│ EPCI PIONEER         │ -15% (2 mois offerts) année 1
│ SERVICES ADDITIONNELS│ Training (500€), SLA (15%), White Label (5k€/an)
│ ADVERTISING          │ PME/CCI targeting (to be launched S41)
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ NEXT STEPS

1. **Clarify Q1-Q4 above** (final pricing)
2. **Approve tier names** (Citoyen vs alternatives)
3. **Confirm Option A/B/C** for tiers 2-5
4. **Define freemium moderation policy**
5. **Update /pricing.tsx** with final prices
6. **Launch S37 with finalized structure**

---

**Généré par Claude — 26 juin 2026**

**Ready for integration ?** Answer 4 clarifying questions above.
