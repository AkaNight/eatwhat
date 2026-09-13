import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '../../components/icons/AppIcons'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../features/auth/AuthContext'
import { ItemFormModal, type ItemFormValue } from '../../features/items/ItemFormModal'
import { StoreFormModal, type StoreFormValue } from '../../features/stores/StoreFormModal'
import { formatDate, readableDataError } from '../../features/stores/storeUtils'
import { getDataService } from '../../services/data'
import type { ItemRow, OrderItemRow, OrderRow, OrderVerdict, PriceRange, StoreRow } from '../../types/database'

type ItemOverride = 'inherit' | OrderVerdict

interface SelectedItem {
  quantity: number
  override: ItemOverride
  rejectReason: string
}

interface HistoryEntry {
  order: OrderRow
  lines: OrderItemRow[]
}

const rejectReasons = ['难吃', '太腻', '太贵', '分量不行', '吃伤了', '其他']

function toLocalDateTimeValue(iso: string): string {
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function RecordPage() {
  const { user } = useAuth()
  const [stores, setStores] = useState<StoreRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [storeId, setStoreId] = useState('')
  const [selected, setSelected] = useState<Record<string, SelectedItem>>({})
  const [totalPaid, setTotalPaid] = useState('')
  const [verdict, setVerdict] = useState<OrderVerdict>('edible')
  const [note, setNote] = useState('')
  const [orderedAt, setOrderedAt] = useState('')
  const [orderPriceRange, setOrderPriceRange] = useState<PriceRange | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const service = getDataService()
      const [nextStores, nextItems, orders] = await Promise.all([
        service.stores.list(), service.items.list(), service.orders.list(),
      ])
      const nextHistory = await Promise.all(orders.map(async (order) => ({
        order, lines: await service.orders.listItems(order.id),
      })))
      setStores(nextStores)
      setItems(nextItems)
      setHistory(nextHistory)
      setStoreId((current) => current || nextStores.find((store) => store.status === 'active')?.id || '')
    } catch (loadError) {
      setError(readableDataError(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const availableItems = useMemo(
    () => items.filter((item) => item.store_id === storeId && (item.status === 'active' || Boolean(selected[item.id]))),
    [items, selected, storeId],
  )
  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores])
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const selectedCount = Object.keys(selected).length

  function resetForm() {
    setEditingOrderId(null)
    setStoreId(stores.find((store) => store.status === 'active')?.id || '')
    setSelected({})
    setTotalPaid('')
    setVerdict('edible')
    setNote('')
    setOrderedAt('')
    setOrderPriceRange(null)
  }

  function chooseStore(nextStoreId: string) {
    if (nextStoreId !== storeId && selectedCount > 0 && !window.confirm('切换店铺会清空已选商品，继续吗？')) return
    setStoreId(nextStoreId)
    setSelected({})
    setError(null)
  }

  function toggleItem(itemId: string) {
    setSelected((current) => {
      if (current[itemId]) {
        const next = { ...current }
        delete next[itemId]
        return next
      }
      return { ...current, [itemId]: { quantity: 1, override: 'inherit', rejectReason: rejectReasons[0] } }
    })
  }

  function updateSelected(itemId: string, patch: Partial<SelectedItem>) {
    setSelected((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }))
  }

  function beginEdit(entry: HistoryEntry) {
    setEditingOrderId(entry.order.id)
    setStoreId(entry.order.store_id)
    setSelected(Object.fromEntries(entry.lines.map((line) => [line.item_id, {
      quantity: line.quantity,
      override: line.verdict_override ?? 'inherit',
      rejectReason: line.reject_reason ?? rejectReasons[0],
    }])))
    setTotalPaid(entry.order.total_paid?.toString() ?? '')
    setVerdict(entry.order.verdict)
    setNote(entry.order.note ?? '')
    setOrderedAt(toLocalDateTimeValue(entry.order.ordered_at))
    setOrderPriceRange(entry.order.price_range)
    setError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteOrder(entry: HistoryEntry) {
    const storeName = storeMap.get(entry.order.store_id)?.name ?? '这家店'
    if (!window.confirm(`确定删除 ${storeName} 的这条记录吗？删除后无法恢复。`)) return
    setDeletingOrderId(entry.order.id)
    setError(null)
    setSuccess(null)
    try {
      await getDataService().orders.remove(entry.order.id)
      if (editingOrderId === entry.order.id) resetForm()
      setHistory((current) => current.filter(({ order }) => order.id !== entry.order.id))
      setSuccess('这条记录已删除。')
    } catch (deleteError) {
      setError(readableDataError(deleteError))
    } finally {
      setDeletingOrderId(null)
    }
  }

  async function createStore(value: StoreFormValue) {
    if (!user) return
    setSaving(true)
    setModalError(null)
    try {
      const store = await getDataService().stores.create({ user_id: user.id, name: value.name, note: value.note })
      setStores((current) => [store, ...current])
      setStoreId(store.id)
      setSelected({})
      setShowStoreForm(false)
    } catch (createError) {
      setModalError(readableDataError(createError))
    } finally {
      setSaving(false)
    }
  }

  async function createItem(value: ItemFormValue) {
    if (!user || !storeId) return
    setSaving(true)
    setModalError(null)
    try {
      const item = await getDataService().items.create({
        user_id: user.id, store_id: storeId, name: value.name, item_type: value.itemType,
        exact_price: value.exactPrice, price_range: value.priceRange,
        category_tags: value.categoryTags, taste_tags: value.tasteTags, note: value.note,
      })
      setItems((current) => [item, ...current])
      setSelected((current) => ({ ...current, [item.id]: { quantity: 1, override: 'inherit', rejectReason: rejectReasons[0] } }))
      setShowItemForm(false)
    } catch (createError) {
      setModalError(readableDataError(createError))
    } finally {
      setSaving(false)
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!storeId || selectedCount === 0) {
      setError('请选择店铺和至少一个商品。')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    const payload = {
      storeId,
      items: Object.entries(selected).map(([itemId, selection]) => ({
        itemId,
        quantity: selection.quantity,
        unitPrice: itemMap.get(itemId)?.exact_price ?? null,
        verdictOverride: selection.override === 'inherit' ? null : selection.override,
        rejectReason: selection.override === 'reject' ? selection.rejectReason : null,
      })),
      orderedAt: orderedAt ? new Date(orderedAt).toISOString() : undefined,
      totalPaid: totalPaid === '' ? null : Number(totalPaid),
      priceRange: orderPriceRange,
      verdict,
      note: note.trim() || null,
      source: 'manual' as const,
    }

    try {
      if (editingOrderId) {
        await getDataService().orders.update(editingOrderId, payload)
        setSuccess('改好了，这条记录已经更新。')
      } else {
        await getDataService().orders.create(payload)
        setSuccess('记好了，这顿已经放进你的历史。')
      }
      resetForm()
      await loadData()
    } catch (submitError) {
      setError(readableDataError(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page record-page">
      <PageHeader eyebrow={editingOrderId ? '正在修改历史记录' : '吃完顺手记'} title={editingOrderId ? '编辑记录' : '记录'} />

      {loading ? <div className="library-state" role="status">正在准备记录表…</div> : (
        <>
          {editingOrderId && <div className="edit-order-banner"><span>正在编辑已有记录</span><button type="button" onClick={resetForm}>取消编辑</button></div>}
          <form className="order-form" onSubmit={submitOrder}>
            <section className="order-step">
              <div className="step-heading"><span>1</span><div><h2>哪家店？</h2><p>选择已有店铺，或者现场建一个。</p></div></div>
              <div className="inline-picker">
                <select value={storeId} onChange={(event) => chooseStore(event.target.value)} aria-label="选择店铺">
                  <option value="">选择店铺</option>
                  {stores.map((store) => <option value={store.id} key={store.id}>{store.name}{store.status === 'blacklisted' ? '（已拉黑）' : ''}</option>)}
                </select>
                <button type="button" className="ghost-button" onClick={() => { setModalError(null); setShowStoreForm(true) }}><PlusIcon />新店</button>
              </div>
            </section>

            <section className="order-step">
              <div className="step-heading"><span>2</span><div><h2>吃了什么？</h2><p>可以一次选多个商品。</p></div></div>
              {!storeId ? <div className="section-empty">先选择一家店。</div> : availableItems.length === 0 ? <div className="section-empty">这家店还没有可选商品。</div> : (
                <div className="order-item-picker">
                  {availableItems.map((item) => {
                    const selection = selected[item.id]
                    return (
                      <div className={`order-pick-row${selection ? ' is-selected' : ''}`} key={item.id}>
                        <button className="pick-main" type="button" onClick={() => toggleItem(item.id)} aria-pressed={Boolean(selection)}>
                          <span className="check-mark">{selection ? '✓' : ''}</span>
                          <span><strong>{item.name}</strong><small>{item.item_type === 'meal' ? '主餐' : item.item_type === 'drink' ? '饮料' : item.item_type === 'snack' ? '小吃' : '配菜'}{item.status === 'blacklisted' ? ' · 已拉黑' : ''}</small></span>
                        </button>
                        {selection && <div className="picked-options">
                          <label>数量<span className="quantity-control"><button type="button" onClick={() => updateSelected(item.id, { quantity: Math.max(1, selection.quantity - 1) })}>−</button><b>{selection.quantity}</b><button type="button" onClick={() => updateSelected(item.id, { quantity: selection.quantity + 1 })}>＋</button></span></label>
                          <label>单品评价<select value={selection.override} onChange={(event) => updateSelected(item.id, { override: event.target.value as ItemOverride })}><option value="inherit">跟随整单</option><option value="edible">能吃</option><option value="reject">不想再吃</option></select></label>
                          {selection.override === 'reject' && <label>原因<select value={selection.rejectReason} onChange={(event) => updateSelected(item.id, { rejectReason: event.target.value })}>{rejectReasons.map((reason) => <option value={reason} key={reason}>{reason}</option>)}</select></label>}
                        </div>}
                      </div>
                    )
                  })}
                </div>
              )}
              {storeId && <button className="add-inline-button" type="button" onClick={() => { setModalError(null); setShowItemForm(true) }}><PlusIcon />新增商品</button>}
            </section>

            <section className="order-step">
              <div className="step-heading"><span>3</span><div><h2>这顿怎么样？</h2><p>价格和备注都可以不填。</p></div></div>
              <fieldset className="verdict-picker">
                <legend className="sr-only">整体评价</legend>
                <label className={verdict === 'edible' ? 'is-selected' : ''}><input type="radio" name="verdict" value="edible" checked={verdict === 'edible'} onChange={() => setVerdict('edible')} /><strong>能吃</strong><small>以后还可以推荐</small></label>
                <label className={verdict === 'reject' ? 'is-selected reject' : ''}><input type="radio" name="verdict" value="reject" checked={verdict === 'reject'} onChange={() => setVerdict('reject')} /><strong>不想再吃</strong><small>保留这次记录</small></label>
              </fieldset>
              <label className="simple-field"><span>用餐时间</span><input type="datetime-local" value={orderedAt} onChange={(event) => setOrderedAt(event.target.value)} placeholder="默认现在" /></label>
              <label className="simple-field"><span>本单实付</span><input type="number" min="0" step="0.01" inputMode="decimal" value={totalPaid} onChange={(event) => setTotalPaid(event.target.value)} placeholder="可不填" /></label>
              <label className="simple-field"><span>备注</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="可不填" /></label>
            </section>

            {error && <p className="form-message is-error" role="alert">{error}</p>}
            {success && <p className="form-message is-success" role="status">{success}</p>}
            <button className="primary-button" type="submit" disabled={saving || !storeId || selectedCount === 0}>{saving ? '保存中…' : editingOrderId ? `保存修改 · ${selectedCount} 样` : `记下这顿${selectedCount > 0 ? ` · ${selectedCount} 样` : ''}`}</button>
          </form>

          <section className="history-section" aria-labelledby="history-title">
            <div><p className="section-kicker">最近记录</p><h2 id="history-title">吃过的 · {history.length}</h2></div>
            {history.length === 0 ? <div className="section-empty">第一顿记录会出现在这里。</div> : (
              <div className="meal-history-list">
                {history.map((entry) => {
                  const { order, lines } = entry
                  return <article className={`meal-history-card${editingOrderId === order.id ? ' is-editing' : ''}`} key={order.id}>
                    <div className="meal-history-head"><div><h3>{storeMap.get(order.store_id)?.name ?? '未知店铺'}</h3><p>{formatDate(order.ordered_at)}</p></div><span className={`meal-verdict ${order.verdict}`}>{order.verdict === 'edible' ? '能吃' : '不想再吃'}</span></div>
                    <ul>{lines.map((line) => <li key={line.id}><span>{itemMap.get(line.item_id)?.name ?? '已删除商品'}{line.quantity > 1 ? ` ×${line.quantity}` : ''}</span>{line.verdict_override && <em>{line.verdict_override === 'edible' ? '能吃' : `不想再吃${line.reject_reason ? `：${line.reject_reason}` : ''}`}</em>}</li>)}</ul>
                    <div className="meal-history-foot"><span>{order.note ?? '没有备注'}</span><strong>{order.total_paid === null ? '未记实付' : `¥${order.total_paid}`}</strong></div>
                    <div className="history-actions"><button type="button" onClick={() => beginEdit(entry)} disabled={saving || deletingOrderId === order.id}>编辑</button><button className="danger" type="button" onClick={() => void deleteOrder(entry)} disabled={saving || deletingOrderId === order.id}>{deletingOrderId === order.id ? '删除中…' : '删除'}</button></div>
                  </article>
                })}
              </div>
            )}
          </section>
        </>
      )}

      {showStoreForm && <StoreFormModal pending={saving} error={modalError} onClose={() => setShowStoreForm(false)} onSave={createStore} />}
      {showItemForm && <ItemFormModal pending={saving} error={modalError} onClose={() => setShowItemForm(false)} onSave={createItem} />}
    </section>
  )
}