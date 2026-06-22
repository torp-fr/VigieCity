# J8.1 — Météo Vigilance Alerts — Deployment Guide

**Status:** Code complete, ready for deployment
**Date:** 2026-06-22

---

## 📋 Files Created/Modified

### New Files (J8.1)
1. ✅ **Migration:** `supabase/migrations/20260622000001_weather_vigilance.sql`
   - Schema: `weather_vigilance_logs` (id, collectivity_id, level, description, phenomena, synced_at)
   - RLS: Citizens read their commune's alerts, service_role write
   - Indexes on collectivity_id, level, synced_at

2. ✅ **Edge Function:** `supabase/functions/weather-vigilance-fetch/index.ts`
   - Fetches Météo-France vigilance XML API hourly
   - Parses dept-level alerts → matches communes
   - Upsets weather_vigilance_logs per commune
   - Ready for pg_cron scheduling

3. ✅ **React Hook:** `_delivery/src/hooks/useWeatherVigilance.ts`
   - Realtime subscription to weather_vigilance_logs
   - Returns current alert + loading state
   - Helper: `WeatherLevelBadge` component

4. ✅ **React Widget:** `_delivery/src/components/WeatherVigilanceWidget.tsx`
   - Banner mode (compact=true): home page integration
   - Modal mode (compact=false): detailed alert view
   - Colors/emojis: GREEN/YELLOW/ORANGE/RED levels
   - Shows description, phenomena, valid_from/to

### Modified Files
5. ✅ **Home Page:** `_delivery/src/routes/accueil.tsx`
   - Added: `import { WeatherVigilanceWidget }`
   - Added: `<WeatherVigilanceWidget compact={true} />` after SosButton
   - Displays banner if ORANGE/RED alert active

---

## 🚀 Deployment Steps

### Phase 1: Database (Supabase)

```bash
# 1. Apply migration (via Supabase CLI or dashboard)
supabase migration up

# OR via dashboard:
#   → SQL Editor → Copy-paste migrations/20260622000001_weather_vigilance.sql
#   → Run (user must be authenticated as authenticated role)
```

**Verify:**
```sql
SELECT * FROM weather_vigilance_logs LIMIT 1;
-- Should return empty, RLS policies active
```

### Phase 2: Edge Function Deploy

```bash
# Deploy EF to Supabase
supabase functions deploy weather-vigilance-fetch

# OR (if using Supabase CLI)
supabase deploy
```

**Verify:**
```bash
# Test manually via HTTP
curl -X POST https://<PROJECT>.supabase.co/functions/v1/weather-vigilance-fetch \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
# {"status":"ok","alerts_found":N,"communes_updated":M}
```

### Phase 3: Setup pg_cron Scheduler

**Option A: Via Supabase Dashboard**
1. Go to SQL Editor
2. Copy-paste + run:

```sql
-- Schedule weather-vigilance-fetch to run hourly (0 UTC each hour)
SELECT cron.schedule('weather-vigilance-1h', '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://<PROJECT>.supabase.co/functions/v1/weather-vigilance-fetch',
    headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id$$
);

-- Verify scheduling
SELECT * FROM cron.job;
```

Replace:
- `<PROJECT>` → your Supabase project ID (xfhkngecpbvmlstjymfy)
- `<SERVICE_ROLE_KEY>` → copy from Supabase Settings → API

**Option B: Via Supabase CLI** (once pg_net enabled)
```bash
supabase functions deploy weather-vigilance-fetch --schedule "0 * * * *"
```

### Phase 4: Frontend (Next.js)

```bash
# Build + test locally
npm run dev

# Navigate to /accueil
# If no alert: widget should be hidden
# If ORANGE/RED alert: banner should appear (test data needed)
```

**Test without Météo-France data:**
```sql
-- Manually insert test alert
INSERT INTO weather_vigilance_logs (
  collectivity_id, level, description, phenomena
)
SELECT 
  id, 'ORANGE', 'Alerte test', 'Orage'
FROM collectivities
LIMIT 1;

-- Widget should display on /accueil
-- After 2 min: run SELECT * FROM weather_vigilance_logs; (should see your insert)
```

### Phase 5: Deploy to Vercel

```bash
git add -A
git commit -m "J8.1: Météo Vigilance Alerts (migration + EF + widget)"
git push

# Vercel auto-deploys via GitHub
# Monitor: https://vercel.com/<project>/deployments
```

---

## ✅ Testing Checklist

- [ ] Migration applied (table created, RLS policies active)
- [ ] EF deployed (function accessible)
- [ ] pg_cron scheduled (cron.job shows entry)
- [ ] Home page loads without errors (no widget shown if no alert)
- [ ] Test alert inserted → widget appears on /accueil
- [ ] Click widget → modal opens
- [ ] Realtime subscription works (update alert → widget updates immediately)
- [ ] All 4 alert levels (GREEN/YELLOW/ORANGE/RED) display correctly
- [ ] Mobile responsive (widget banner + modal)

---

## 🔄 Next Steps (J8.2 → J8.6)

Once J8.1 stable:

1. **J8.2 Carte Services** (data.gouv integration)
2. **J8.3 Consultations Citoyennes** (polls + realtime votes)
3. **J8.4 Voisins Vigilants** (community reports)
4. **J8.5 Agenda Enrichi** (registrations + iCal)
5. **J8.6 Timeline Signalements** (visual tracking)

---

## 📝 Troubleshooting

### Widget not showing on /accueil?
- Check browser console for errors
- Verify user is authenticated + has collectivity_id
- Check RLS: `SELECT * FROM weather_vigilance_logs WHERE collectivity_id = '<your-id>'`

### EF failing?
- Check Supabase logs: Dashboard → Edge Functions → weather-vigilance-fetch → Logs
- Common errors:
  - `SUPABASE_SERVICE_ROLE_KEY not defined` → set in Supabase env
  - `Météo-France fetch error` → API timeout or rate-limit (check https://vigilance.meteofrance.com/api/)

### pg_cron not triggering?
- Verify cron job exists: `SELECT * FROM cron.job WHERE jobname = 'weather-vigilance-1h';`
- Check cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
- If stuck: `SELECT cron.unschedule('weather-vigilance-1h');` → reschedule

---

## 🎯 KPI Success Criteria (Phase 0 MVP)

After 1 week of J8.1 live:

- ✅ Widget visible to 100% of users in alert communes
- ✅ No errors in Supabase logs
- ✅ EF running hourly without failures
- ✅ Alert updates within 1-2 min of Météo-France API change
- ✅ Mobile UX: banner + modal fully functional

---

## 💾 Rollback Plan

If issues arise:

```sql
-- Drop function + table
DROP TABLE weather_vigilance_logs CASCADE;

-- Disable cron job
SELECT cron.unschedule('weather-vigilance-1h');

-- Remove EF code (delete supabase/functions/weather-vigilance-fetch/)
```

Then redeploy once fixed.
