# Platform Users Page Enhancement — Session 49

## Overview

Enhanced the `/platform/users` admin page with real KPIs, dual-tab interface (Users & Citizens), activity tracking, and comprehensive filtering.

## Files Modified

### 1. **`_delivery/src/routes/platform/users.tsx`** (COMPLETE REWRITE)

**What Changed:**
- Added dual-tab interface: **Users** tab + **Citizens** tab
- Replaced hardcoded KPIs with real Supabase queries
- Added activity tracking via `audit_logs` table
- Enhanced user table with 6 columns: Utilisateur, Rôle, Collectivité, Inscrit le, Dernier accès, Statut
- Added citizens table with 5 columns: Citoyen, Commune, Signalements, Dernier signalement, Activité
- Implemented smart filtering for both tabs

**New Types:**
```typescript
type UserWithActivity = Profile & {
  last_sign_in_at: string | null;
  is_active_7d: boolean;
};

type CitizenStats = {
  id: string;
  display_name: string | null;
  created_at: string;
  report_count: number;
  last_report_date: string | null;
  is_active_30d: boolean;
  collectivities: { name: string } | null;
};
```

### 2. **`supabase/migrations/20260630000001_audit_logs.sql`** (NEW)

**Purpose:** Create `audit_logs` table to track user activity (logins, actions, etc.)

**Schema:**
```sql
CREATE TABLE audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT        NOT NULL, -- 'login', 'logout', 'report_create', etc.
  resource_type   TEXT,
  resource_id     UUID,
  details         JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_audit_logs_user_action` — (user_id, action, created_at DESC)
- `idx_audit_logs_action` — (action, created_at DESC)
- `idx_audit_logs_created_at` — (created_at DESC)

**RLS Policies:**
- Super-admin: full access
- Admin/Moderator: read logs for their collectivity users
- Users: read their own logs

## USERS Tab Features

### KPI Cards (3 metrics)
1. **Total Users** — Total count of profiles
2. **Active Users (7d)** — Distinct users with "login" action in last 7 days (via audit_logs)
3. **New Users (30d)** — Profiles created in last 30 days

### Filters
- **Search** — By display_name or UUID prefix
- **Role** — Dropdown: All roles, Citoyen, Modérateur, Admin, Admin Commune, Admin EPCI, Super Admin
- **Status** — All statuts, Active (7d), Inactive

### Users Table
| Column | Source | Logic |
|--------|--------|-------|
| Utilisateur | profiles | display_name + first 8 chars of UUID |
| Rôle | profiles.role | Dropdown selector (editable) |
| Collectivité | profiles.collectivities(name) | Foreign key join |
| Inscrit le | profiles.created_at | Formatted as fr-FR date |
| Dernier accès | audit_logs (action='login') | Most recent login date, formatted |
| Statut | audit_logs | Badge: "Actif" (green) if last login > 7 days ago, else "Inactif" (gray) |

## CITIZENS Tab Features

### KPI Cards (4 metrics)
1. **Total Citizens** — Count of profiles with role='citizen'
2. **Active Citizens (7d)** — Citizens with "login" action in last 7 days (via audit_logs)
3. **Reports (30d)** — Total reports created in last 30 days
4. **Flagged Reports** — Reports with citizen_flags_count > 0 (graceful fallback to 0 if column missing)

### Filters
- **Search** — By display_name or UUID prefix
- **Activity Level** — All niveaux, Active (30d), Inactive

### Citizens Table
| Column | Source | Logic |
|--------|--------|-------|
| Citoyen | profiles | display_name + first 8 chars of UUID |
| Commune | profiles.collectivities(name) | Foreign key join |
| Signalements | reports | COUNT aggregation, grouped by author_id |
| Dernier signalement | reports | Most recent created_at, formatted as fr-FR date |
| Activité | reports.created_at | Badge: "Actif" (green) if last report > 30 days ago, else "Inactif" (gray) |

## Data Fetching Strategy

