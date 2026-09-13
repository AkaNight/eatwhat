import type { ItemRow, OrderItemRow, OrderRow } from '../../types/database'
import type {
  FoodRequirements,
  RecommendationCandidate,
  RecommendationDataset,
  RecommendationOptions,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function intersects(left: string[], right: string[]): string[] {
  const normalized = new Set(right.map((value) => value.trim().toLocaleLowerCase('zh-CN')))
  return left.filter((value) => normalized.has(value.trim().toLocaleLowerCase('zh-CN')))
}

function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS))
}

function recencyScore(days: number): number {
  if (days < 3) return -20
  if (days < 7) return 2
  if (days < 14) return 5
  if (days < 30) return 8
  return 10
}

function historyForItem(
  itemId: string,
  orderItems: OrderItemRow[],
  orderMap: Map<string, OrderRow>,
): OrderRow[] {
  return orderItems
    .filter((line) => line.item_id === itemId)
    .map((line) => orderMap.get(line.order_id))
    .filter((order): order is OrderRow => Boolean(order))
    .sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime())
}

function recentCategoryCount(
  item: ItemRow,
  itemsById: Map<string, ItemRow>,
  orderItems: OrderItemRow[],
  orderMap: Map<string, OrderRow>,
  now: Date,
): number {
  const since = now.getTime() - 7 * DAY_MS
  return orderItems.reduce((count, line) => {
    const order = orderMap.get(line.order_id)
    const orderedItem = itemsById.get(line.item_id)
    if (!order || !orderedItem || new Date(order.ordered_at).getTime() < since) return count
    return intersects(item.category_tags, orderedItem.category_tags).length > 0 ? count + 1 : count
  }, 0)
}

function scoreCandidate(
  item: ItemRow,
  store: RecommendationCandidate['store'],
  dataset: RecommendationDataset,
  requirements: FoodRequirements,
  now: Date,
  orderMap: Map<string, OrderRow>,
  itemsById: Map<string, ItemRow>,
): RecommendationCandidate {
  let score = 10
  const reasons: string[] = []
  const cravingLabels = dataset.cravings.filter((craving) => craving.active).map((craving) => craving.label)
  const cravingMatches = intersects(item.category_tags, cravingLabels)
  const categoryMatches = intersects(item.category_tags, requirements.categoryTags)
  const tasteMatches = intersects(item.taste_tags, requirements.tasteTags)
  const history = historyForItem(item.id, dataset.orderItems, orderMap)
  const lastOrderedAt = history[0]?.ordered_at ?? null

  if (cravingMatches.length > 0) {
    score += 30
    reasons.push(`最近想吃${cravingMatches[0]}`)
  }
  if (categoryMatches.length > 0) {
    score += 25
    reasons.push(`符合“${categoryMatches[0]}”`)
  }
  if (tasteMatches.length > 0) {
    score += tasteMatches.length * 10
    reasons.push(...tasteMatches.slice(0, 2).map((tag) => `符合“${tag}”`))
  }
  if (requirements.pricePreference === '10_30' && (item.price_range === '10_30' || (item.exact_price !== null && item.exact_price <= 30))) {
    score += 12
    reasons.push('价格比较轻松')
  }

  score += Math.min(history.length * 2, 12)

  if (lastOrderedAt) {
    const days = daysSince(lastOrderedAt, now)
    score += recencyScore(days)
    if (days >= 7) reasons.push(`${days} 天没吃了`)
  } else {
    score += 4
  }

  const recentSameCategory = recentCategoryCount(item, itemsById, dataset.orderItems, orderMap, now)
  const categoryPenalty = Math.min(Math.max(recentSameCategory - 1, 0) * 3, 12)
  score -= categoryPenalty

  if (history.length > 0) reasons.push(`以前点过 ${history.length} 次`)
  if (recentSameCategory === 0 && item.category_tags.length > 0) reasons.push('最近没吃过这一类')
  if (reasons.length === 0) reasons.push('最近没有吃过它')

  return {
    item,
    store,
    score,
    orderCount: history.length,
    lastOrderedAt,
    reasons: [...new Set(reasons)].slice(0, 3),
  }
}

export function weightedSampleWithoutReplacement(
  candidates: RecommendationCandidate[],
  limit: number,
  random: () => number,
): RecommendationCandidate[] {
  const pool = [...candidates]
  const selected: RecommendationCandidate[] = []

  while (pool.length > 0 && selected.length < limit) {
    const minimum = Math.min(...pool.map(({ score }) => score))
    const weights = pool.map(({ score }) => Math.max(score - minimum + 5, 1))
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = random() * total
    let pickedIndex = pool.length - 1

    for (let index = 0; index < pool.length; index += 1) {
      cursor -= weights[index]
      if (cursor <= 0) {
        pickedIndex = index
        break
      }
    }

    selected.push(pool[pickedIndex])
    pool.splice(pickedIndex, 1)
  }

  return selected
}

export function recommendFromDataset(
  dataset: RecommendationDataset,
  requirements: FoodRequirements,
  options: RecommendationOptions = {},
): RecommendationCandidate[] {
  const now = options.now ?? new Date()
  const limit = Math.min(Math.max(options.limit ?? 4, 3), 5)
  const excludedIds = new Set([...dataset.skippedItemIds, ...(options.excludeItemIds ?? [])])
  const activeStores = new Map(dataset.stores.filter((store) => store.status === 'active').map((store) => [store.id, store]))
  const orderMap = new Map(dataset.orders.map((order) => [order.id, order]))
  const itemsById = new Map(dataset.items.map((item) => [item.id, item]))

  const scored = dataset.items
    .filter((item) => item.item_type === 'meal' && item.status === 'active' && activeStores.has(item.store_id) && !excludedIds.has(item.id))
    .map((item) => scoreCandidate(item, activeStores.get(item.store_id)!, dataset, requirements, now, orderMap, itemsById))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return weightedSampleWithoutReplacement(scored, limit, options.random ?? Math.random)
}
