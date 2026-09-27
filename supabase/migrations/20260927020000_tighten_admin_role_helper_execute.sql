revoke execute on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;
