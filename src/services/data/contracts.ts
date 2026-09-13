import type {
  CravingInsert,
  CravingRow,
  CravingUpdate,
  ItemInsert,
  ItemRow,
  ItemUpdate,
  OrderItemRow,
  OrderSource,
  OrderRow,
  OrderVerdict,
  PreferenceInsert,
  PreferenceRow,
  PreferenceUpdate,
  PriceRange,
  RecommendationEventInsert,
  RecommendationEventRow,
  StoreInsert,
  StoreRow,
  StoreUpdate,
} from '../../types/database'

export interface StoreRepository {
  list(): Promise<StoreRow[]>
  get(id: string): Promise<StoreRow | null>
  create(input: StoreInsert): Promise<StoreRow>
  update(id: string, input: StoreUpdate): Promise<StoreRow>
  remove(id: string): Promise<void>
}

export interface ItemRepository {
  list(): Promise<ItemRow[]>
  listByStore(storeId: string): Promise<ItemRow[]>
  get(id: string): Promise<ItemRow | null>
  create(input: ItemInsert): Promise<ItemRow>
  update(id: string, input: ItemUpdate): Promise<ItemRow>
  remove(id: string): Promise<void>
}

export interface CreateOrderItemInput {
  itemId: string
  quantity?: number
  unitPrice?: number | null
  verdictOverride?: OrderVerdict | null
  rejectReason?: string | null
}

export interface CreateOrderInput {
  storeId: string
  items: CreateOrderItemInput[]
  orderedAt?: string
  totalPaid?: number | null
  priceRange?: PriceRange | null
  verdict: OrderVerdict
  note?: string | null
  source?: OrderSource
}

export interface OrderRepository {
  list(): Promise<OrderRow[]>
  listByStore(storeId: string): Promise<OrderRow[]>
  listAllItems(): Promise<OrderItemRow[]>
  listItems(orderId: string): Promise<OrderItemRow[]>
  create(input: CreateOrderInput): Promise<string>
  update(id: string, input: CreateOrderInput): Promise<void>
  remove(id: string): Promise<void>
}

export interface CravingRepository {
  list(activeOnly?: boolean): Promise<CravingRow[]>
  create(input: CravingInsert): Promise<CravingRow>
  update(id: string, input: CravingUpdate): Promise<CravingRow>
  resolve(id: string): Promise<CravingRow>
  remove(id: string): Promise<void>
}

export interface PreferenceRepository {
  list(): Promise<PreferenceRow[]>
  create(input: PreferenceInsert): Promise<PreferenceRow>
  update(id: string, input: PreferenceUpdate): Promise<PreferenceRow>
  endTemporary(id: string): Promise<PreferenceRow>
  remove(id: string): Promise<void>
}

export interface RecommendationEventRepository {
  create(input: RecommendationEventInsert): Promise<RecommendationEventRow>
  listTodaySkippedItemIds(dayStartIso: string, dayEndIso: string): Promise<string[]>
}

export interface DataService {
  stores: StoreRepository
  items: ItemRepository
  orders: OrderRepository
  cravings: CravingRepository
  preferences: PreferenceRepository
  recommendationEvents: RecommendationEventRepository
}
