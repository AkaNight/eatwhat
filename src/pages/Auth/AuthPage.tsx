import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

type AuthMode = 'sign-in' | 'sign-up'

interface LocationState {
  from?: string
}

export function AuthPage() {
  const { configured, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const destination = (location.state as LocationState | null)?.from ?? '/'

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!configured || pending) return

    setPending(true)
    setError(null)
    setNotice(null)

    try {
      if (mode === 'sign-in') {
        await signIn(email, password)
        navigate(destination, { replace: true })
      } else {
        const result = await signUp(email, password)
        if (result.needsEmailConfirmation) {
          setNotice('注册成功。请打开确认邮件，确认后再回来登录。')
          setMode('sign-in')
          setPassword('')
        } else {
          navigate(destination, { replace: true })
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '操作失败，请稍后再试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="auth-brand" aria-hidden="true">食</div>
        <p className="eyebrow">今天吃啥</p>
        <h1>把选择留给自己吃过的</h1>
        <p>登录后，你的外卖库、记录和偏好会跟着账号走。</p>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-tabs" aria-label="登录方式">
          <button
            type="button"
            className={mode === 'sign-in' ? 'is-active' : ''}
            onClick={() => chooseMode('sign-in')}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'sign-up' ? 'is-active' : ''}
            onClick={() => chooseMode('sign-up')}
          >
            注册
          </button>
        </div>

        <h2 id="auth-title">{mode === 'sign-in' ? '欢迎回来' : '创建你的外卖库'}</h2>

        {!configured ? (
          <div className="config-notice" role="status">
            <strong>还差一步配置</strong>
            <p>请在项目的 <code>.env.local</code> 中填写 Supabase URL 和公开客户端 Key，然后刷新页面。</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                required
              />
            </label>
            <label>
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                placeholder={mode === 'sign-in' ? '输入密码' : '至少 6 位'}
                minLength={6}
                required
              />
            </label>

            {error && <p className="form-message is-error" role="alert">{error}</p>}
            {notice && <p className="form-message is-success" role="status">{notice}</p>}

            <button className="primary-button" type="submit" disabled={pending}>
              {pending ? '请稍候…' : mode === 'sign-in' ? '登录' : '注册'}
            </button>
          </form>
        )}
      </section>

      <p className="auth-footnote">你的数据只属于当前账号，不会进入公共店铺数据库。</p>
    </main>
  )
}
