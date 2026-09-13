import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../types/database'

export interface SupabaseConfig {
  url: string
  publicKey: string
}

export function hasSupabaseConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const publicKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim()

  return Boolean(url && publicKey)
}

export function readSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const publicKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim()

  if (!url || !publicKey) {
    throw new Error(
      'Supabase 尚未配置。请在 .env.local 中填写 VITE_SUPABASE_URL 和公开客户端 Key。',
    )
  }

  return { url, publicKey }
}

export function createSupabaseBrowserClient(
  config: SupabaseConfig = readSupabaseConfig(),
): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.publicKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

let browserClient: SupabaseClient<Database> | undefined

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  browserClient ??= createSupabaseBrowserClient()
  return browserClient
}
