import type { SupabaseClient } from '@supabase/supabase-js'
import { localDatabase } from '../../../db/localDatabase'
import type {
  CravingRow,
  Database,
  ItemRow,
  OrderItemRow,
  OrderRow,
  PreferenceRow,
  RecommendationEventRow,
  StoreRow,
} from '../../../types/database'
import type { DataService } from '../contracts'
import { DataServiceError } from '../errors'
import { setSyncState } from '../syncStatus'

type LocalRow = StoreRow | ItemRow | OrderRow | OrderItemRow | CravingRow | PreferenceRow | RecommendationEventRow

export class CachedDataService implements DataService {
  readonly stores: DataService['stores']
  readonly items: DataService['items']
  readonly orders: DataService['orders']
  readonly cravings: DataService['cravings']
  readonly preferences: DataService['preferences']
  readonly recommendationEvents: DataService['recommendationEvents']

  constructor(
    private readonly remote: DataService,
    private readonly client: SupabaseClient<Database>,
  ) {
    this.stores = {
      list: () => this.read(
        () => remote.stores.list(),
        async (userId) => (await localDatabase.stores.where('user_id').equals(userId).sortBy('updated_at')).reverse(),
        (rows) => localDatabase.stores.bulkPut(rows),
      ),
      get: (id) => this.read(
        () => remote.stores.get(id),
        async (userId) => this.owned(await localDatabase.stores.get(id), userId),
        async (row) => { if (row) await localDatabase.stores.put(row) },
      ),
      create: (input) => this.write(async () => {
        const row = await remote.stores.create(input)
        await this.updateCache(() => localDatabase.stores.put(row))
        return row
      }),
      update: (id, input) => this.write(async () => {
        const row = await remote.stores.update(id, input)
        await this.updateCache(() => localDatabase.stores.put(row))
        return row
      }),
      remove: (id) => this.write(async () => {
        await remote.stores.remove(id)
        await this.updateCache(() => localDatabase.stores.delete(id))
      }),
    }

    this.items = {
      list: () => this.read(
        () => remote.items.list(),
        async (userId) => (await localDatabase.items.where('user_id').equals(userId).sortBy('updated_at')).reverse(),
        (rows) => localDatabase.items.bulkPut(rows),
      ),
      listByStore: (storeId) => this.read(
        () => remote.items.listByStore(storeId),
        async (userId) => (await localDatabase.items.where('[user_id+store_id]').equals([userId, storeId]).sortBy('updated_at')).reverse(),
        (rows) => localDatabase.items.bulkPut(rows),
      ),
      get: (id) => this.read(
        () => remote.items.get(id),
        async (userId) => this.owned(await localDatabase.items.get(id), userId),
        async (row) => { if (row) await localDatabase.items.put(row) },
      ),
      create: (input) => this.write(async () => {
        const row = await remote.items.create(input)
        await this.updateCache(() => localDatabase.items.put(row))
        return row
      }),
      update: (id, input) => this.write(async () => {
        const row = await remote.items.update(id, input)
        await this.updateCache(() => localDatabase.items.put(row))
        return row
      }),
      remove: (id) => this.write(async () => {
        await remote.items.remove(id)
        await this.updateCache(() => localDatabase.items.delete(id))
      }),
    }

    this.orders = {
      list: () => this.read(
        () => remote.orders.list(),
        async (userId) => (await localDatabase.orders.where('user_id').equals(userId).sortBy('ordered_at')).reverse(),
        (rows) => localDatabase.orders.bulkPut(rows),
      ),
      listByStore: (storeId) => this.read(
        () => remote.orders.listByStore(storeId),
        async (userId) => (await localDatabase.orders.where('user_id').equals(userId).filter((order) => order.store_id === storeId).sortBy('ordered_at')).reverse(),
        (rows) => localDatabase.orders.bulkPut(rows),
      ),
      listAllItems: () => this.read(
        () => remote.orders.listAllItems(),
        async (userId) => (await localDatabase.orderItems.where('user_id').equals(userId).sortBy('created_at')).reverse(),
        (rows) => localDatabase.orderItems.bulkPut(rows),
      ),
      listItems: (orderId) => this.read(
        () => remote.orders.listItems(orderId),
        async (userId) => localDatabase.orderItems.where('[user_id+order_id]').equals([userId, orderId]).sortBy('created_at'),
        (rows) => localDatabase.orderItems.bulkPut(rows),
      ),
      create: (input) => this.write(async () => {
        const id = await remote.orders.create(input)
        void this.syncAll().catch(() => undefined)
        return id
      }),
    }

    this.cravings = {
      list: (activeOnly = false) => this.read(
        () => remote.cravings.list(activeOnly),
        async (userId) => {
          const rows = await localDatabase.cravings.where('user_id').equals(userId).sortBy('created_at')
          return rows.reverse().filter((row) => !activeOnly || row.active)
        },
        (rows) => localDatabase.cravings.bulkPut(rows),
      ),
      create: (input) => this.write(async () => {
        const row = await remote.cravings.create(input)
        await this.updateCache(() => localDatabase.cravings.put(row))
        return row
      }),
      update: (id, input) => this.write(async () => {
        const row = await remote.cravings.update(id, input)
        await this.updateCache(() => localDatabase.cravings.put(row))
        return row
      }),
      resolve: (id) => this.write(async () => {
        const row = await remote.cravings.resolve(id)
        await this.updateCache(() => localDatabase.cravings.put(row))
        return row
      }),
      remove: (id) => this.write(async () => {
        await remote.cravings.remove(id)
        await this.updateCache(() => localDatabase.cravings.delete(id))
      }),
    }

    this.preferences = {
      list: () => this.read(
        () => remote.preferences.list(),
        async (userId) => (await localDatabase.preferences.where('user_id').equals(userId).sortBy('updated_at')).reverse(),
        (rows) => localDatabase.preferences.bulkPut(rows),
      ),
      create: (input) => this.write(async () => {
        const row = await remote.preferences.create(input)
        await this.updateCache(() => localDatabase.preferences.put(row))
        return row
      }),
      update: (id, input) => this.write(async () => {
        const row = await remote.preferences.update(id, input)
        await this.updateCache(() => localDatabase.preferences.put(row))
        return row
      }),
      endTemporary: (id) => this.write(async () => {
        const row = await remote.preferences.endTemporary(id)
        await this.updateCache(() => localDatabase.preferences.put(row))
        return row
      }),
      remove: (id) => this.write(async () => {
        await remote.preferences.remove(id)
        await this.updateCache(() => localDatabase.preferences.delete(id))
      }),
    }

    this.recommendationEvents = {
      create: (input) => this.write(async () => {
        const row = await remote.recommendationEvents.create(input)
        await this.updateCache(() => localDatabase.recommendationEvents.put(row))
        return row
      }),
      listTodaySkippedItemIds: (dayStartIso, dayEndIso) => this.read(
        () => remote.recommendationEvents.listTodaySkippedItemIds(dayStartIso, dayEndIso),
        async (userId) => {
          const rows = await localDatabase.recommendationEvents.where('[user_id+created_at]').between([userId, dayStartIso], [userId, dayEndIso], true, false).toArray()
          return [...new Set(rows.filter((row) => row.event_type === 'skipped').map((row) => row.item_id))]
        },
        async () => undefined,
      ),
    }
  }

