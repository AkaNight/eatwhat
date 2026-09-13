import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CravingInsert,
  CravingRow,
  CravingUpdate,
  Database,
  ItemInsert,
  ItemRow,
  ItemUpdate,
  Json,
  OrderItemRow,
  OrderRow,
  PreferenceInsert,
  PreferenceRow,
  PreferenceUpdate,
  RecommendationEventInsert,
  RecommendationEventRow,
  StoreInsert,
  StoreRow,
  StoreUpdate,
} from '../../types/database'
import type {
  CreateOrderInput,
  CravingRepository,
  ItemRepository,
  OrderRepository,
  PreferenceRepository,
  RecommendationEventRepository,
  StoreRepository,
} from '../../services/data/contracts'
import { DataServiceError } from '../../services/data/errors'

type Client = SupabaseClient<Database>
type QueryError = { message: string; code?: string }

function fail(error: QueryError): never {
  throw new DataServiceError(error.message, { code: error.code, cause: error })
}

export class SupabaseStoreRepository implements StoreRepository {
  constructor(private readonly client: Client) {}

  async list(): Promise<StoreRow[]> {
    const { data, error } = await this.client.from('stores').select('*').order('updated_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async get(id: string): Promise<StoreRow | null> {
    const { data, error } = await this.client.from('stores').select('*').eq('id', id).maybeSingle()
    if (error) fail(error)
    return data
  }

  async create(input: StoreInsert): Promise<StoreRow> {
    const { data, error } = await this.client.from('stores').insert(input).select().single()
    if (error) fail(error)
    return data
  }

  async update(id: string, input: StoreUpdate): Promise<StoreRow> {
    const { data, error } = await this.client.from('stores').update(input).eq('id', id).select().single()
    if (error) fail(error)
    return data
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from('stores').delete().eq('id', id)
    if (error) fail(error)
  }
}

export class SupabaseItemRepository implements ItemRepository {
  constructor(private readonly client: Client) {}

  async list(): Promise<ItemRow[]> {
    const { data, error } = await this.client.from('items').select('*').order('updated_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async listByStore(storeId: string): Promise<ItemRow[]> {
    const { data, error } = await this.client
      .from('items')
      .select('*')
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async get(id: string): Promise<ItemRow | null> {
    const { data, error } = await this.client.from('items').select('*').eq('id', id).maybeSingle()
    if (error) fail(error)
    return data
  }

  async create(input: ItemInsert): Promise<ItemRow> {
    const { data, error } = await this.client.from('items').insert(input).select().single()
    if (error) fail(error)
    return data
  }

  async update(id: string, input: ItemUpdate): Promise<ItemRow> {
    const { data, error } = await this.client.from('items').update(input).eq('id', id).select().single()
    if (error) fail(error)
    return data
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from('items').delete().eq('id', id)
    if (error) fail(error)
  }
}

export class SupabaseOrderRepository implements OrderRepository {
  constructor(private readonly client: Client) {}

  async list(): Promise<OrderRow[]> {
    const { data, error } = await this.client.from('orders').select('*').order('ordered_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async listByStore(storeId: string): Promise<OrderRow[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('ordered_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async listAllItems(): Promise<OrderItemRow[]> {
    const { data, error } = await this.client
      .from('order_items')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async listItems(orderId: string): Promise<OrderItemRow[]> {
    const { data, error } = await this.client
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at')
    if (error) fail(error)
    return data
  }

  async create(input: CreateOrderInput): Promise<string> {
    const items: Json = input.items.map((item) => ({
      item_id: item.itemId,
      quantity: item.quantity ?? 1,
      unit_price: item.unitPrice ?? null,
      verdict_override: item.verdictOverride ?? null,
      reject_reason: item.rejectReason ?? null,
    }))

    const { data, error } = await this.client.rpc('create_order_with_items', {
      p_store_id: input.storeId,
      p_items: items,
      p_ordered_at: input.orderedAt,
      p_total_paid: input.totalPaid ?? undefined,
      p_price_range: input.priceRange ?? undefined,
      p_verdict: input.verdict,
      p_note: input.note ?? undefined,
      p_source: input.source ?? 'manual',
    })
    if (error) fail(error)
    return data
  }
}

export class SupabaseCravingRepository implements CravingRepository {
  constructor(private readonly client: Client) {}

  async list(activeOnly = false): Promise<CravingRow[]> {
    let query = this.client.from('cravings').select('*').order('created_at', { ascending: false })
    if (activeOnly) query = query.eq('active', true)
    const { data, error } = await query
    if (error) fail(error)
    return data
  }

  async create(input: CravingInsert): Promise<CravingRow> {
    const { data, error } = await this.client.from('cravings').insert(input).select().single()
    if (error) fail(error)
    return data
  }

  async update(id: string, input: CravingUpdate): Promise<CravingRow> {
    const { data, error } = await this.client.from('cravings').update(input).eq('id', id).select().single()
    if (error) fail(error)
    return data
  }

  async resolve(id: string): Promise<CravingRow> {
    return this.update(id, { active: false, resolved_at: new Date().toISOString() })
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from('cravings').delete().eq('id', id)
    if (error) fail(error)
  }
}

export class SupabasePreferenceRepository implements PreferenceRepository {
  constructor(private readonly client: Client) {}

  async list(): Promise<PreferenceRow[]> {
    const { data, error } = await this.client.from('preferences').select('*').order('updated_at', { ascending: false })
    if (error) fail(error)
    return data
  }

  async create(input: PreferenceInsert): Promise<PreferenceRow> {
    const { data, error } = await this.client.from('preferences').insert(input).select().single()
    if (error) fail(error)
    return data
  }

  async update(id: string, input: PreferenceUpdate): Promise<PreferenceRow> {
    const { data, error } = await this.client.from('preferences').update(input).eq('id', id).select().single()
    if (error) fail(error)
    return data
  }

  async endTemporary(id: string): Promise<PreferenceRow> {
    return this.update(id, { expires_at: new Date().toISOString() })
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from('preferences').delete().eq('id', id)
    if (error) fail(error)
  }
}

export class SupabaseRecommendationEventRepository implements RecommendationEventRepository {
  constructor(private readonly client: Client) {}

  async create(input: RecommendationEventInsert): Promise<RecommendationEventRow> {
    const { data, error } = await this.client.from('recommendation_events').insert(input).select().single()
    if (error) fail(error)
    return data
  }

  async listTodaySkippedItemIds(dayStartIso: string, dayEndIso: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('recommendation_events')
      .select('item_id')
      .eq('event_type', 'skipped')
      .gte('created_at', dayStartIso)
      .lt('created_at', dayEndIso)
    if (error) fail(error)
    return [...new Set(data.map(({ item_id }) => item_id))]
  }
}
