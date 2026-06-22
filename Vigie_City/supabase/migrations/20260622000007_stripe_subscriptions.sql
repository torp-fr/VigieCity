-- J5 — Stripe SaaS Integration
-- Phase 1: Enable autonomous commune payments via Stripe
-- Tables: stripe_customers, stripe_subscriptions, stripe_webhook_events, pricing_tiers

-- ── Pricing tiers (5 level subscription model) ────────────────────────────────────

create table if not exists pricing_tiers (
  id text primary key,
  name text not null,
  description text,
  population_min int,
  population_max int,
  price_monthly_eur int, -- in cents
  price_yearly_eur int,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  features jsonb, -- array of feature strings
  created_at timestamp default now(),
  updated_at timestamp default now()
);

insert into pricing_tiers (id, name, description, population_min, population_max, price_monthly_eur, price_yearly_eur, features) values
  ('nano', 'Nano', 'Very small villages', 0, 1000, 4900, 49000, '["Alertes météo", "Carte services", "Signalements"]'::jsonb),
  ('micro', 'Micro', 'Small communes', 1000, 2500, 9900, 99000, '["Nano + Consultations", "Agenda citoyen", "Dashboard basique"]'::jsonb),
  ('local', 'Local', 'Medium communes', 2500, 10000, 18900, 189000, '["Micro + Voisins vigilants", "Timeline détaillée", "API read"]'::jsonb),
  ('urbain', 'Urbain', 'Cities', 10000, 50000, 49000, 490000, '["Local + Advertiser dashboard", "Pub engine access", "Custom reporting"]'::jsonb),
  ('metropole', 'Métropole', 'Large cities/regions', 50000, null, null, null, '["Urbain + White-label", "Dedicated support", "Custom integrations"]'::jsonb)
on conflict do nothing;

-- ── Stripe customer mapping ────────────────────────────────────────────────────────

create table if not exists stripe_customers (
  id uuid primary key default gen_random_uuid(),
  collectivity_id uuid not null unique references collectivities(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_portal_session_id text,
  status text default 'pending', -- pending, active, trial, inactive
  trial_started_at timestamp,
  trial_ends_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_stripe_customers_collectivity on stripe_customers(collectivity_id);
create index idx_stripe_customers_stripe_id on stripe_customers(stripe_customer_id);

-- ── Stripe subscriptions (active subscriptions per commune) ────────────────────────

create table if not exists stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text not null,
  collectivity_id uuid not null references collectivities(id) on delete cascade,
  stripe_subscription_id text unique not null,
  pricing_tier_id text not null references pricing_tiers(id),
  stripe_price_id text,
  billing_cycle text, -- 'monthly' | 'yearly'
  status text default 'active', -- active, paused, canceled, past_due
  current_period_start timestamp,
  current_period_end timestamp,
  cancel_at_period_end boolean default false,
  canceled_at timestamp,
  amount_eur int, -- in cents, for this billing cycle
  currency text default 'eur',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_stripe_subscriptions_collectivity on stripe_subscriptions(collectivity_id);
create index idx_stripe_subscriptions_stripe_id on stripe_subscriptions(stripe_subscription_id);
create index idx_stripe_subscriptions_status on stripe_subscriptions(status);

-- ── Webhook events (audit trail for Stripe events) ─────────────────────────────────

create table if not exists stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  stripe_event_type text, -- payment_intent.succeeded, customer.subscription.updated, etc
  stripe_customer_id text,
  collectivity_id uuid references collectivities(id) on delete set null,
  payload jsonb,
  processed boolean default false,
  processed_at timestamp,
  error_message text,
  created_at timestamp default now()
);

create index idx_webhook_events_stripe_event_id on stripe_webhook_events(stripe_event_id);
create index idx_webhook_events_collectivity on stripe_webhook_events(collectivity_id);
create index idx_webhook_events_processed on stripe_webhook_events(processed);

-- ── RLS: Row-level security for subscription visibility ────────────────────────────

alter table stripe_customers enable row level security;
alter table stripe_subscriptions enable row level security;
alter table stripe_webhook_events enable row level security;
alter table pricing_tiers enable row level security;

-- Pricing tiers: public read
create policy "pricing_tiers_public_read" on pricing_tiers
  for select using (true);

-- Stripe customers: read only by own collectivity admin + service role
create policy "stripe_customers_admin_read" on stripe_customers
  for select using (
    auth.jwt() ->> 'role' = 'service_role' or
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.collectivity_id = stripe_customers.collectivity_id
        and ur.role_level >= 2 -- admin level
    )
  );

create policy "stripe_customers_service_all" on stripe_customers
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- Stripe subscriptions: read only by own collectivity admin + service role
create policy "stripe_subscriptions_admin_read" on stripe_subscriptions
  for select using (
    auth.jwt() ->> 'role' = 'service_role' or
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.collectivity_id = stripe_subscriptions.collectivity_id
        and ur.role_level >= 2 -- admin level
    )
  );

create policy "stripe_subscriptions_service_all" on stripe_subscriptions
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- Webhook events: service role only
create policy "webhook_events_service_all" on stripe_webhook_events
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- ── Trigger: auto-update subscription status on period change ─────────────────────

create or replace function update_subscription_status()
returns trigger as $$
begin
  -- Auto-mark as past_due if current period ended and still unpaid
  if new.current_period_end < now() and new.status = 'active' then
    new.status := 'past_due';
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_subscription_status_update
  before update on stripe_subscriptions
  for each row execute function update_subscription_status();

-- ── Trigger: log webhook events ────────────────────────────────────────────────────

create or replace function log_webhook_event()
returns trigger as $$
begin
  insert into stripe_webhook_events (stripe_event_id, stripe_event_type, stripe_customer_id, payload)
  values (
    new.stripe_event_id,
    new.stripe_event_type,
    new.stripe_customer_id,
    new.payload
  ) on conflict (stripe_event_id) do nothing;
  return new;
end;
$$ language plpgsql;

-- ── Grants ─────────────────────────────────────────────────────────────────────────

grant select on pricing_tiers to authenticated, anon;
grant all on stripe_customers to service_role;
grant all on stripe_subscriptions to service_role;
grant all on stripe_webhook_events to service_role;
