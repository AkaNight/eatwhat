import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../features/auth/AuthContext'
import { usePwaInstall } from '../../features/pwa/pwaInstall'
import { readableDataError } from '../../features/stores/storeUtils'
import { getDataService } from '../../services/data'
import { useSyncStatus, type SyncState } from '../../services/data/syncStatus'
import type { ItemRow, PreferenceRow, PreferenceScope, StoreRow } from '../../types/database'

const syncLabels: Record<SyncState, string> = {
  idle: '等待同步', syncing: '同步中…', synced: '已同步', offline: '离线缓存', error: '同步失败',
}

type Panel = PreferenceScope | 'blacklist' | null

function isTemporaryActive(preference: PreferenceRow): boolean {
  return preference.scope === 'temporary' && (!preference.expires_at || new Date(preference.expires_at).getTime() > Date.now())
}

function formatExpiry(value: string | null): string {
  if (!value) return '手动结束'
  if (new Date(value).getTime() <= Date.now()) return '已结束'
  return `到 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value))}`
}

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const syncStatus = useSyncStatus()
  const pwaInstall = usePwaInstall()
  const [preferences, setPreferences] = useState<PreferenceRow[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const [content, setContent] = useState('')
  const [temporaryDays, setTemporaryDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const longTermPreferences = useMemo(() => preferences.filter((preference) => preference.scope === 'long_term'), [preferences])
  const temporaryPreferences = useMemo(() => preferences.filter((preference) => preference.scope === 'temporary'), [preferences])
  const activeTemporaryCount = temporaryPreferences.filter(isTemporaryActive).length
  const blacklistedStores = stores.filter((store) => store.status === 'blacklisted')
  const blacklistedItems = items.filter((item) => item.status === 'blacklisted')
  const storeNames = useMemo(() => new Map(stores.map((store) => [store.id, store.name])), [stores])

  useEffect(() => {
    let active = true
    void Promise.all([getDataService().preferences.list(), getDataService().stores.list(), getDataService().items.list()])
      .then(([nextPreferences, nextStores, nextItems]) => {
        if (!active) return
        setPreferences(nextPreferences)
        setStores(nextStores)
        setItems(nextItems)
      })
      .catch((error) => { if (active) setActionError(readableDataError(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function openPanel(nextPanel: Exclude<Panel, null>) {
    setActionError(null)
    setContent('')
    setPanel(nextPanel)
  }

  async function createPreference(scope: PreferenceScope) {
    const trimmed = content.trim()
    if (!trimmed || !user) return
    setSaving(true)
    setActionError(null)
    try {
      const expiresAt = scope === 'temporary' ? new Date(Date.now() + temporaryDays * 86_400_000).toISOString() : null
      const row = await getDataService().preferences.create({ user_id: user.id, content: trimmed, scope, expires_at: expiresAt })
      setPreferences((current) => [row, ...current])
      setContent('')
    } catch (error) {
      setActionError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  async function endTemporary(id: string) {
    setSaving(true)
    setActionError(null)
    try {
      const row = await getDataService().preferences.endTemporary(id)
      setPreferences((current) => current.map((preference) => preference.id === id ? row : preference))
    } catch (error) {
      setActionError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  async function removePreference(id: string) {
    setSaving(true)
    setActionError(null)
    try {
      await getDataService().preferences.remove(id)
      setPreferences((current) => current.filter((preference) => preference.id !== id))
    } catch (error) {
      setActionError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  async function restoreStore(store: StoreRow) {
    setSaving(true)
    setActionError(null)
    try {
      const row = await getDataService().stores.update(store.id, { status: 'active', blacklist_reason: null })
      setStores((current) => current.map((entry) => entry.id === row.id ? row : entry))
    } catch (error) {
      setActionError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  async function restoreItem(item: ItemRow) {
    setSaving(true)
    setActionError(null)
    try {
      const row = await getDataService().items.update(item.id, { status: 'active', reject_reason: null })
      setItems((current) => current.map((entry) => entry.id === row.id ? row : entry))
    } catch (error) {
      setActionError(readableDataError(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : '登出失败，请稍后再试。')
      setSigningOut(false)
    }
  }

  return (
    <section className="page">
      <PageHeader eyebrow="你的口味，你做主" title="我的" />
      <div className="profile-summary"><div className="avatar">食</div><div><h2>已登录</h2><p>{user?.email}</p></div></div>

      <div className="settings-list">
        <div className="setting-row" aria-label={`登录与同步 ${syncLabels[syncStatus.state]}`}><span>登录与同步</span><span className="setting-detail">{syncLabels[syncStatus.state]}</span></div>
        <button className="setting-row" type="button" onClick={() => openPanel('long_term')}><span>长期偏好</span><span className="setting-detail">{loading ? '读取中…' : `${longTermPreferences.length} 条`}<b aria-hidden="true">›</b></span></button>
        <button className="setting-row" type="button" onClick={() => openPanel('temporary')}><span>临时偏好</span><span className="setting-detail">{loading ? '读取中…' : `${activeTemporaryCount} 条进行中`}<b aria-hidden="true">›</b></span></button>
        <button className="setting-row" type="button" onClick={() => openPanel('blacklist')}><span>黑名单</span><span className="setting-detail">{loading ? '读取中…' : `${blacklistedStores.length + blacklistedItems.length} 项`}<b aria-hidden="true">›</b></span></button>
      </div>

      <div className="install-card"><div><strong>{pwaInstall.installed ? '已安装到设备' : '像 App 一样打开'}</strong><p>{pwaInstall.installed ? '当前正在独立窗口中运行。' : pwaInstall.available ? '安装后可以从主屏幕直接打开。' : '可通过浏览器菜单添加到主屏幕。'}</p></div>{pwaInstall.available && !pwaInstall.installed && <button type="button" onClick={() => void pwaInstall.install()}>安装</button>}</div>
      <div className="ai-note"><span>AI</span><div><strong>AI 功能尚未启用</strong><p>不会要求你在浏览器里填写 API Key。</p></div></div>
      {actionError && !panel && <p className="form-message is-error" role="alert">{actionError}</p>}
      {signOutError && <p className="form-message is-error" role="alert">{signOutError}</p>}
      <button className="sign-out-button" type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut ? '正在退出…' : '退出登录'}</button>

      {(panel === 'long_term' || panel === 'temporary') && <Modal title={panel === 'long_term' ? '长期偏好' : '临时偏好'} onClose={() => setPanel(null)}>
        <form className="profile-modal-form" onSubmit={(event) => { event.preventDefault(); void createPreference(panel) }}>
          <label><span>{panel === 'long_term' ? '记住一种长期习惯' : '最近暂时不想吃什么'}</span><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} placeholder={panel === 'long_term' ? '例如：不喜欢甜口正餐' : '例如：最近吃腻炸鸡'} /></label>
          {panel === 'temporary' && <label><span>持续时间</span><select value={temporaryDays} onChange={(event) => setTemporaryDays(Number(event.target.value))}><option value={7}>7 天</option><option value={14}>14 天</option><option value={30}>30 天</option><option value={90}>90 天</option></select></label>}
          <button className="primary-button" type="submit" disabled={saving || !content.trim()}>{saving ? '保存中…' : '保存偏好'}</button>
        </form>
        {actionError && <p className="form-message is-error" role="alert">{actionError}</p>}
        <div className="profile-panel-list">
          {(panel === 'long_term' ? longTermPreferences : temporaryPreferences).length === 0 && <div className="section-empty">还没有记录。</div>}
          {(panel === 'long_term' ? longTermPreferences : temporaryPreferences).map((preference) => <article className={`preference-card${preference.scope === 'temporary' && !isTemporaryActive(preference) ? ' is-ended' : ''}`} key={preference.id}><div><strong>{preference.content}</strong>{preference.scope === 'temporary' && <p>{formatExpiry(preference.expires_at)}</p>}</div><div className="preference-actions">{isTemporaryActive(preference) && <button type="button" onClick={() => void endTemporary(preference.id)} disabled={saving}>结束</button>}<button type="button" className="danger-text-button" onClick={() => void removePreference(preference.id)} disabled={saving}>删除</button></div></article>)}
        </div>
      </Modal>}

      {panel === 'blacklist' && <Modal title="黑名单" onClose={() => setPanel(null)}>
        {actionError && <p className="form-message is-error" role="alert">{actionError}</p>}
        <div className="blacklist-section"><h3>店铺 · {blacklistedStores.length}</h3>{blacklistedStores.length === 0 && <div className="section-empty">没有拉黑店铺。</div>}{blacklistedStores.map((store) => <article className="preference-card" key={store.id}><div><strong>{store.name}</strong><p>{store.blacklist_reason || '未填写原因'}</p></div><button type="button" onClick={() => void restoreStore(store)} disabled={saving}>恢复</button></article>)}</div>
        <div className="blacklist-section"><h3>商品 · {blacklistedItems.length}</h3>{blacklistedItems.length === 0 && <div className="section-empty">没有拉黑商品。</div>}{blacklistedItems.map((item) => <article className="preference-card" key={item.id}><div><strong>{item.name}</strong><p>{storeNames.get(item.store_id) || '未知店铺'} · {item.reject_reason || '未填写原因'}</p></div><button type="button" onClick={() => void restoreItem(item)} disabled={saving}>恢复</button></article>)}</div>
      </Modal>}
    </section>
  )
}
