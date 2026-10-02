create or replace function public.admin_permanently_delete_archived_order(p_archive_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
begin
  if v_actor is null or not exists (select 1 from public.profiles where id=v_actor and role in ('admin','super_admin')) then
    raise exception 'Administrator access required';
  end if;

  delete from public.orders
  where id=p_archive_id
    and archived_at is not null
  returning * into v_order;

  if not found then
    raise exception 'Archived order not found';
  end if;

  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,metadata)
  values(v_actor,'archived_order_deleted','order',v_order.id,jsonb_build_object('order_number',v_order.order_number,'archived_at',v_order.archived_at));

  return v_order;
end;
$$;
revoke all on function public.admin_permanently_delete_archived_order(uuid) from public;
grant execute on function public.admin_permanently_delete_archived_order(uuid) to authenticated;
