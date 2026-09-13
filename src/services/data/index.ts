import type { DataService } from './contracts'
import { createSupabaseDataService } from './supabase/SupabaseDataService'
import { getSupabaseBrowserClient } from './supabase/client'
import { CachedDataService } from './cached/CachedDataService'

let service: DataService | undefined

export function getDataService(): DataService {
  if (!service) {
    const client = getSupabaseBrowserClient()
    service = new CachedDataService(createSupabaseDataService(client), client)
  }
  return service
}

export async function syncDataCache(): Promise<void> {
  const current = getDataService()
  if (current instanceof CachedDataService) await current.syncAll()
}

export type * from './contracts'
export { DataServiceError } from './errors'
