import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getSupabaseBrowserClient,
  hasSupabaseConfig,
} from '../../services/data/supabase/client'

interface SignUpResult {
  needsEmailConfirmation: boolean
}

interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<SignUpResult>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(error: { message: string }): Error {
  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) return new Error('邮箱或密码不正确。')
  if (message.includes('email not confirmed')) return new Error('请先打开确认邮件，再回来登录。')
  if (message.includes('user already registered')) return new Error('这个邮箱已经注册，可以直接登录。')
  if (message.includes('password')) return new Error('密码不符合当前项目的安全要求。')
  if (message.includes('rate limit')) return new Error('操作太频繁，请稍后再试。')

  return new Error('登录服务暂时不可用，请稍后再试。')
}

export function AuthProvider({ children }: PropsWithChildren) {
  const configured = hasSupabaseConfig()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    const client = getSupabaseBrowserClient()
    let active = true

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setSession(null)
      } else {
        setSession(data.session)
      }
      setLoading(false)
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [configured])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw friendlyAuthError(error)
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await getSupabaseBrowserClient().auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) throw friendlyAuthError(error)
    return { needsEmailConfirmation: data.session === null }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await getSupabaseBrowserClient().auth.signOut()
    if (error) throw friendlyAuthError(error)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured,
    loading,
    session,
    user: session?.user ?? null,
    signIn,
    signUp,
    signOut,
  }), [configured, loading, session, signIn, signOut, signUp])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用。')
  return context
}
