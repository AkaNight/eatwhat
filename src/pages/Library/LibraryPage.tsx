import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, SearchIcon } from '../../components/icons/AppIcons'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../features/auth/AuthContext'
import { StoreFormModal, type StoreFormValue } from '../../features/stores/StoreFormModal'
import { formatDate, latestOrderAt, readableDataError, type StoreSummary } from '../../features/stores/storeUtils'
import { getDataService } from '../../services/data'

export function LibraryPage() {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState<StoreSummary[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const service = getDataService()
      const stores = await service.stores.list()
      const nextSummaries = await Promise.all(stores.map(async (store) => {
        const [items, orders] = await Promise.all([
          service.items.listByStore(store.id),
          service.orders.listByStore(store.id),
        ])
        return { store, items, orders }
      }))
      setSummaries(nextSummaries)
    } catch (error) {
      setLoadError(readableDataError(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN')
    if (!normalized) return summaries
    return summaries.filter(({ store, items }) =>
      store.name.toLocaleLowerCase('zh-CN').includes(normalized) ||
      items.some((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized)),
    )
  }, [query, summaries])

  async function createStore(value: StoreFormValue) {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      await getDataService().stores.create({
        user_id: user.id,
        name: value.name,
        note: value.note,
      })
      setShowCreate(false)
      await loadLibrary()
    } catch (error) {
      setSaveError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="只收你吃过的"
        title="外卖库"
        action={<button className="header-action" type="button" onClick={() => setShowCreate(true)}><PlusIcon />添加</button>}
      />
      <label className="search-box">
        <SearchIcon />
        <span className="sr-only">搜索店铺或商品</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索店铺或商品" />
      </label>

      {loading ? (
        <div className="library-state" role="status">正在整理你的外卖库…</div>
      ) : loadError ? (
        <div className="library-state is-error">
          <p>{loadError}</p>
          <button className="secondary-button" type="button" onClick={() => void loadLibrary()}>重试</button>
        </div>
      ) : summaries.length === 0 ? (
        <section className="empty-card slim">
          <div className="empty-symbol">店</div>
          <h2>先放进一家常点的店</h2>
          <p>这里不是附近餐厅榜单，只保存属于你的选择。</p>
          <button className="secondary-button" type="button" onClick={() => setShowCreate(true)}>添加店铺</button>
        </section>
      ) : filtered.length === 0 ? (
        <div className="library-state">没有找到“{query}”相关的店铺或商品。</div>
      ) : (
        <div className="store-list">
          {filtered.map(({ store, items, orders }) => {
            const availableCount = items.filter((item) => item.status === 'active').length
            const rejectedCount = items.length - availableCount
            return (
              <Link className={`store-card${store.status === 'blacklisted' ? ' is-blacklisted' : ''}`} to={`/library/${store.id}`} key={store.id}>
                <div className="store-card-top">
                  <div>
                    <h2>{store.name}</h2>
                    <p>{orders.length > 0 ? `点过 ${orders.length} 次 · 最近 ${formatDate(latestOrderAt(orders))}` : '还没有点单记录'}</p>
                  </div>
                  <span className={`status-pill ${store.status}`}>{store.status === 'active' ? '可选' : '已拉黑'}</span>
                </div>
                <div className="store-stats">
                  <span><b>{availableCount}</b> 可用商品</span>
                  <span><b>{rejectedCount}</b> 踩雷商品</span>
                  <span aria-hidden="true">›</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showCreate && (
        <StoreFormModal pending={saving} error={saveError} onClose={() => setShowCreate(false)} onSave={createStore} />
      )}
    </section>
  )
}
