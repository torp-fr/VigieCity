# VigieCity Operations Runbook

**Last updated:** 2026-06-22  
**Phase:** Phase 0 MVP  
**Primary Contact:** admin@vigiecity.fr

---

## 🚨 Critical Alerts & Response

### Database Connection Lost
**Symptoms:** Health check fails, app shows 500 errors  
**Response:**
1. Check Supabase dashboard → Database → Connection pool status
2. Restart connection pool if needed: Dashboard → Settings → Networking
3. Monitor logs: `SELECT * FROM health_checks ORDER BY checked_at DESC LIMIT 10;`
4. Escalate if persists > 5 min

### RSS Feed Sync Failed (24h+)
**Symptoms:** No new articles, health check degraded  
**Response:**
1. Check Supabase logs for brave-news-fetch errors
2. Verify Brave Search API key is set: Settings → Edge Functions → secrets
3. Check API quota: https://api.search.brave.com/dashboard
4. Manually trigger: Dashboard → Edge Functions → brave-news-fetch → Invoke

### Weather API Timeout
**Symptoms:** Weather alerts not updating  
**Response:**
1. Check weather-vigilance-fetch logs
2. Météo-France API sometimes slow (retry after 5 min)
3. Not critical — feature degraded but app runs

---

## 📊 Monitoring

### Health Check Endpoint
Runs every 5 minutes via pg_cron  
Status: `healthy | degraded | unhealthy`

### Key Metrics (Target)
- **Uptime:** 99.5% monthly
- **API Response:** P99 < 500ms
- **Error Rate:** < 0.1%
- **DB Latency:** < 100ms (p99)

---

## 🔧 Common Procedures

### Deploy a Fix
```bash
git merge feature/bugfix && git push origin main
# Vercel auto-deploys
# Monitor health-check for 5 min
```

### Clear Cache
- Service Worker: Users clear manually via settings
- CDN: Vercel Dashboard → Clear Cache

### Scale Database
Supabase → Settings → Billing → Change compute tier (2 min operation)

---

## 📞 Escalation SLA

- **P1 (Complete outage):** 15 min response
- **P2 (Partial degradation):** 1 hour response
- **P3 (Minor issue):** 4 hours response

On-call: Check `/ops/oncall` schedule  
Email: ops@vigiecity.fr
