create or replace function public.admin_manage_order(p_order_id uuid,p_status text,p_payment_status text,p_cancelled_by text default null,p_cancel_reason text default null,p_internal_note text default null)
returns public.orders language plpgsql security definer set search_path=public
as $$
declare v_order public.orders; v_actor uuid:=auth.uid();
begin
  if v_actor is null or not exists(select 1 from public.profiles where id=v_actor and role in ('admin','super_admin')) then raise exception 'Administrator access required'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.cancelled_by='customer' and p_status<>'Cancelled' then raise exception 'A customer cancellation is historical and cannot be reopened'; end if;
  if p_status='Cancelled' and v_order.cancelled_by<>'customer' and coalesce(trim(p_cancel_reason),'')='' then raise exception 'Cancellation reason is required'; end if;
  update public.orders set status=p_status,payment_status=p_payment_status,
    cancelled_by=case when p_status='Cancelled' and v_order.cancelled_by='customer' then v_order.cancelled_by when p_status='Cancelled' then coalesce(nullif(trim(p_cancelled_by),''),'admin') else cancelled_by end,
    cancel_reason=case when p_status='Cancelled' and v_order.cancelled_by='customer' then v_order.cancel_reason when p_status='Cancelled' then nullif(trim(p_cancel_reason),'') else cancel_reason end,
    internal_note=case when p_status='Cancelled' and v_order.cancelled_by='customer' then v_order.internal_note when p_status='Cancelled' then nullif(trim(p_internal_note),'') else internal_note end,
    updated_at=now() where id=p_order_id returning * into v_order;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,metadata) values(v_actor,'admin_order_status_changed','order',p_order_id,jsonb_build_object('status',v_order.status,'payment_status',v_order.payment_status));
  return v_order;
end;
$$;
revoke all on function public.admin_manage_order(uuid,text,text,text,text,text) from public;
revoke execute on function public.admin_manage_order(uuid,text,text,text,text,text) from anon;
grant execute on function public.admin_manage_order(uuid,text,text,text,text,text) to authenticated;
