# Tarification VigieCity — Finale Validée

**Date :** 26 juin 2026  
**Status :** ✅ VALIDÉE & PRÊTE À INTÉGRATION  
**Validé par :** Baptiste + Claude  

---

## ✅ TIER NAMES & PRICING (VALIDÉ)

| Tier | Nom | Population | Mensuel | Annuel | Notes |
|------|-----|-----------|---------|--------|-------|
| 1 | **Hameau** | <500 hab | 19€ | 190€ | Freemium + minimal admin |
| 2 | **Village** | 501–3,500 | 49€ | 490€ | Basic admin dashboard |
| 3 | **Bourg** | 3,501–10k | 99€ | 990€ | Standard commune (all features) |
| 4 | **Bastide** | 10k–25k | 189€ | 1,890€ | Extended monitoring, API |
| 5 | **Cité** | 25k–50k | 390€ | 3,900€ | White label, enterprise features |
| 6 | **Métropole** | 50k+ | 590€ | 5,900€ | Custom, SLA 99.9%, enterprise support |

**Rationale des noms :**
- ✅ Français régional (Hameau, Village, Bourg, Bastide, Cité)
- ✅ Progressif & mémorable (small → large geography)
- ✅ Pas de confusion avec ancien naming (Nano, Micro, etc.)
- ✅ Culturellement transparent (commune française = commune française)

---

## ✅ FREEMIUM MODERATION (VALIDÉ + SOLUTION)

**Votre modèle :** Hybrid (auto + reporting) ✅ **CORRECT**

### Solution proposée :

**Phase 1 : Initial (no partner city)**

```
Citizen posts signalement/urgence
  ↓
Auto-filter (spam, profanity, abuse patterns)
  ↓
IF pass auto-filter :
  ├─ Visible to public immediately
  └─ Added to "Reported Issues" queue
  
IF fail auto-filter :
  ├─ Hidden (pending review)
  └─ Added to "Flagged for Review" queue
  
Super-admin (Vigie team) :
  ├─ Reviews "Flagged" items (24h SLA)
  ├─ Can approve (make public) or reject
  └─ Citizens can report bad content (upvote/flag)
     → Escalates to super-admin if N>3 reports
```

**Phase 2 : When city subscribes**

```
City admin logs in
  ↓
Auto-fetch ALL reported items in their municipality
  ├─ "Pending Responses" (city hasn't acted)
  ├─ "Resolved" (city responded)
  └─ "Escalated" (multiple citizen flags)
  
City admin actions :
  ├─ Respond to signalements (add context, resolution)
  ├─ Flag inappropriate (remove from public if needed)
  └─ View analytics (by category, time, status)
  
Automatic :
  ├─ Super-admin no longer needs to moderate THIS city
  └─ City moderates their own content
```

**Data flow :**
```
Citizen → Auto-filter → [Public OR Flagged]
                             ↓
                        Super-admin review (24h)
                             ↓
                        City subscribes
                             ↓
                        City takes over moderation
                             ↓
                        Super-admin steps back
```

### Database schema (Freemium moderation)

```sql
-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  content TEXT,
  municipality_id BIGINT,
  category TEXT,
  status ENUM ('pending_review', 'public', 'hidden', 'escalated'),
  auto_filter_score FLOAT (0-1, >0.7 = flag),
  citizen_flags_count INT DEFAULT 0,
  city_response TEXT,
  city_response_date TIMESTAMP,
  created_at TIMESTAMP,
  visible_to_public BOOLEAN
);

-- Super-admin queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports,
  status ENUM ('pending', 'approved', 'rejected', 'escalated'),
  reason TEXT,
  reviewed_by_admin VARCHAR,
  reviewed_at TIMESTAMP
);

-- When city subscribes: reports for city_id auto-fetched to city dashboard
-- City can then moderate their own municipality
```

**Pro tip :** Switch moderation owner based on `city_license.status`:
- License = NULL → super-admin moderates
- License = active → city moderates

---

## ✅ PIONEER DISCOUNT STRATEGY (VALIDÉ)

**Your clarification :** "Discount ALL pioneers, not just EPCI" ✅ **CORRECT**

### Pioneer offer Y1 :

