create or replace function public.admin_archive_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql
security definer
set search_path=public
as $$
declare v_order public.orders; v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (select 1 from public.profiles where id=v_actor and role in ('admin','super_admin')) then raise exception 'Administrator access required'; end if;
  update public.orders set archived_at=coalesce(archived_at,now()),updated_at=now() where id=p_order_id returning * into v_order;
  if not found then raise exception 'Order not found'; end if;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,metadata) values(v_actor,'order_archived','order',v_order.id,jsonb_build_object('reason',p_reason));
  return v_order;
end;
$$;
revoke all on function public.admin_archive_order(uuid,text) from public;
grant execute on function public.admin_archive_order(uuid,text) to authenticated;
