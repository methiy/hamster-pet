import { invoke } from '@tauri-apps/api/core'
import { useWindowShake } from './useWindowShake'

interface HwndRect {
  x: number
  y: number
  width: number
  height: number
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
 * On platforms where foreground-window capture is unavailable (non-Windows,
 * or the capture call returned false), falls back to shaking the pet's
 * own window and still shows the speech bubble.
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
    try {
      const captured = await invoke<boolean>('capture_foreground_hwnd')
      if (captured) {
        hwnd = await invoke<number | null>('get_captured_hwnd')
      }
    } catch {
      hwnd = null
    }

    if (hwnd === null) {
      await shakeWindowByHwnd(null)
      deps.showSpeech(text)
      return
    }

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