### Query 1: Users Data
```sql
SELECT p.id, p.display_name, p.role, p.collectivity_id, p.created_at,
       c.name as collectivity_name
FROM profiles p
LEFT JOIN collectivities c ON p.collectivity_id = c.id
ORDER BY p.created_at DESC
```
Then enriched with audit_logs for `last_sign_in_at` and `is_active_7d`.

### Query 2: Citizens Data
```sql
SELECT p.id, p.display_name, p.created_at, p.collectivity_id,
       COUNT(r.id) as report_count,
       MAX(r.created_at) as last_report_date
FROM profiles p
LEFT JOIN reports r ON p.id = r.author_id
WHERE p.role = 'citizen'
GROUP BY p.id
ORDER BY p.created_at DESC
```

### Query 3: User KPIs
- **Total**: `SELECT COUNT(*) FROM profiles`
- **Active 7d**: `SELECT DISTINCT user_id FROM audit_logs WHERE action='login' AND created_at > NOW()-7d`
- **New 30d**: `SELECT COUNT(*) FROM profiles WHERE created_at > NOW()-30d`

### Query 4: Citizen KPIs
- **Total**: `SELECT COUNT(*) FROM profiles WHERE role='citizen'`
- **Active 7d**: Citizens (filtered from audit_logs logins) from last 7 days
- **Reports 30d**: `SELECT COUNT(*) FROM reports WHERE created_at > NOW()-30d`
- **Flagged**: `SELECT COUNT(*) FROM reports WHERE citizen_flags_count > 0`

## Implementation Notes

### Error Handling
1. **audit_logs table may not exist yet** — The migration file must be deployed first
2. **citizen_flags_count column** — May not exist in reports table; wrapped in try-catch with fallback to 0
3. **No login events** — If audit_logs is empty or new users haven't logged in, last_sign_in_at = null, is_active_7d = false
4. **Network errors** — TanStack Query handles retries automatically

### Performance Optimizations
1. **Indexes on audit_logs** — (user_id, action, created_at DESC) for fast login lookups
2. **Single fetch per tab** — Users/Citizens data fetched once, then filtered client-side (search/role/status)
3. **Parallel KPI queries** — All 4 KPI metrics fetched in parallel via useQuery caching
4. **Lazy filtering** — Filtering happens in memory after data load (no additional queries)

### Type Safety
- All queries are typed: `useQuery<Profile[]>`, `useQuery<CitizenStats[]>`, etc.
- Map collections used for efficient lookups (O(1) complexity)
- Proper null handling: `?? []`, `?? null`, `.get()` with defaults

## UI/UX Features

### Tab Navigation
- Clean border-bottom indicator for active tab
- Smooth transitions between tabs
- Search/filter state resets when switching tabs (filterStatus → filterActivity)

### KPI Cards
- 3 cards on Users tab (1200px+ = 3 cols, mobile = 1 col)
- 4 cards on Citizens tab (1200px+ = 4 cols, mobile = 1 col)
- Loading spinner while data fetches
- Formatted numbers: `.toLocaleString("fr-FR")` (space as thousands separator)

### Tables
- Hover effect (bg-slate-50)
- Result count badge under header ("N résultats")
- Empty state message if no results
- Role selector is editable dropdown (fires mutation on change)
- Status/Activity badges with color coding:
  - Active = emerald-100 text-emerald-700
  - Inactive = slate-100 text-slate-600

## Deployment Checklist

- [ ] Deploy migration: `20260630000001_audit_logs.sql`
- [ ] Run: `supabase db push`
- [ ] Deploy users.tsx changes
- [ ] Test Users tab: verify KPIs load, filters work
- [ ] Test Citizens tab: verify report counts, last report dates
- [ ] Verify role change mutation works (refresh table after)
- [ ] Check performance: page should load in <2s with 500+ users
- [ ] Test on mobile: verify responsive layout (1 col on small screens)

## Future Enhancements

1. **Export to CSV** — Add export button for users/citizens lists
2. **Batch role changes** — Select multiple users and change role at once
3. **Activity timeline** — Show detailed audit_logs timeline per user
4. **Engagement scoring** — Calculate activity score based on login frequency
5. **Department/Region filters** — Add geographic filtering
6. **Alerts** — Flag users inactive >60 days or reports >30 flagged
