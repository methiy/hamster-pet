// src/composables/useAppMode.ts
import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type AppMode = 'normal' | 'work'

const mode = ref<AppMode>('normal')

let unlisten: UnlistenFn | null = null

export function useAppMode() {

  async function setMode(newMode: AppMode) {
    mode.value = newMode
    try {
      const win = getCurrentWindow()
      if (newMode === 'work') {
        await win.setSize(new LogicalSize(500, 450))
        await win.setAlwaysOnTop(false)
        await win.setSkipTaskbar(false)
        await win.setResizable(true)
      } else {
        await win.setSize(new LogicalSize(250, 300))
        await win.setAlwaysOnTop(true)
        await win.setSkipTaskbar(true)
        await win.setResizable(false)
      }
    } catch {
      // Not in Tauri environment
    }
  }

  async function initModeListener() {
    try {
      unlisten = await listen<string>('mode-change', (event) => {
        const payload = event.payload as AppMode
        if (payload === 'normal' || payload === 'work') {
          setMode(payload)
        }
      })
    } catch {
      // Not in Tauri environment
    }
  }

  function destroyModeListener() {
    if (unlisten) {
      unlisten()
      unlisten = null
    }
  }

  function toggleMode() {
    setMode(mode.value === 'normal' ? 'work' : 'normal')
  }

  return {
    mode,
    setMode,
    initModeListener,
    destroyModeListener,
    toggleMode,
  }
}
