import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

interface LocationState { from?: string }

export function AuthPage() {
  const { configured, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const destination = (location.state as LocationState | null)?.from ?? '/app'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!configured || pending) return
    setPending(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate(destination, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '操作失败，请稍后再试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Link className="auth-brand" aria-label="返回展示页" to="/">食</Link>
        <p className="eyebrow">站点主人入口</p>
        <h1>欢迎回来</h1>
        <p>公开页面只有演示内容。登录后才会读取你自己的外卖记录。</p>
      </section>
      <section className="auth-card" aria-labelledby="auth-title">
        <h2 id="auth-title">登录我的应用</h2>
        {!configured ? (
          <div className="config-notice" role="status"><strong>还差一步配置</strong><p>请在项目的 <code>.env.local</code> 中填写 Supabase URL 和公开客户端 Key，然后刷新页面。</p></div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" required /></label>
            <label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="输入密码" minLength={6} required /></label>
            {error && <p className="form-message is-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={pending}>{pending ? '请稍候…' : '登录'}</button>
          </form>
        )}
      </section>
      <p className="auth-footnote"><Link to="/">查看公开展示</Link> · <Link to="/deploy">自己部署一份</Link></p>
    </main>
  )
}