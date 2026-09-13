import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { PlusIcon } from '../../components/icons/AppIcons'
import { useAuth } from '../auth/AuthContext'
import { readableDataError } from '../stores/storeUtils'
import { getDataService } from '../../services/data'
import type { CravingRow } from '../../types/database'

export function CravingPanel() {
  const { user } = useAuth()
  const [cravings, setCravings] = useState<CravingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showInput, setShowInput] = useState(false)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadCravings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCravings(await getDataService().cravings.list(true))
    } catch (loadError) {
      setError(readableDataError(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCravings()
  }, [loadCravings])

  async function addCraving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = label.trim()
    if (!user || !normalized || saving) return

    if (cravings.some((craving) => craving.label.toLocaleLowerCase('zh-CN') === normalized.toLocaleLowerCase('zh-CN'))) {
      setError('这个已经在“最近想吃”里了。')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const craving = await getDataService().cravings.create({ user_id: user.id, label: normalized })
      setCravings((current) => [craving, ...current])
      setLabel('')
      setShowInput(false)
    } catch (createError) {
      setError(readableDataError(createError))
    } finally {
      setSaving(false)
    }
  }

  async function resolveCraving(craving: CravingRow) {
    setPendingId(craving.id)
    setError(null)
    try {
      await getDataService().cravings.resolve(craving.id)
      setCravings((current) => current.filter(({ id }) => id !== craving.id))
    } catch (resolveError) {
      setError(readableDataError(resolveError))
    } finally {
      setPendingId(null)
    }
  }

  async function deleteCraving(craving: CravingRow) {
    if (!window.confirm(`确定删除“${craving.label}”吗？`)) return
    setPendingId(craving.id)
    setError(null)
    try {
      await getDataService().cravings.remove(craving.id)
      setCravings((current) => current.filter(({ id }) => id !== craving.id))
    } catch (deleteError) {
      setError(readableDataError(deleteError))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="card cravings-card" aria-labelledby="cravings-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">最近想吃</p>
          <h2 id="cravings-title">先记下那一口</h2>
        </div>
        <button
          className={`icon-button${showInput ? ' is-open' : ''}`}
          type="button"
          aria-label={showInput ? '收起新增输入' : '新增最近想吃'}
          aria-expanded={showInput}
          onClick={() => { setShowInput((current) => !current); setError(null) }}
        >
          <PlusIcon />
        </button>
      </div>

      {showInput && (
        <form className="craving-form" onSubmit={addCraving}>
          <label>
            <span className="sr-only">最近想吃什么</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="比如：米线" maxLength={80} autoFocus required />
          </label>
          <button type="submit" disabled={saving || !label.trim()}>{saving ? '保存中' : '加上'}</button>
        </form>
      )}

      {loading ? (
        <div className="empty-inline" role="status">正在看看你馋什么…</div>
      ) : cravings.length === 0 ? (
        <div className="empty-inline">还没有特别想吃的，随缘也很好。</div>
      ) : (
        <ul className="craving-list">
          {cravings.map((craving) => (
            <li key={craving.id}>
              <strong>{craving.label}</strong>
              <div>
                <button type="button" className="resolve-craving" onClick={() => void resolveCraving(craving)} disabled={pendingId === craving.id}>解馋了</button>
                <button type="button" className="delete-craving" aria-label={`删除${craving.label}`} onClick={() => void deleteCraving(craving)} disabled={pendingId === craving.id}>×</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="form-message is-error craving-error" role="alert">{error}</p>}
    </section>
  )
}
