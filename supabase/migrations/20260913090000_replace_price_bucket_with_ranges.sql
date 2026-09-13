begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'price_range'
  ) then
    create type public.price_range as enum ('10_30', '30_50', '50_80', '80_100', '100_plus');
  end if;
end
$$;

alter table public.items add column if not exists price_range public.price_range;
alter table public.orders add column if not exists price_range public.price_range;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'items' and column_name = 'price_bucket'
  ) then
    execute $sql$
      update public.items
      set price_range = case
        when exact_price is not null and exact_price < 30 then '10_30'::public.price_range
        when exact_price is not null and exact_price < 50 then '30_50'::public.price_range
        when exact_price is not null and exact_price < 80 then '50_80'::public.price_range
        when exact_price is not null and exact_price < 100 then '80_100'::public.price_range
        when exact_price is not null then '100_plus'::public.price_range
        when price_bucket::text = 'low' then '10_30'::public.price_range
        when price_bucket::text = 'medium' then '30_50'::public.price_range
        when price_bucket::text = 'high' then '80_100'::public.price_range
        else null
      end
      where price_range is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'price_bucket'
  ) then
    execute $sql$
      update public.orders
      set price_range = case
        when total_paid is not null and total_paid < 30 then '10_30'::public.price_range
        when total_paid is not null and total_paid < 50 then '30_50'::public.price_range
        when total_paid is not null and total_paid < 80 then '50_80'::public.price_range
        when total_paid is not null and total_paid < 100 then '80_100'::public.price_range
        when total_paid is not null then '100_plus'::public.price_range
        when price_bucket::text = 'low' then '10_30'::public.price_range
        when price_bucket::text = 'medium' then '30_50'::public.price_range
        when price_bucket::text = 'high' then '80_100'::public.price_range
        else null
      end
      where price_range is null
    $sql$;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'price_bucket'
  ) then
    execute 'drop function if exists public.create_order_with_items(uuid, jsonb, timestamptz, numeric, public.price_bucket, public.order_verdict, text, public.order_source)';
  end if;
end
$$;

alter table public.items drop column if exists price_bucket;
alter table public.orders drop column if exists price_bucket;
drop type if exists public.price_bucket;

create or replace function public.create_order_with_items(
  p_store_id uuid,
  p_items jsonb,
  p_ordered_at timestamptz default now(),
  p_total_paid numeric default null,
  p_price_range public.price_range default null,
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
    user_id, store_id, ordered_at, total_paid, price_range, verdict, note, source
  ) values (
    v_user_id, p_store_id, p_ordered_at, p_total_paid, p_price_range, p_verdict, p_note, p_source
  ) returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_inserted_item_id := null;

    insert into public.order_items (
      user_id, order_id, item_id, quantity, unit_price, verdict_override, reject_reason
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
      set status = 'blacklisted', reject_reason = nullif(btrim(v_line ->> 'reject_reason'), '')
      where id = v_inserted_item_id and user_id = v_user_id;
    end if;
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_with_items(
  uuid, jsonb, timestamptz, numeric, public.price_range,
  public.order_verdict, text, public.order_source
) from public;

grant execute on function public.create_order_with_items(
  uuid, jsonb, timestamptz, numeric, public.price_range,
  public.order_verdict, text, public.order_source
) to authenticated;

commit;