**For ALL new signups (communes + EPCI) in S37-S38 :**

```
-15% BEST OF :
  • 15% annual discount
  • 2 months free (20% on 12 months)
  
= 2 MONTHS FREE (standard)

Terms :
  • Applies to all tiers (Hameau through Métropole)
  • Year 1 only (subsequent years = full price)
  • Manual approval (qualification: real commune/EPCI)
  • Purpose : fast adoption, network effects, proof-of-concept feedback
```

### Example calculations :

**Bourg (Village) pioneer :**
```
Annual : 490€
Pioneer discount : -2 months = 490€ × 10/12 = 408€ Y1
```

**EPCI Bourg (10 communes, 5 Villages) :**
```
Σ communes = 5×49 + 2×99 = 343€/mois
EPCI reduction (10 communes) = -10%
= 309€/mois base

Pioneer discount : -2 months
= 309€ × 10 = 3,090€ Y1 (vs 3,708€ normal)
```

**Why this works :**
- ✅ Single rule (2 months free) = easy to implement
- ✅ Scales across all tiers
- ✅ Creates FOMO ("limited time" framing)
- ✅ Fast sign-up (no complex approval logic)
- ✅ Data collection (test different commune profiles)

---

## 🧪 TESTING STRATEGY (YOUR CLARIFICATION)

**Your point :** Test different commune profiles to see what's most receptive

### Targeted S37-S38 outreach :

```
COHORT 1 : Rural small communes (<1k hab)
  │ Target : 50 communes
  │ Tier : Hameau (19€) + Village (49€)
  │ Message : "Affordable civic tech for small communities"
  │ Pioneer : -2 months free
  │ Success metric : >60% adoption, low churn
  
COHORT 2 : Urban small communes (5k–10k)
  │ Target : 30 communes
  │ Tier : Village + Bourg (99€)
  │ Message : "Complete citizen engagement platform"
  │ Pioneer : -2 months free
  │ Success metric : >40% adoption, engagement rate
  
COHORT 3 : Metropolitan mid-size (20k–50k)
  │ Target : 10 communes
  │ Tier : Bastide + Cité
  │ Message : "Enterprise citizen engagement"
  │ Pioneer : -2 months free + 1 free training session
  │ Success metric : >30% adoption, NPS score
  
COHORT 4 : EPCI (any size)
  │ Target : 5-10 EPCI
  │ Tier : Aggregation model
  │ Message : "Transparent, fair pricing for groups"
  │ Pioneer : -2 months free
  │ Success metric : >50% adoption, expansion within members
```

**Measurement :**
```
Track for each cohort :
  ✓ Adoption rate (% who sign up)
  ✓ Onboarding friction (days to active)
  ✓ Feature adoption (which features used first)
  ✓ Engagement (reports/month per commune)
  ✓ Churn (month-over-month retention)
  ✓ Upsell rate (upgrade to premium services)
  ✓ Referral rate (invite other communes)
  
Pivot point : If cohort <30% adoption → adjust messaging, pricing, or onboarding
```

**Adaptation :**
- Hameau too expensive? → drop to 15€/mois
- Village not engaging? → add free training
- EPCI loves it? → expand outreach
- Mid-size loves Bastide? → allocate more sales time there

---

## 📋 FEATURE MATRIX — ALL TIERS HAVE FULL ACCESS

### Philosophy

```
✅ ALL plans have access to ALL features
❌ Difference = monitoring scope by tier
```

### Feature breakdown by monitoring scope

