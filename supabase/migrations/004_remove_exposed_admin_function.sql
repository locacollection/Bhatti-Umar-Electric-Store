-- 004_remove_exposed_admin_function.sql
-- Replace the exposed SECURITY DEFINER admin helper with inline role checks in RLS.
revoke execute on function public.is_admin() from public,anon,authenticated;
-- The live database migration also replaces policies with initplan-friendly role checks.
