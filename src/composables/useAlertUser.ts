import { invoke } from '@tauri-apps/api/core'
import { useWindowShake } from './useWindowShake'

interface HwndRect {
  x: number
  y: number
  width: number
  height: number
}

interface CaptureDebug {
  captured: boolean
  hwnd: number | null
  fg_pid: number
  self_pid: number
  title: string
  reason: string
}

export interface AlertUserDeps {
  /** Plays a sound effect by name. Pass through from the app's audio layer. */
  playSound: (name: string) => void
  /** Walks the pet to a target position (physical px). speedMultiplier applied. */
  walkTo: (
    target: [number, number],
    opts: { speedMultiplier?: number }
  ) => Promise<void>
  /** Shows the pet's speech bubble with the given text. */
  showSpeech: (text: string) => void
}

export interface AlertUserOptions {
  /** Sound name passed to playSound. Default 'notification'. */
  sound?: string
  /** Pet speed multiplier during the walk step. Default 3 (fast). */
  petSpeed?: number
}

/**
 * High-intensity "hey look here" alert. Plays a sound, shakes the
 * foreground window, runs the pet there, and shows a speech bubble.
 *
 * On platforms where foreground-window capture is unavailable (non-Windows),
 * or when the foreground window is the pet itself (`capture_foreground_hwnd`
 * refuses to capture our own process), falls back to only showing the speech
 * bubble — we deliberately don't shake our own window, because the user
 * wouldn't see it (they're looking at another app).
 */
export function useAlertUser(deps: AlertUserDeps) {
  const { shakeWindowByHwnd } = useWindowShake()

  async function alertUserWithPet(
    text: string,
    opts: AlertUserOptions = {}
  ): Promise<void> {
    const sound = opts.sound ?? 'notification'
    const speedMul = opts.petSpeed ?? 3

    deps.playSound(sound)

    let hwnd: number | null = null
    let debugSuffix = ''
    try {
      const dbg = await invoke<CaptureDebug>('capture_foreground_hwnd_debug')
      console.log('[alertUser] capture debug ->', dbg)
      debugSuffix = ` [dbg: captured=${dbg.captured} fg_pid=${dbg.fg_pid} self_pid=${dbg.self_pid} title="${(dbg.title || '').slice(0, 30)}" reason=${dbg.reason}]`
      if (dbg.captured) {
        hwnd = dbg.hwnd
        console.log('[alertUser] captured hwnd ->', hwnd)
      }
    } catch (e) {
      console.warn('[alertUser] capture failed:', e)
      debugSuffix = ` [dbg: invoke threw ${String(e)}]`
      hwnd = null
    }

    if (hwnd === null) {
      console.log('[alertUser] fallback: null hwnd, speech-only')
      // Foreground is our own pet window (or capture unavailable on this
      // platform). Don't shake our own window — just show the speech bubble.
      deps.showSpeech(text + debugSuffix)
      return
    }

    console.log('[alertUser] proceeding with shake+walk for hwnd', hwnd)

    // Fire shake and walk in parallel so the pet starts moving while the
    // foreground window is still wobbling.
    // Attach a no-op .catch so a rejection during the in-flight shake doesn't
    // fire unhandledRejection before we await it at the bottom of this function.
    const shakePromise = shakeWindowByHwnd(hwnd).catch(() => {})

    let rect: HwndRect | null = null
    try {
      rect = await invoke<HwndRect | null>('get_hwnd_rect', { hwnd })
    } catch { rect = null }

    if (rect) {
      const anchorX = rect.x + rect.width / 2
      const anchorY = rect.y
      await deps.walkTo([anchorX, anchorY], { speedMultiplier: speedMul })
    }

    await shakePromise
    deps.showSpeech(text)
  }

  return { alertUserWithPet }
}
