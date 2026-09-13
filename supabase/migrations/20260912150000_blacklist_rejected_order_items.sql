begin;

create or replace function public.create_order_with_items(
  p_store_id uuid,
  p_items jsonb,
  p_ordered_at timestamptz default now(),
  p_total_paid numeric default null,
  p_price_bucket public.price_bucket default null,
  p_verdict public.order_verdict default 'edible',
  p_note text default null,
  p_source public.order_source default 'manual'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_line jsonb;
  v_inserted_item_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.stores
    where id = p_store_id and user_id = v_user_id
  ) then
    raise exception 'Store not found' using errcode = 'P0002';
  end if;

  insert into public.orders (
    user_id, store_id, ordered_at, total_paid, price_bucket, verdict, note, source
  ) values (
    v_user_id, p_store_id, p_ordered_at, p_total_paid, p_price_bucket, p_verdict, p_note, p_source
  ) returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_inserted_item_id := null;

    insert into public.order_items (
      user_id,
      order_id,
      item_id,
      quantity,
      unit_price,
      verdict_override,
      reject_reason
    )
    select
      v_user_id,
      v_order_id,
      item.id,
      coalesce((v_line ->> 'quantity')::integer, 1),
      (v_line ->> 'unit_price')::numeric,
      (v_line ->> 'verdict_override')::public.order_verdict,
      nullif(btrim(v_line ->> 'reject_reason'), '')
    from public.items as item
    where item.id = (v_line ->> 'item_id')::uuid
      and item.user_id = v_user_id
      and item.store_id = p_store_id
    returning item_id into v_inserted_item_id;

    if v_inserted_item_id is null then
      raise exception 'Order item does not belong to this store' using errcode = '23503';
    end if;

    if (v_line ->> 'verdict_override') = 'reject' then
      update public.items
      set
        status = 'blacklisted',
        reject_reason = nullif(btrim(v_line ->> 'reject_reason'), '')
      where id = v_inserted_item_id and user_id = v_user_id;
    end if;
  end loop;

  return v_order_id;
end;
$$;

commit;
