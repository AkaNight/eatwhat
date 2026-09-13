import type { CravingRow, ItemRow, OrderItemRow, OrderRow, PriceRange, StoreRow } from '../../types/database'

export interface FoodRequirements {
  categoryTags: string[]
  tasteTags: string[]
  pricePreference: PriceRange | null
  note?: string
}

export interface RecommendationDataset {
  stores: StoreRow[]
  items: ItemRow[]
  orders: OrderRow[]
  orderItems: OrderItemRow[]
  cravings: CravingRow[]
  skippedItemIds: string[]
}

export interface RecommendationCandidate {
  item: ItemRow
  store: StoreRow
  score: number
  orderCount: number
  lastOrderedAt: string | null
  reasons: string[]
}

export interface RecommendationOptions {
  now?: Date
  limit?: number
  excludeItemIds?: string[]
  random?: () => number
}
