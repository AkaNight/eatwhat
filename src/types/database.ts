export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type StoreStatus = 'active' | 'blacklisted'
export type ItemType = 'meal' | 'snack' | 'drink' | 'side'
export type ItemStatus = 'active' | 'blacklisted'
export type PriceRange = '10_30' | '30_50' | '50_80' | '80_100' | '100_plus'
export type OrderVerdict = 'edible' | 'reject'
export type OrderSource = 'manual' | 'screenshot'
export type PreferenceScope = 'long_term' | 'temporary'
export type PreferenceSource = 'user' | 'ai_suggestion'
export type RecommendationEventType = 'shown' | 'skipped' | 'selected'

export type StoreRow = {
  id: string
  user_id: string
  name: string
  status: StoreStatus
  blacklist_reason: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type ItemRow = {
  id: string
  user_id: string
  store_id: string
  name: string
  item_type: ItemType
  exact_price: number | null
  price_range: PriceRange | null
  status: ItemStatus
  reject_reason: string | null
  note: string | null
  category_tags: string[]
  taste_tags: string[]
  created_at: string
  updated_at: string
}

export type OrderRow = {
  id: string
  user_id: string
  store_id: string
  ordered_at: string
  total_paid: number | null
  price_range: PriceRange | null
  verdict: OrderVerdict
  note: string | null
  source: OrderSource
  created_at: string
  updated_at: string
}

export type OrderItemRow = {
  id: string
  user_id: string
  order_id: string
  item_id: string
  quantity: number
  unit_price: number | null
  verdict_override: OrderVerdict | null
  reject_reason: string | null
  created_at: string
  updated_at: string
}

export type CravingRow = {
  id: string
  user_id: string
  label: string
  active: boolean
  created_at: string
  resolved_at: string | null
  updated_at: string
}

export type PreferenceRow = {
  id: string
  user_id: string
  content: string
  scope: PreferenceScope
  expires_at: string | null
  source: PreferenceSource
  created_at: string
  updated_at: string
}

export type RecommendationEventRow = {
  id: string
  user_id: string
  item_id: string
  event_type: RecommendationEventType
  session_id: string
  created_at: string
  updated_at: string
}

type Timestamps = 'id' | 'created_at' | 'updated_at'

export type StoreInsert = Omit<StoreRow, Timestamps | 'status' | 'blacklist_reason' | 'note'> &
  Partial<Pick<StoreRow, Timestamps | 'status' | 'blacklist_reason' | 'note'>>
export type StoreUpdate = Partial<Omit<StoreRow, 'id' | 'user_id' | 'created_at'>>

export type ItemInsert = Omit<ItemRow, Timestamps | 'item_type' | 'exact_price' | 'price_range' | 'status' | 'reject_reason' | 'note' | 'category_tags' | 'taste_tags'> &
  Partial<Pick<ItemRow, Timestamps | 'item_type' | 'exact_price' | 'price_range' | 'status' | 'reject_reason' | 'note' | 'category_tags' | 'taste_tags'>>
export type ItemUpdate = Partial<Omit<ItemRow, 'id' | 'user_id' | 'created_at'>>

export type OrderInsert = Omit<OrderRow, Timestamps | 'ordered_at' | 'total_paid' | 'price_range' | 'note' | 'source'> &
  Partial<Pick<OrderRow, Timestamps | 'ordered_at' | 'total_paid' | 'price_range' | 'note' | 'source'>>
export type OrderUpdate = Partial<Omit<OrderRow, 'id' | 'user_id' | 'created_at'>>

export type OrderItemInsert = Omit<OrderItemRow, Timestamps | 'quantity' | 'unit_price' | 'verdict_override' | 'reject_reason'> &
  Partial<Pick<OrderItemRow, Timestamps | 'quantity' | 'unit_price' | 'verdict_override' | 'reject_reason'>>
export type OrderItemUpdate = Partial<Omit<OrderItemRow, 'id' | 'user_id' | 'created_at'>>

export type CravingInsert = Omit<CravingRow, Timestamps | 'active' | 'resolved_at'> &
  Partial<Pick<CravingRow, Timestamps | 'active' | 'resolved_at'>>
export type CravingUpdate = Partial<Omit<CravingRow, 'id' | 'user_id' | 'created_at'>>

export type PreferenceInsert = Omit<PreferenceRow, Timestamps | 'expires_at' | 'source'> &
  Partial<Pick<PreferenceRow, Timestamps | 'expires_at' | 'source'>>
export type PreferenceUpdate = Partial<Omit<PreferenceRow, 'id' | 'user_id' | 'created_at'>>

export type RecommendationEventInsert = Omit<RecommendationEventRow, Timestamps> &
  Partial<Pick<RecommendationEventRow, Timestamps>>

export type Database = {
  public: {
    Tables: {
      stores: { Row: StoreRow; Insert: StoreInsert; Update: StoreUpdate; Relationships: [] }
      items: { Row: ItemRow; Insert: ItemInsert; Update: ItemUpdate; Relationships: [] }
      orders: { Row: OrderRow; Insert: OrderInsert; Update: OrderUpdate; Relationships: [] }
      order_items: { Row: OrderItemRow; Insert: OrderItemInsert; Update: OrderItemUpdate; Relationships: [] }
      cravings: { Row: CravingRow; Insert: CravingInsert; Update: CravingUpdate; Relationships: [] }
      preferences: { Row: PreferenceRow; Insert: PreferenceInsert; Update: PreferenceUpdate; Relationships: [] }
      recommendation_events: {
        Row: RecommendationEventRow
        Insert: RecommendationEventInsert
        Update: Partial<Omit<RecommendationEventRow, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      create_order_with_items: {
        Args: {
          p_store_id: string
          p_items: Json
          p_ordered_at?: string
          p_total_paid?: number
          p_price_range?: PriceRange
          p_verdict?: OrderVerdict
          p_note?: string
          p_source?: OrderSource
        }
        Returns: string
      }
    }
    Enums: {
      store_status: StoreStatus
      item_type: ItemType
      item_status: ItemStatus
      price_range: PriceRange
      order_verdict: OrderVerdict
      order_source: OrderSource
      preference_scope: PreferenceScope
      preference_source: PreferenceSource
      recommendation_event_type: RecommendationEventType
    }
    CompositeTypes: Record<never, never>
  }
}
