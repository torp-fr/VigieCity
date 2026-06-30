-- Migration: Admin Dashboard Features
-- Purpose: Add CRM notes, audit logs, and tracking tables for platform admin enhancements
-- Date: 2026-06-30

-- ── CRM Notes Table ──────────────────────────────────────────────────────────────

create table if not exists commune_crm_notes (
  id uuid primary key default gen_random_uuid(),
  collectivity_id uuid not null references collectivities(id) on delete cascade,
  created_by_admin uuid not null references profiles(id) on delete set null,
  note_text text not null,
  created_at timestamp default now()
);

create index idx_commune_crm_notes_collectivity on commune_crm_notes(collectivity_id);
create index idx_commune_crm_notes_created_at on commune_crm_notes(created_at desc);

-- ── Email Audit Table (for communication history) ──────────────────────────────────

create table if not exists email_audit (
  id uuid primary key default gen_random_uuid(),
  collectivity_id uuid references collectivities(id) on delete cascade,
  recipient_email text not null,
  email_type text not null, -- 'welcome', 'renewal_reminder', 'bulk_send', 'invite', etc
  subject text,
  sent_at timestamp default now(),
  status text default 'sent', -- sent, failed, bounced
  error_message text
);

create index idx_email_audit_collectivity on email_audit(collectivity_id);
create index idx_email_audit_sent_at on email_audit(sent_at desc);
create index idx_email_audit_email_type on email_audit(email_type);

-- ── Update commune_licenses to track payment info ───────────────────────────────────

alter table commune_licenses
add column if not exists payment_date date,
add column if not exists payment_type text check (payment_type in ('chorus_pro', 'transfer', 'quote_pending', 'stripe')),
add column if not exists payment_validated boolean default false,
add column if not exists payment_validated_by uuid references profiles(id) on delete set null;

create index if not exists idx_commune_licenses_payment_date on commune_licenses(payment_date);
create index if not exists idx_commune_licenses_payment_type on commune_licenses(payment_type);
create index if not exists idx_commune_licenses_payment_validated on commune_licenses(payment_validated);
create index if not exists idx_commune_licenses_expires_at on commune_licenses(expires_at);
create index if not exists idx_commune_licenses_status on commune_licenses(status);

-- ── RLS Policies ─────────────────────────────────────────────────────────────────

alter table commune_crm_notes enable row level security;
alter table email_audit enable row level security;

-- CRM notes: super_admin + admin can read/write
create policy "crm_notes_super_admin_all" on commune_crm_notes
  for all using (
    auth.jwt() ->> 'role' = 'service_role' or
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role_level >= 3 -- super_admin
    )
  );

-- Email audit: super_admin read only
create policy "email_audit_super_admin_read" on email_audit
  for select using (
    auth.jwt() ->> 'role' = 'service_role' or
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.role_level >= 3 -- super_admin
    )
  );

create policy "email_audit_service_all" on email_audit
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- ── Grants ───────────────────────────────────────────────────────────────────────

grant select, insert, update, delete on commune_crm_notes to service_role;
grant select, insert on email_audit to service_role;
