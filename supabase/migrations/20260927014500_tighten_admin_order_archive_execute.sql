revoke execute on function public.admin_archive_order(uuid,text) from anon;
grant execute on function public.admin_archive_order(uuid,text) to authenticated;
