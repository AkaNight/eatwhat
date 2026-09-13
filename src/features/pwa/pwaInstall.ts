import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let promptEvent: InstallPromptEvent | null = null
let installed = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    promptEvent = event as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    promptEvent = null
    emit()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return `${installed}:${Boolean(promptEvent)}`
}

export function usePwaInstall() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    installed,
    available: Boolean(promptEvent),
    async install() {
      if (!promptEvent) return false
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') promptEvent = null
      emit()
      return choice.outcome === 'accepted'
    },
  }
}
