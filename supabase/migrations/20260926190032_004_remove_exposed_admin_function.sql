-- 004_remove_exposed_admin_function.sql
-- Replace exposed SECURITY DEFINER admin helper with inline role checks.
drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles for select to authenticated using ((select auth.uid())=id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "addresses own access" on public.addresses;
create policy "addresses own access" on public.addresses for all to authenticated using ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "orders own select" on public.orders;
create policy "orders own select" on public.orders for select to authenticated using ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "order items own select" on public.order_items;
create policy "order items own select" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and ((select auth.uid())=o.user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))));
drop policy if exists "approved reviews public" on public.reviews;
create policy "approved reviews public" on public.reviews for select to anon,authenticated using (status='approved' or (select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "reviews own update" on public.reviews;
create policy "reviews own update" on public.reviews for update to authenticated using ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
revoke execute on function public.is_admin() from public,anon,authenticated;
