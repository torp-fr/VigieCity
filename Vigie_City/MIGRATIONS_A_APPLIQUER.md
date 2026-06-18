# Migrations Supabase — Instructions

Aller sur : **https://supabase.com/dashboard/project/cowumtvwvbeolwsnwglb/sql/new**

Coller et exécuter les 5 blocs **dans cet ordre exact**. Ne pas sauter d'étape.

---

## ÉTAPE 1 — Schéma initial (tables, enums, fonctions)

```sql
-- Enums
CREATE TYPE public.app_role AS ENUM ('citizen', 'moderator', 'admin');
CREATE TYPE public.report_category AS ENUM ('vehicule_suspect','rodeur','incivilite','degradation','accident','animal','eclairage','depot_sauvage','autre');
CREATE TYPE public.report_severity AS ENUM ('info','vigilance','urgent');
CREATE TYPE public.report_status AS ENUM ('pending','published','archived','rejected','transferred');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ COLLECTIVITIES ============
CREATE TABLE public.collectivities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  insee_code TEXT UNIQUE,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collectivities TO anon, authenticated;
GRANT ALL ON public.collectivities TO service_role;
ALTER TABLE public.collectivities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collectivities readable by all" ON public.collectivities FOR SELECT USING (true);
CREATE TRIGGER trg_collectivities_updated BEFORE UPDATE ON public.collectivities FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE SET NULL,
  district TEXT,
  is_voisin_vigilant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, collectivity_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_role_in(_user_id UUID, _role public.app_role, _collectivity UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND (collectivity_id = _collectivity OR collectivity_id IS NULL))
$$;

-- ============ EMERGENCY_CONTACTS ============
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  hours TEXT,
  priority INT NOT NULL DEFAULT 100,
  is_national BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emergency_contacts TO anon, authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency contacts readable by all" ON public.emergency_contacts FOR SELECT USING (true);
CREATE POLICY "moderators manage local contacts" ON public.emergency_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));
CREATE TRIGGER trg_emergency_contacts_updated BEFORE UPDATE ON public.emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.emergency_contacts (label, phone, category, description, is_national, priority) VALUES
  ('Police / Gendarmerie', '17', 'police', 'Urgences police-secours', true, 1),
  ('Pompiers', '18', 'pompiers', 'Sapeurs-pompiers', true, 2),
  ('SAMU', '15', 'medical', 'Urgences médicales', true, 3),
  ('Numéro d''urgence européen', '112', 'urgence', 'Toutes urgences (Europe)', true, 4),
  ('Urgences (sourds/malentendants)', '114', 'urgence', 'Par SMS/fax', true, 5),
  ('Enfance en danger', '119', 'social', 'Allô enfance en danger', true, 6),
  ('Violences femmes', '3919', 'social', 'Écoute violences faites aux femmes', true, 7);

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE SET NULL,
  category public.report_category NOT NULL,
  severity public.report_severity NOT NULL DEFAULT 'vigilance',
  title TEXT,
  description TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  approximate_address TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status public.report_status NOT NULL DEFAULT 'pending',
  media_paths TEXT[] NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users read published reports of their collectivity" ON public.reports FOR SELECT TO authenticated
  USING (status = 'published' AND collectivity_id IN (SELECT collectivity_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "moderators read all reports in collectivity" ON public.reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));
CREATE POLICY "users insert reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own pending reports" ON public.reports FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "moderators update reports in collectivity" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX reports_collectivity_status_idx ON public.reports (collectivity_id, status, created_at DESC);

-- ============ ALERTS ============
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity public.report_severity NOT NULL DEFAULT 'vigilance',
  area_label TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alerts TO anon, authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts readable by all" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "moderators manage alerts" ON public.alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));

-- ============ TRUSTED_CONTACTS ============
CREATE TABLE public.trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_contacts TO authenticated;
GRANT ALL ON public.trusted_contacts TO service_role;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own trusted contacts" ON public.trusted_contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SOS_EVENTS ============
CREATE TABLE public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  audio_path TEXT,
  message TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sos_events TO authenticated;
GRANT ALL ON public.sos_events TO service_role;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own SOS" ON public.sos_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "moderators read SOS in collectivity" ON public.sos_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));
```

---

## ÉTAPE 2 — Sécurisation des fonctions

```sql
-- Fix search_path sur tg_set_updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Verrouillage des fonctions internes
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Fonctions de rôle : uniquement pour les utilisateurs connectés
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.has_role_in(uuid, public.app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role_in(uuid, public.app_role, uuid) TO authenticated;
```

---

## ÉTAPE 3 — Bucket report-media (CORRIGÉ)

> ⚠️ Fix appliqué : `'admin'` → `'admin'::public.app_role` pour éviter l'erreur 42883

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-media',
  'report-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Moderators can read all media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-media' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'moderator'::public.app_role
    )
  )
);
```

---

## ÉTAPE 4 — Policies storage pour les utilisateurs

```sql
CREATE POLICY "users upload own report media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users read own report media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users update own report media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users delete own report media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## ÉTAPE 5 — Seed des 5 communes de test

```sql
INSERT INTO public.collectivities (name, insee_code, postal_code) VALUES
  ('Paris 13e arrondissement', '75113', '75013'),
  ('Dunkerque', '59183', '59140'),
  ('Sorède', '66184', '66690'),
  ('Lyon 3e arrondissement', '69383', '69003'),
  ('Marseille 1er arrondissement', '13201', '13001')
ON CONFLICT (insee_code) DO NOTHING;
```

---

✅ Après ces 5 étapes, toutes les tables, fonctions et le bucket `report-media` sont en place.
