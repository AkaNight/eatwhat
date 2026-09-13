begin;

create extension if not exists pgcrypto with schema extensions;

create type public.store_status as enum ('active', 'blacklisted');
create type public.item_type as enum ('meal', 'snack', 'drink', 'side');
create type public.item_status as enum ('active', 'blacklisted');
create type public.price_bucket as enum ('low', 'medium', 'high');
create type public.order_verdict as enum ('edible', 'reject');
create type public.order_source as enum ('manual', 'screenshot');
create type public.preference_scope as enum ('long_term', 'temporary');
create type public.preference_source as enum ('user', 'ai_suggestion');
create type public.recommendation_event_type as enum ('shown', 'skipped', 'selected');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  status public.store_status not null default 'active',
  blacklist_reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  item_type public.item_type not null default 'meal',
  exact_price numeric(10, 2) check (exact_price is null or exact_price >= 0),
  price_bucket public.price_bucket,
  status public.item_status not null default 'active',
  reject_reason text,
  note text,
  category_tags text[] not null default '{}',
  taste_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint items_store_owner_fk
    foreign key (store_id, user_id)
    references public.stores(id, user_id)
    on delete cascade
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null,
  ordered_at timestamptz not null default now(),
  total_paid numeric(10, 2) check (total_paid is null or total_paid >= 0),
  price_bucket public.price_bucket,
  verdict public.order_verdict not null,
  note text,
  source public.order_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint orders_store_owner_fk
    foreign key (store_id, user_id)
    references public.stores(id, user_id)
    on delete restrict
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null,
  item_id uuid not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) check (unit_price is null or unit_price >= 0),
  verdict_override public.order_verdict,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint order_items_order_owner_fk
    foreign key (order_id, user_id)
    references public.orders(id, user_id)
    on delete cascade,
  constraint order_items_item_owner_fk
    foreign key (item_id, user_id)
    references public.items(id, user_id)
    on delete restrict
);

create table public.cravings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  scope public.preference_scope not null,
  expires_at timestamptz,
  source public.preference_source not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint long_term_preference_never_expires
    check (scope <> 'long_term' or expires_at is null)
);

create table public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null,
  event_type public.recommendation_event_type not null,
  session_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint recommendation_events_item_owner_fk
    foreign key (item_id, user_id)
    references public.items(id, user_id)
    on delete cascade
);

create index stores_user_id_idx on public.stores(user_id);
create index stores_user_name_idx on public.stores(user_id, name);
create index items_user_store_idx on public.items(user_id, store_id);
create index items_user_status_type_idx on public.items(user_id, status, item_type);
create index items_category_tags_idx on public.items using gin(category_tags);
create index items_taste_tags_idx on public.items using gin(taste_tags);
create index orders_user_ordered_at_idx on public.orders(user_id, ordered_at desc);
create index orders_user_store_idx on public.orders(user_id, store_id);
create index order_items_user_order_idx on public.order_items(user_id, order_id);
create index order_items_user_item_idx on public.order_items(user_id, item_id);
create index cravings_user_active_idx on public.cravings(user_id, active);
create index preferences_user_scope_idx on public.preferences(user_id, scope);
create index recommendation_events_user_created_idx
  on public.recommendation_events(user_id, created_at desc);
create index recommendation_events_user_item_idx
  on public.recommendation_events(user_id, item_id, event_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stores_set_updated_at before update on public.stores
for each row execute function public.set_updated_at();
create trigger items_set_updated_at before update on public.items
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger order_items_set_updated_at before update on public.order_items
for each row execute function public.set_updated_at();
create trigger cravings_set_updated_at before update on public.cravings
for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.preferences
for each row execute function public.set_updated_at();
create trigger recommendation_events_set_updated_at before update on public.recommendation_events
for each row execute function public.set_updated_at();

alter table public.stores enable row level security;
alter table public.items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cravings enable row level security;
alter table public.preferences enable row level security;
alter table public.recommendation_events enable row level security;

revoke all on public.stores from anon;
revoke all on public.items from anon;
revoke all on public.orders from anon;
revoke all on public.order_items from anon;
revoke all on public.cravings from anon;
revoke all on public.preferences from anon;
revoke all on public.recommendation_events from anon;

grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.cravings to authenticated;
grant select, insert, update, delete on public.preferences to authenticated;
grant select, insert, update, delete on public.recommendation_events to authenticated;

create policy stores_own_rows on public.stores
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy items_own_rows on public.items
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy orders_own_rows on public.orders
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy order_items_own_rows on public.order_items
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy cravings_own_rows on public.cravings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy preferences_own_rows on public.preferences
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy recommendation_events_own_rows on public.recommendation_events
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

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
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_with_items(
  uuid, jsonb, timestamptz, numeric, public.price_bucket,
  public.order_verdict, text, public.order_source
) from public;

grant execute on function public.create_order_with_items(
  uuid, jsonb, timestamptz, numeric, public.price_bucket,
  public.order_verdict, text, public.order_source
) to authenticated;

commit;
