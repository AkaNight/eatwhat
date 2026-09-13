import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAuth } from '../auth/AuthContext'
import { syncDataCache } from '../../services/data'
import { setSyncState } from '../../services/data/syncStatus'

export function PwaRuntime() {
  const { user } = useAuth()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    function handleOffline() {
      setSyncState('offline')
    }

    function handleOnline() {
      if (!user) {
        setSyncState('idle')
        return
      }
      void syncDataCache().catch(() => undefined)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [user])

  if (!offlineReady && !needRefresh) return null

  return (
    <aside className="pwa-toast" role="status">
      <div>
        <strong>{needRefresh ? '有新版本可用' : '离线也能查看啦'}</strong>
        <p>{needRefresh ? '刷新后就会使用最新版本。' : '常用数据已经保存到这台设备。'}</p>
      </div>
      <div className="pwa-toast-actions">
        {needRefresh && <button type="button" onClick={() => void updateServiceWorker(true)}>更新</button>}
        <button type="button" className="dismiss" onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}>知道了</button>
      </div>
    </aside>
  )
}
