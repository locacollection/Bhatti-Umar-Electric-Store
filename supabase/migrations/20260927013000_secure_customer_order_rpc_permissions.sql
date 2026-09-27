-- Keep order RPCs available only to signed-in customers.
revoke execute on function public.create_order(uuid,text,text,text,text,text,text,jsonb,text) from anon;
grant execute on function public.create_order(uuid,text,text,text,text,text,text,jsonb,text) to authenticated;

revoke execute on function public.customer_manage_order(uuid,text,text,text) from anon;
grant execute on function public.customer_manage_order(uuid,text,text,text) to authenticated;
