import { useMemo, useState } from 'react'
import { SparkIcon } from '../../components/icons/AppIcons'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../features/auth/AuthContext'
import { CravingPanel } from '../../features/cravings/CravingPanel'
import { RecommendationService } from '../../features/recommendations/RecommendationService'
import type { RecommendationCandidate } from '../../features/recommendations/types'
import { formatItemPrice, readableDataError } from '../../features/stores/storeUtils'
import { getDataService } from '../../services/data'

const tasteRequirements = ['辣', '清淡', '带汤']

function formatLastEaten(value: string | null): string {
  if (!value) return '还没有点单记录'
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
  if (days === 0) return '今天吃过'
  if (days === 1) return '昨天吃过'
  return `${days} 天没吃`
}

export function TodayPage() {
  const { user } = useAuth()
  const recommendationService = useMemo(
    () => user ? new RecommendationService(getDataService(), user.id) : null,
    [user],
  )
  const [selectedTastes, setSelectedTastes] = useState<string[]>([])
  const [preferLowPrice, setPreferLowPrice] = useState(false)
  const [requestNote, setRequestNote] = useState('')
  const [recommendations, setRecommendations] = useState<RecommendationCandidate[]>([])
  const [shownIds, setShownIds] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chosenItemId, setChosenItemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)

  function toggleTaste(taste: string) {
    setSelectedTastes((current) => current.includes(taste) ? current.filter((value) => value !== taste) : [...current, taste])
  }

  async function loadRecommendations(resetSession: boolean) {
    if (!recommendationService) return
    const nextSessionId = resetSession || !sessionId ? crypto.randomUUID() : sessionId
    const excludeItemIds = resetSession ? [] : shownIds

    setLoading(true)
    setError(null)
    setEmptyMessage(null)
    if (resetSession) setChosenItemId(null)
    try {
      const result = await recommendationService.recommend({
        categoryTags: [],
        tasteTags: selectedTastes,
        pricePreference: preferLowPrice ? '10_30' : null,
        note: requestNote.trim() || undefined,
      }, {
        sessionId: nextSessionId,
        excludeItemIds,
        limit: 4,
      })
      setSessionId(nextSessionId)
      setRecommendations(result)
      setShownIds((current) => resetSession ? result.map(({ item }) => item.id) : [...new Set([...current, ...result.map(({ item }) => item.id)])])
      if (result.length === 0) {
        setEmptyMessage(resetSession ? '暂时没有符合条件的主餐。先去外卖库加几样能吃的吧。' : '剩余候选已经看完了，可以重新开始一轮。')
      }
    } catch (recommendError) {
      setError(readableDataError(recommendError))
    } finally {
      setLoading(false)
    }
  }

  async function skip(candidate: RecommendationCandidate) {
    if (!recommendationService || !sessionId) return
    setPendingItemId(candidate.item.id)
    setError(null)
    try {
      await recommendationService.skip(candidate.item.id, sessionId)
      setRecommendations((current) => current.filter(({ item }) => item.id !== candidate.item.id))
      if (chosenItemId === candidate.item.id) setChosenItemId(null)
    } catch (skipError) {
      setError(readableDataError(skipError))
    } finally {
      setPendingItemId(null)
    }
  }

  async function choose(candidate: RecommendationCandidate) {
    if (!recommendationService || !sessionId) return
    setPendingItemId(candidate.item.id)
    setError(null)
    try {
      await recommendationService.select(candidate.item.id, sessionId)
      setChosenItemId(candidate.item.id)
    } catch (selectError) {
      setError(readableDataError(selectError))
    } finally {
      setPendingItemId(null)
    }
  }

  const chosen = recommendations.find(({ item }) => item.id === chosenItemId)

  return (
    <section className="page today-page">
      <PageHeader eyebrow="午饭快到了" title="今天吃点啥？" />

      <CravingPanel />

      <section className="requirements" aria-labelledby="requirements-title">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">今天有什么要求</p>
            <h2 id="requirements-title">凭感觉选几个</h2>
          </div>
        </div>
        <div className="chip-row">
          {tasteRequirements.map((requirement) => (
            <button className={`chip${selectedTastes.includes(requirement) ? ' is-selected' : ''}`} type="button" key={requirement} aria-pressed={selectedTastes.includes(requirement)} onClick={() => toggleTaste(requirement)}>{requirement}</button>
          ))}
          <button className={`chip${preferLowPrice ? ' is-selected' : ''}`} type="button" aria-pressed={preferLowPrice} onClick={() => setPreferLowPrice((current) => !current)}>便宜点</button>
        </div>
        <label className="request-field">
          <span>或者随便说说</span>
          <textarea value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="比如：没什么胃口，想吃辣一点的……" rows={3} />
          <small>这段话暂时不会参与打分，AI 理解会在后续版本开放。</small>
        </label>
      </section>

      {chosen && (
        <div className="chosen-banner" role="status">
          <span>✓</span>
          <div><strong>好，今天吃这个</strong><p>{chosen.store.name} · {chosen.item.name}</p></div>
        </div>
      )}

      {error && <p className="form-message is-error recommendation-message" role="alert">{error}</p>}

      {sessionId ? (
        <section className="recommendation-results" aria-labelledby="recommendation-title">
          <div className="results-heading">
            <div><p className="section-kicker">这次推荐</p><h2 id="recommendation-title">挑一个顺眼的</h2></div>
            <button type="button" className="swap-button" onClick={() => void loadRecommendations(false)} disabled={loading}>换一批</button>
          </div>

          {loading ? (
            <div className="recommendation-empty" role="status">正在翻你的外卖库…</div>
          ) : recommendations.length === 0 ? (
            <div className="recommendation-empty"><p>{emptyMessage ?? '当前没有候选。'}</p><button type="button" className="secondary-button" onClick={() => void loadRecommendations(true)}>重新推荐</button></div>
          ) : (
            <div className="recommendation-list">
              {recommendations.map((candidate) => (
                <article className={`recommendation-card${chosenItemId === candidate.item.id ? ' is-chosen' : ''}`} key={candidate.item.id}>
                  <div className="recommendation-card-head">
                    <div><p>{candidate.store.name}</p><h3>{candidate.item.name}</h3></div>
                    <strong>{formatItemPrice(candidate.item)}</strong>
                  </div>
                  <p className="recommendation-meta">吃过 {candidate.orderCount} 次 · {formatLastEaten(candidate.lastOrderedAt)}</p>
                  <div className="reason-list">{candidate.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
                  <div className="recommendation-actions">
                    <button type="button" className="skip-button" onClick={() => void skip(candidate)} disabled={pendingItemId === candidate.item.id}>今天不想</button>
                    <button type="button" className="choose-button" onClick={() => void choose(candidate)} disabled={pendingItemId === candidate.item.id || chosenItemId === candidate.item.id}>{chosenItemId === candidate.item.id ? '就它了' : '就这个'}</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="recommend-area">
          <div className="bowl-mark" aria-hidden="true"><span>?</span></div>
          <p>只从你自己的外卖库里，挑 3～5 个能吃的主餐。</p>
          <button className="primary-button" type="button" onClick={() => void loadRecommendations(true)} disabled={loading}>
            <SparkIcon />
            {loading ? '正在挑…' : '给我推荐'}
          </button>
        </div>
      )}
    </section>
  )
}
