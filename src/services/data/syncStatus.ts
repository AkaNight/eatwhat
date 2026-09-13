import { useSyncExternalStore } from 'react'

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncSnapshot {
  state: SyncState
  lastSyncedAt: string | null
}

let snapshot: SyncSnapshot = {
  state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
  lastSyncedAt: null,
}

const listeners = new Set<() => void>()

export function setSyncState(state: SyncState) {
  snapshot = {
    state,
    lastSyncedAt: state === 'synced' ? new Date().toISOString() : snapshot.lastSyncedAt,
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export function useSyncStatus(): SyncSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
