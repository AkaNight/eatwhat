import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PlusIcon } from '../../components/icons/AppIcons'
import { useAuth } from '../../features/auth/AuthContext'
import { ItemFormModal, type ItemFormValue } from '../../features/items/ItemFormModal'
import { ReasonModal } from '../../features/stores/ReasonModal'
import { StoreFormModal, type StoreFormValue } from '../../features/stores/StoreFormModal'
import { formatDate, formatItemPrice, itemTypeLabels, latestOrderAt, readableDataError } from '../../features/stores/storeUtils'
import { getDataService } from '../../services/data'
import type { ItemRow, OrderRow, StoreRow } from '../../types/database'

const storeBlacklistReasons = ['整体不好吃', '品控', '卫生', '配送', '太贵', '其他']
const itemRejectReasons = ['难吃', '太腻', '太贵', '分量不行', '吃伤了', '其他']

type DialogState =
  | { type: 'edit-store' }
  | { type: 'blacklist-store' }
  | { type: 'add-item' }
  | { type: 'edit-item'; item: ItemRow }
  | { type: 'blacklist-item'; item: ItemRow }
  | null

export function StoreDetailPage() {
  const { storeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [store, setStore] = useState<StoreRow | null>(null)
  const [items, setItems] = useState<ItemRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadStore = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    setLoadError(null)
    try {
      const service = getDataService()
      const [nextStore, nextItems, nextOrders] = await Promise.all([
        service.stores.get(storeId),
        service.items.listByStore(storeId),
        service.orders.listByStore(storeId),
      ])
      setStore(nextStore)
      setItems(nextItems)
      setOrders(nextOrders)
    } catch (error) {
      setLoadError(readableDataError(error))
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void loadStore()
  }, [loadStore])

  function openDialog(nextDialog: DialogState) {
    setActionError(null)
    setDialog(nextDialog)
  }

  async function runAction(action: () => Promise<void>) {
    setSaving(true)
    setActionError(null)
    try {
      await action()
      setDialog(null)
      await loadStore()
    } catch (error) {
      setActionError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  async function saveStore(value: StoreFormValue) {
    if (!store) return
    await runAction(async () => {
      await getDataService().stores.update(store.id, { name: value.name, note: value.note })
    })
  }

  async function blacklistStore(reason: string) {
    if (!store) return
    await runAction(async () => {
      await getDataService().stores.update(store.id, { status: 'blacklisted', blacklist_reason: reason })
    })
  }

  async function restoreStore() {
    if (!store) return
    await runAction(async () => {
      await getDataService().stores.update(store.id, { status: 'active', blacklist_reason: null })
    })
  }

  async function saveItem(value: ItemFormValue, item?: ItemRow) {
    if (!store || !user) return
    await runAction(async () => {
      const payload = {
        name: value.name,
        item_type: value.itemType,
        exact_price: value.exactPrice,
        price_range: value.priceRange,
        category_tags: value.categoryTags,
        taste_tags: value.tasteTags,
        note: value.note,
      }
      if (item) {
        await getDataService().items.update(item.id, payload)
      } else {
        await getDataService().items.create({ ...payload, user_id: user.id, store_id: store.id })
      }
    })
  }

  async function blacklistItem(item: ItemRow, reason: string) {
    await runAction(async () => {
      await getDataService().items.update(item.id, { status: 'blacklisted', reject_reason: reason })
    })
  }

  async function restoreItem(item: ItemRow) {
    await runAction(async () => {
      await getDataService().items.update(item.id, { status: 'active', reject_reason: null })
    })
  }

  async function deleteItem(item: ItemRow) {
    if (!window.confirm(`确定删除“${item.name}”吗？有历史记录时会改为提示你拉黑。`)) return
    await runAction(async () => {
      await getDataService().items.remove(item.id)
    })
  }

  async function deleteStore() {
    if (!store || !window.confirm(`确定删除“${store.name}”吗？有历史订单时不会删除成功。`)) return
    setSaving(true)
    setActionError(null)
    try {
      await getDataService().stores.remove(store.id)
      navigate('/library', { replace: true })
    } catch (error) {
      setActionError(readableDataError(error))
      setSaving(false)
    }
  }

  if (loading) return <section className="page"><div className="library-state" role="status">正在打开店铺…</div></section>
  if (loadError) return <section className="page"><Link className="back-link" to="/library">← 外卖库</Link><div className="library-state is-error"><p>{loadError}</p><button className="secondary-button" type="button" onClick={() => void loadStore()}>重试</button></div></section>
  if (!store) return <section className="page"><Link className="back-link" to="/library">← 外卖库</Link><div className="library-state">没有找到这家店。</div></section>

  const activeItems = items.filter((item) => item.status === 'active')
  const rejectedItems = items.filter((item) => item.status === 'blacklisted')

  return (
    <section className="page store-detail-page">
      <Link className="back-link" to="/library">← 外卖库</Link>
      <header className="detail-header">
        <div>
          <div className="detail-title-line">
            <h1>{store.name}</h1>
            <span className={`status-pill ${store.status}`}>{store.status === 'active' ? '可选' : '已拉黑'}</span>
          </div>
          <p>{orders.length > 0 ? `点过 ${orders.length} 次 · 最近 ${formatDate(latestOrderAt(orders))}` : '还没有点单记录'}</p>
          {store.note && <p className="store-note">{store.note}</p>}
          {store.blacklist_reason && <p className="blacklist-note">拉黑原因：{store.blacklist_reason}</p>}
        </div>
        <button className="ghost-button" type="button" onClick={() => openDialog({ type: 'edit-store' })}>编辑</button>
      </header>

      {actionError && <p className="form-message is-error detail-error" role="alert">{actionError}</p>}

      <div className="store-actions">
        {store.status === 'active' ? (
          <button className="warning-button" type="button" onClick={() => openDialog({ type: 'blacklist-store' })}>拉黑整店</button>
        ) : (
          <button className="restore-button" type="button" onClick={() => void restoreStore()} disabled={saving}>恢复店铺</button>
        )}
        <button className="text-danger-button" type="button" onClick={() => void deleteStore()} disabled={saving}>删除店铺</button>
      </div>

      <section className="detail-section" aria-labelledby="active-items-title">
        <div className="section-heading compact">
          <div><p className="section-kicker">能吃</p><h2 id="active-items-title">可选商品 · {activeItems.length}</h2></div>
          <button className="header-action" type="button" onClick={() => openDialog({ type: 'add-item' })}><PlusIcon />添加</button>
        </div>
        {activeItems.length === 0 ? <div className="section-empty">还没有可用商品。</div> : (
          <div className="item-list">
            {activeItems.map((item) => (
              <article className="item-row" key={item.id}>
                <div className="item-main">
                  <div><h3>{item.name}</h3><p>{itemTypeLabels[item.item_type]} · {formatItemPrice(item)}</p></div>
                  <div className="tag-list">{[...item.category_tags, ...item.taste_tags].slice(0, 4).map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => openDialog({ type: 'edit-item', item })}>编辑</button>
                  <button type="button" className="danger-text" onClick={() => openDialog({ type: 'blacklist-item', item })}>不想再吃</button>
                  <button type="button" className="danger-text" onClick={() => void deleteItem(item)}>删除</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section" aria-labelledby="rejected-items-title">
        <div><p className="section-kicker">不想再吃</p><h2 id="rejected-items-title">踩雷商品 · {rejectedItems.length}</h2></div>
        {rejectedItems.length === 0 ? <div className="section-empty">暂时没有踩雷商品。</div> : (
          <div className="item-list rejected-list">
            {rejectedItems.map((item) => (
              <article className="item-row" key={item.id}>
                <div className="item-main"><div><h3>{item.name}</h3><p>{item.reject_reason ?? '未填写原因'}</p></div></div>
                <div className="row-actions"><button type="button" onClick={() => void restoreItem(item)} disabled={saving}>恢复</button><button type="button" onClick={() => openDialog({ type: 'edit-item', item })}>编辑</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section" aria-labelledby="orders-title">
        <div><p className="section-kicker">历史订单</p><h2 id="orders-title">点过的记录 · {orders.length}</h2></div>
        {orders.length === 0 ? <div className="section-empty">记录第一顿后，会显示在这里。</div> : (
          <div className="order-list">
            {orders.map((order) => (
              <div className="order-row" key={order.id}>
                <div><strong>{formatDate(order.ordered_at)}</strong><span>{order.verdict === 'edible' ? '能吃' : '不想再吃'}</span></div>
                <span>{order.total_paid === null ? '未记实付' : `¥${order.total_paid}`}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {dialog?.type === 'edit-store' && <StoreFormModal store={store} pending={saving} error={actionError} onClose={() => setDialog(null)} onSave={saveStore} />}
      {dialog?.type === 'blacklist-store' && <ReasonModal title="为什么不再选这家店？" reasons={storeBlacklistReasons} pending={saving} error={actionError} onClose={() => setDialog(null)} onSave={blacklistStore} />}
      {dialog?.type === 'add-item' && <ItemFormModal pending={saving} error={actionError} onClose={() => setDialog(null)} onSave={(value) => saveItem(value)} />}
      {dialog?.type === 'edit-item' && <ItemFormModal item={dialog.item} pending={saving} error={actionError} onClose={() => setDialog(null)} onSave={(value) => saveItem(value, dialog.item)} />}
      {dialog?.type === 'blacklist-item' && <ReasonModal title={`为什么不想再吃“${dialog.item.name}”？`} reasons={itemRejectReasons} pending={saving} error={actionError} onClose={() => setDialog(null)} onSave={(reason) => blacklistItem(dialog.item, reason)} />}
    </section>
  )
}
