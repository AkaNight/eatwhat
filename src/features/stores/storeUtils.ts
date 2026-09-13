import type { ItemRow, ItemType, OrderRow, PriceBucket, StoreRow } from '../../types/database'

export interface StoreSummary {
  store: StoreRow
  items: ItemRow[]
  orders: OrderRow[]
}

export const itemTypeLabels: Record<ItemType, string> = {
  meal: '主餐',
  snack: '小吃',
  drink: '饮料',
  side: '配菜',
}

export const priceBucketLabels: Record<PriceBucket, string> = {
  low: '便宜点',
  medium: '适中',
  high: '贵一点',
}

export function formatDate(value: string | null): string {
  if (!value) return '还没点过'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value))
}

export function formatItemPrice(item: ItemRow): string {
  if (item.exact_price !== null) return `¥${item.exact_price.toFixed(2).replace(/\.00$/, '')}`
  if (item.price_bucket) return priceBucketLabels[item.price_bucket]
  return '未记价格'
}

export function latestOrderAt(orders: OrderRow[]): string | null {
  return orders[0]?.ordered_at ?? null
}

export function readableDataError(error: unknown): string {
  if (!(error instanceof Error)) return '操作失败，请稍后再试。'
  if (error.message.includes('Offline writes are not supported')) return '离线时暂时不能保存，请联网后重试。'
  if (error.message.includes('violates foreign key constraint')) return '已有历史记录，暂时不能删除；可以改为拉黑。'
  if (error.message.includes('duplicate key')) return '已经有一条相同记录。'
  if (error.message.includes('At least one order item')) return '请至少选择一个商品。'
  if (error.message.includes('does not belong to this store')) return '有商品不属于当前店铺，请重新选择。'
  return '操作失败，请检查网络后再试。'
}
