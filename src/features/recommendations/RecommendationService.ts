import type { DataService } from '../../services/data'
import { recommendFromDataset } from './RecommendationEngine'
import type { FoodRequirements, RecommendationCandidate } from './types'

interface RecommendOptions {
  sessionId: string
  excludeItemIds?: string[]
  limit?: number
}

function naturalDayBounds(now: Date): [string, string] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return [start.toISOString(), end.toISOString()]
}

export class RecommendationService {
  constructor(
    private readonly data: DataService,
    private readonly userId: string,
  ) {}

  async recommend(requirements: FoodRequirements, options: RecommendOptions): Promise<RecommendationCandidate[]> {
    const now = new Date()
    const [dayStart, dayEnd] = naturalDayBounds(now)
    const [stores, items, orders, orderItems, cravings, skippedItemIds] = await Promise.all([
      this.data.stores.list(),
      this.data.items.list(),
      this.data.orders.list(),
      this.data.orders.listAllItems(),
      this.data.cravings.list(true),
      this.data.recommendationEvents.listTodaySkippedItemIds(dayStart, dayEnd),
    ])

    const candidates = recommendFromDataset(
      { stores, items, orders, orderItems, cravings, skippedItemIds },
      requirements,
      { now, limit: options.limit, excludeItemIds: options.excludeItemIds },
    )

    await Promise.all(candidates.map(({ item }) => this.data.recommendationEvents.create({
      user_id: this.userId,
      item_id: item.id,
      event_type: 'shown',
      session_id: options.sessionId,
    })))

    return candidates
  }

  async skip(itemId: string, sessionId: string): Promise<void> {
    await this.data.recommendationEvents.create({
      user_id: this.userId,
      item_id: itemId,
      event_type: 'skipped',
      session_id: sessionId,
    })
  }

  async select(itemId: string, sessionId: string): Promise<void> {
    await this.data.recommendationEvents.create({
      user_id: this.userId,
      item_id: itemId,
      event_type: 'selected',
      session_id: sessionId,
    })
  }
}
