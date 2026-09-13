import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { configured, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <div className="loading-mark">食</div>
        <p>正在恢复登录状态…</p>
      </div>
    )
  }

  if (!configured || !user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <div className="loading-mark">食</div>
        <p>正在恢复登录状态…</p>
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />
  return <Outlet />
}