| Feature | Available | Monitoring Scope | Hameau | Village | Bourg | Bastide | Cité | Métropole |
|---------|-----------|------------------|--------|---------|-------|---------|------|-----------|
| **CITIZEN FEATURES** | | | | | | | | |
| Post signalements | ✅ | Public (all tiers) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upvote/comment | ✅ | Public (all tiers) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View municipality issues | ✅ | Public (all tiers) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receive alerts | ✅ | Depends on city setup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ADMIN FEATURES** | | | | | | | | |
| Dashboard (basic) | ✅ | Last 30 days | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Respond to signalements | ✅ | All time | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create events/alerts | ✅ | No limit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team management | ✅ Limited | 5 users | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MONITORING & ANALYTICS** | | | | | | | | |
| Basic analytics | ✅ | 30-day window | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Advanced analytics | ✅ | 90-day window | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trend analysis | ✅ | 1-year rolling | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Custom date range | ✅ | All-time (Y5+) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export data (CSV) | ✅ | Limited | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API access | ✅ | Rate-limited | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **CONFIGURATION** | | | | | | | | |
| Custom branding | ✅ | Logo + colors | ❌ | Limited | ✅ | ✅ | ✅ | ✅ |
| White label | ✅ | Full + domain | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Custom workflows | ✅ | Pre-defined | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **SUPPORT** | | | | | | | | |
| Email support | ✅ | 48h SLA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Priority support | ✅ | 12h SLA | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Phone support | ✅ | 2h SLA | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Dedicated account mgr | ✅ | On-demand | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **SECURITY & COMPLIANCE** | | | | | | | | |
| RGPD compliance | ✅ | Standard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data backups | ✅ | Daily | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SLA guarantee | ✅ | 99.5% | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| SLA 99.9% | ✅ | Enterprise | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Tier-by-tier summary

**Hameau (19€) :**
- Freemium admin (basic dashboard only)
- 30-day analytics window
- Community support (forum, FAQ)
- No API, no custom branding

**Village (49€) :**
- Full admin access
- 30-day basic analytics, 90-day advanced
- Email support (48h)
- Limited custom branding (logo + colors)
- 5-user team max

**Bourg (99€) :**
- Full admin + configuration
- Trend analysis (1-year rolling)
- Priority email support (12h SLA)
- Custom workflows
- 25-user team max
- CSV export, basic API

**Bastide (189€) :**
- Enterprise features unlocked
- Custom date range analytics (5-year history)
- All workflows + customization
- Phone support (2h SLA)
- White label ready
- Full API (5k calls/day)
- 100-user team max

**Cité (390€) :**
- Everything in Bastide +
- Dedicated account manager
- Custom SLA negotiation (usually 99.9%)
- Priority feature requests
- Unlimited team users
- Unlimited API calls

**Métropole (590€) :**
- Everything in Cité +
- SLA 99.9% guaranteed
- Dedicated infrastructure option
- Custom integrations
- On-call support (technical escalation)
- Quarterly business reviews

---

## 📊 PRICING BY VALUE

**Key insight :** Differentiation = monitoring scope, not features

```
Hameau (19€)  = freemium tier (0 monitoring)
Village (49€) = 1st paid tier (30-day monitoring)
Bourg (99€)   = value tier (1-year monitoring)
Bastide (189€) = professional (5-year monitoring)
Cité (390€)   = enterprise (all monitoring, dedicated)
Métropole (590€) = full enterprise (SLA, custom, dedicated)
```

**Why this works :**
- ✅ All communes get the same app experience
- ✅ Larger communes benefit from longer historical analysis
- ✅ Pricing aligns with value (monitoring = analytics maturity)
- ✅ No hard feature lockouts (simpler, fairer)
- ✅ Easy to explain to prospects

---

## 🎯 GO-LIVE CHECKLIST

- [ ] Validate tier names (Hameau, Village, Bourg, Bastide, Cité, Métropole)
- [ ] Deploy /pricing.tsx with final pricing
- [ ] Configure freemium moderation (auto-filter + super-admin queue)
- [ ] Set up super-admin dashboard (moderation queue)
- [ ] Create pioneer discount automation (apply -2 months to all Y1)
- [ ] Build cohort tracking (analytics for testing strategy)
- [ ] Test with 10 communes (1-2 from each cohort)
- [ ] Iterate based on feedback
- [ ] Full launch S37 week 2

---

## 📞 INTEGRATION NEXT STEPS

1. ✅ **This week :** Update `/pricing.tsx` with final pricing + names
2. ✅ **This week :** Deploy freemium moderation (auto-filter + queue)
3. ✅ **S37 Week 1 :** Set up cohort tracking + analytics
4. ✅ **S37 Week 2 :** Launch with 5-10 test communes
5. ✅ **S37 Week 3 :** Iterate based on feedback, scale

---

**Généré par Claude — 26 juin 2026**

**Status :** Ready to integrate. Expected time to production : 48h dev work.
