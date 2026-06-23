-- Migration: RPC find_auth_user_by_email
-- Permet à un client anon de chercher un utilisateur par email
-- dans auth.users sans exposer la service_role key.
-- SECURITY DEFINER = s'exécute avec les droits du propriétaire (postgres).

CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(search_email text)
RETURNS TABLE(id uuid, email text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    COALESCE(p.display_name, split_part(au.email::text, '@', 1)) AS display_name
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE lower(au.email::text) = lower(search_email)
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users only (pas aux anonymes)
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO authenticated;
