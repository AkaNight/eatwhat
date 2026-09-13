import Dexie, { type EntityTable } from 'dexie'
import type {
  CravingRow,
  ItemRow,
  OrderItemRow,
  OrderRow,
  PreferenceRow,
  RecommendationEventRow,
  StoreRow,
} from '../types/database'

class EatWhatDatabase extends Dexie {
  stores!: EntityTable<StoreRow, 'id'>
  items!: EntityTable<ItemRow, 'id'>
  orders!: EntityTable<OrderRow, 'id'>
  orderItems!: EntityTable<OrderItemRow, 'id'>
  cravings!: EntityTable<CravingRow, 'id'>
  preferences!: EntityTable<PreferenceRow, 'id'>
  recommendationEvents!: EntityTable<RecommendationEventRow, 'id'>

  constructor() {
    super('eat-what-today')
    this.version(1).stores({
      stores: 'id, user_id, [user_id+updated_at]',
      items: 'id, user_id, store_id, [user_id+store_id], [user_id+updated_at]',
      orders: 'id, user_id, store_id, [user_id+ordered_at]',
      orderItems: 'id, user_id, order_id, item_id, [user_id+order_id]',
      cravings: 'id, user_id, active, [user_id+active], [user_id+updated_at]',
      preferences: 'id, user_id, scope, [user_id+updated_at]',
      recommendationEvents: 'id, user_id, item_id, event_type, created_at, [user_id+created_at]',
    })
  }
}

export const localDatabase = new EatWhatDatabase()
