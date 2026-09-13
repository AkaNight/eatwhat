import { describe, expect, it } from 'vitest'
import type { CravingRow, ItemRow, OrderItemRow, OrderRow, StoreRow } from '../../types/database'
import { recommendFromDataset, weightedSampleWithoutReplacement } from './RecommendationEngine'
import type { FoodRequirements, RecommendationCandidate, RecommendationDataset } from './types'

const now = new Date('2026-09-12T12:00:00+08:00')
const stamp = '2026-09-01T04:00:00.000Z'

function store(id: string, status: StoreRow['status'] = 'active'): StoreRow {
  return { id, user_id: 'user', name: `店铺${id}`, status, blacklist_reason: null, note: null, created_at: stamp, updated_at: stamp }
}

function item(id: string, storeId: string, overrides: Partial<ItemRow> = {}): ItemRow {
  return { id, user_id: 'user', store_id: storeId, name: id, item_type: 'meal', exact_price: 20, price_range: '10_30', status: 'active', reject_reason: null, note: null, category_tags: ['米线'], taste_tags: ['带汤'], created_at: stamp, updated_at: stamp, ...overrides }
}

function order(id: string, orderedAt: string): OrderRow {
  return { id, user_id: 'user', store_id: 's1', ordered_at: orderedAt, total_paid: null, price_range: null, verdict: 'edible', note: null, source: 'manual', created_at: orderedAt, updated_at: orderedAt }
}

function line(id: string, orderId: string, itemId: string): OrderItemRow {
  return { id, user_id: 'user', order_id: orderId, item_id: itemId, quantity: 1, unit_price: null, verdict_override: null, reject_reason: null, created_at: stamp, updated_at: stamp }
}

function dataset(overrides: Partial<RecommendationDataset> = {}): RecommendationDataset {
  return { stores: [store('s1')], items: [item('i1', 's1')], orders: [], orderItems: [], cravings: [], skippedItemIds: [], ...overrides }
}

const emptyRequirements: FoodRequirements = { categoryTags: [], tasteTags: [], pricePreference: null }

describe('recommendFromDataset', () => {
  it('hard filters blacklisted stores, blacklisted items, non-meals and today skips', () => {
    const data = dataset({
      stores: [store('s1'), store('s2', 'blacklisted')],
      items: [
        item('ok', 's1'),
        item('bad-item', 's1', { status: 'blacklisted' }),
        item('drink', 's1', { item_type: 'drink' }),
        item('bad-store', 's2'),
        item('skipped', 's1'),
      ],
      skippedItemIds: ['skipped'],
    })

    expect(recommendFromDataset(data, emptyRequirements, { random: () => 0 })).toHaveLength(1)
    expect(recommendFromDataset(data, emptyRequirements, { random: () => 0 })[0].item.id).toBe('ok')
  })

  it('adds explainable craving, taste, price and history signals', () => {
    const oldOrder = order('o1', '2026-08-20T04:00:00.000Z')
    const craving: CravingRow = { id: 'c1', user_id: 'user', label: '米线', active: true, created_at: stamp, resolved_at: null, updated_at: stamp }
    const result = recommendFromDataset(dataset({ orders: [oldOrder], orderItems: [line('l1', 'o1', 'i1')], cravings: [craving] }), {
      categoryTags: [], tasteTags: ['带汤'], pricePreference: '10_30',
    }, { now, random: () => 0 })[0]

    expect(result.score).toBeGreaterThan(60)
    expect(result.reasons).toContain('最近想吃米线')
    expect(result.reasons).toContain('符合“带汤”')
    expect(result.orderCount).toBe(1)
  })

  it('penalizes an item eaten in the last three days', () => {
    const recent = order('o1', '2026-09-11T04:00:00.000Z')
    const recentResult = recommendFromDataset(dataset({ orders: [recent], orderItems: [line('l1', 'o1', 'i1')] }), emptyRequirements, { now, random: () => 0 })[0]
    const neverResult = recommendFromDataset(dataset(), emptyRequirements, { now, random: () => 0 })[0]
    expect(recentResult.score).toBeLessThan(neverResult.score)
  })

  it('always provides a short explanation', () => {
    const result = recommendFromDataset(dataset({ items: [item('plain', 's1', { category_tags: [], taste_tags: [], price_range: null, exact_price: null })] }), emptyRequirements, { now, random: () => 0 })[0]
    expect(result.reasons).toEqual(['最近没有吃过它'])
  })
})

describe('weightedSampleWithoutReplacement', () => {
  it('returns unique candidates and respects the requested limit', () => {
    const candidates = ['a', 'b', 'c', 'd'].map((id, index) => ({ item: item(id, 's1'), store: store('s1'), score: 20 - index, orderCount: 0, lastOrderedAt: null, reasons: [] }) satisfies RecommendationCandidate)
    const result = weightedSampleWithoutReplacement(candidates, 3, () => 0.4)
    expect(result).toHaveLength(3)
    expect(new Set(result.map(({ item: resultItem }) => resultItem.id)).size).toBe(3)
  })
})