  private owned<T extends LocalRow>(row: T | undefined, userId: string): T | null {
    return row?.user_id === userId ? row : null
  }

  private async currentUserId(): Promise<string> {
    const { data } = await this.client.auth.getSession()
    if (!data.session?.user.id) throw new DataServiceError('No active user session', { code: 'NO_SESSION' })
    return data.session.user.id
  }

  private async read<T>(remoteRead: () => Promise<T>, cachedRead: (userId: string) => Promise<T>, cacheFresh: (value: T) => Promise<unknown>): Promise<T> {
    setSyncState('syncing')
    try {
      const value = await remoteRead()
      const cacheUpdated = await this.updateCache(() => cacheFresh(value))
      setSyncState(cacheUpdated ? 'synced' : 'error')
      return value
    } catch (remoteError) {
      try {
        const value = await cachedRead(await this.currentUserId())
        setSyncState(navigator.onLine ? 'error' : 'offline')
        return value
      } catch {
        setSyncState(navigator.onLine ? 'error' : 'offline')
        throw remoteError
      }
    }
  }

  private async updateCache(operation: () => Promise<unknown>): Promise<boolean> {
    try {
      await operation()
      return true
    } catch {
      return false
    }
  }

  private async write<T>(operation: () => Promise<T>): Promise<T> {
    if (!navigator.onLine) {
      setSyncState('offline')
      throw new DataServiceError('Offline writes are not supported', { code: 'OFFLINE_WRITE' })
    }
    setSyncState('syncing')
    try {
      const value = await operation()
      setSyncState('synced')
      return value
    } catch (error) {
      setSyncState('error')
      throw error
    }
  }

  async syncAll(): Promise<void> {
    if (!navigator.onLine) {
      setSyncState('offline')
      return
    }
    const userId = await this.currentUserId()
    setSyncState('syncing')
    try {
      const [stores, items, orders, orderItems, cravings, preferences] = await Promise.all([
        this.remote.stores.list(),
        this.remote.items.list(),
        this.remote.orders.list(),
        this.remote.orders.listAllItems(),
        this.remote.cravings.list(),
        this.remote.preferences.list(),
      ])
      await localDatabase.transaction('rw', [localDatabase.stores, localDatabase.items, localDatabase.orders, localDatabase.orderItems, localDatabase.cravings, localDatabase.preferences], async () => {
        await Promise.all([
          this.replaceUserRows(stores, () => localDatabase.stores.where('user_id').equals(userId).delete(), (rows) => localDatabase.stores.bulkPut(rows)),
          this.replaceUserRows(items, () => localDatabase.items.where('user_id').equals(userId).delete(), (rows) => localDatabase.items.bulkPut(rows)),
          this.replaceUserRows(orders, () => localDatabase.orders.where('user_id').equals(userId).delete(), (rows) => localDatabase.orders.bulkPut(rows)),
          this.replaceUserRows(orderItems, () => localDatabase.orderItems.where('user_id').equals(userId).delete(), (rows) => localDatabase.orderItems.bulkPut(rows)),
          this.replaceUserRows(cravings, () => localDatabase.cravings.where('user_id').equals(userId).delete(), (rows) => localDatabase.cravings.bulkPut(rows)),
          this.replaceUserRows(preferences, () => localDatabase.preferences.where('user_id').equals(userId).delete(), (rows) => localDatabase.preferences.bulkPut(rows)),
        ])
      })
      setSyncState('synced')
    } catch (error) {
      setSyncState('error')
      throw error
    }
  }

  private async replaceUserRows<T>(rows: T[], deleteRows: () => Promise<number>, putRows: (rows: T[]) => Promise<unknown>) {
    await deleteRows()
    if (rows.length > 0) await putRows(rows)
  }
}
