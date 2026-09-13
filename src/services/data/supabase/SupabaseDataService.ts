import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SupabaseCravingRepository,
  SupabaseItemRepository,
  SupabaseOrderRepository,
  SupabasePreferenceRepository,
  SupabaseRecommendationEventRepository,
  SupabaseStoreRepository,
} from '../../../repositories/supabase/SupabaseRepositories'
import type { Database } from '../../../types/database'
import type { DataService } from '../contracts'
import { getSupabaseBrowserClient } from './client'

export function createSupabaseDataService(
  client: SupabaseClient<Database> = getSupabaseBrowserClient(),
): DataService {
  return {
    stores: new SupabaseStoreRepository(client),
    items: new SupabaseItemRepository(client),
    orders: new SupabaseOrderRepository(client),
    cravings: new SupabaseCravingRepository(client),
    preferences: new SupabasePreferenceRepository(client),
    recommendationEvents: new SupabaseRecommendationEventRepository(client),
  }
}
