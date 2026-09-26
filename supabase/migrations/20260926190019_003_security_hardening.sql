-- 003_security_hardening.sql
revoke execute on function public.create_order(uuid,text,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
revoke execute on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
create policy "audit admin read" on public.audit_log for select to authenticated using ((select public.is_admin()));
grant select on public.audit_log to authenticated;
create index if not exists audit_actor_user_idx on public.audit_log(actor_user_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists reviews_order_idx on public.reviews(order_id);
create index if not exists reviews_user_idx on public.reviews(user_id);
-- RLS policies use initplan-friendly (select auth.uid()) wrappers.
