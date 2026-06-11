-- Security hardening for the `licenses` table (audit finding #1).
--
-- Threat: the table holds caregiver emails and license keys. The public
-- Supabase anon key is shipped in every client and is trivially extractable
-- from the bundle. If RLS is off (or permissive), anyone with that anon key
-- could read or write the entire licenses table directly through PostgREST.
--
-- Fix: all legitimate access goes through SERVICE-ROLE edge functions
-- (register-license, validate-license, lemon-squeezy-webhook). The service
-- role bypasses RLS, so those functions keep working. With RLS enabled and
-- NO permissive policy, the anon / authenticated roles get zero rows. We also
-- REVOKE table privileges from those roles as defense in depth so the table
-- is not even exposed through the PostgREST API.

-- 1. Enable row-level security. No policy is added on purpose: RLS-on with
--    no policy = deny-all for every non-superuser, non-bypassrls role.
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- 2. Defense in depth — strip direct table access from the public API roles.
--    Edge functions connect as service_role (which has BYPASSRLS and is not
--    affected by these REVOKEs), so nothing legitimate breaks.
REVOKE ALL ON public.licenses FROM anon;
REVOKE ALL ON public.licenses FROM authenticated;

-- Note: if a future feature needs the client to read its OWN row, add a
-- narrow policy keyed on a value only that client can prove it owns — never
-- a blanket `USING (true)`.
