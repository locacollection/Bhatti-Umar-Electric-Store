-- 005_super_admin_and_admin_management.sql
-- Add a two-tier staff model. Super admins manage staff; admins run store operations.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in('customer','admin','super_admin'));

create index if not exists profiles_role_idx on public.profiles(role);

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles for select to authenticated
using ((select auth.uid())=id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')));

drop policy if exists "addresses own access" on public.addresses;
create policy "addresses own access" on public.addresses for all to authenticated
using ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')))
with check ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')));

drop policy if exists "orders own select" on public.orders;
create policy "orders own select" on public.orders for select to authenticated
using ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')));

drop policy if exists "order items own select" on public.order_items;
create policy "order items own select" on public.order_items for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and ((select auth.uid())=o.user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')))));

drop policy if exists "approved reviews public" on public.reviews;
create policy "approved reviews public" on public.reviews for select to anon,authenticated
using (status='approved' or (select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')));

drop policy if exists "reviews own update" on public.reviews;
create policy "reviews own update" on public.reviews for update to authenticated
using ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')))
with check ((select auth.uid())=user_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')));

drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('admin','super_admin')));

grant select on public.profiles to authenticated;
