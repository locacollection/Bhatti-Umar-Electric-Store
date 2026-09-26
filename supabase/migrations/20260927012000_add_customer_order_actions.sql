create or replace function public.customer_manage_order(
  p_order_id uuid,p_action text,p_reason text default null,p_note text default null
) returns public.orders
language plpgsql security definer set search_path=public
as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id=p_order_id and user_id=auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if p_action='cancel' then
    if v_order.status not in ('Pending','Confirmed','Processing') then raise exception 'This order can no longer be cancelled online'; end if;
    if coalesce(trim(p_reason),'')='' then raise exception 'Cancellation reason is required'; end if;
    update public.orders set status='Cancelled',cancelled_by='customer',cancel_reason=trim(p_reason),updated_at=now() where id=p_order_id returning * into v_order;
  elsif p_action='request_return' then
    if v_order.status <> 'Delivered' then raise exception 'A return can only be requested after delivery'; end if;
    if v_order.created_at < now()-interval '7 days' then raise exception 'The return window has expired'; end if;
    if coalesce(trim(p_reason),'')='' then raise exception 'Return reason is required'; end if;
    update public.orders set status='Return Requested',updated_at=now() where id=p_order_id returning * into v_order;
  else raise exception 'Unsupported customer order action'; end if;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'customer_'||p_action,'order',p_order_id,jsonb_build_object('reason',trim(p_reason),'note',nullif(trim(p_note),'')));
  return v_order;
end; $$;
revoke all on function public.customer_manage_order(uuid,text,text,text) from public;
grant execute on function public.customer_manage_order(uuid,text,text,text) to authenticated;
