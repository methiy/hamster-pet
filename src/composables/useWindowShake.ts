import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'

/**
 * Base shake offset sequence, designed for a base intensity of 6 pixels.
 * 11 steps that deflect in cardinal directions with decaying magnitude,
 * ending exactly at origin.
 */
const BASE_OFFSETS: Array<[number, number]> = [
  [6, 0], [-6, 0], [0, 6], [0, -6],
  [4, 0], [-4, 0], [0, 4], [0, -4],
  [2, 0], [-2, 0], [0, 0],
]

interface HwndRect {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowShakeOptions {
  /** Peak deflection in pixels. Default 6. Offsets scale as intensity/6. */
  intensity?: number
  /** Milliseconds between offset steps. Default 40. */
  stepDuration?: number
}

/**
 * Wobble a window by nudging its position through a fixed cardinal offset
 * sequence. `hwnd = null` shakes the pet's own window (cross-platform via
 * Tauri's `getCurrentWindow().setPosition`). `hwnd = <number>` shakes an
 * arbitrary Windows HWND via the `set_hwnd_position` Rust command — call
 * `capture_foreground_hwnd` + `get_hwnd_rect` to obtain one.
 */
export function useWindowShake() {
  async function shakeWindowByHwnd(
    hwnd: number | null,
    opts: WindowShakeOptions = {}
  ): Promise<void> {
    const intensity = opts.intensity ?? 6
    const stepDuration = opts.stepDuration ?? 40
    const scale = intensity / 6

    try {
      if (hwnd === null) {
        const win = getCurrentWindow()
        const pos = await win.outerPosition()
        const origX = pos.x
        const origY = pos.y
        for (const [dx, dy] of BASE_OFFSETS) {
          await win.setPosition(new PhysicalPosition(
            origX + Math.round(dx * scale),
            origY + Math.round(dy * scale),
          ))
          if (stepDuration > 0) await new Promise(r => setTimeout(r, stepDuration))
        }
      } else {
        const rect = await invoke<HwndRect | null>('get_hwnd_rect', { hwnd })
        if (!rect) return
        const origX = rect.x
        const origY = rect.y
        for (const [dx, dy] of BASE_OFFSETS) {
          await invoke('set_hwnd_position', {
            hwnd,
            x: origX + Math.round(dx * scale),
            y: origY + Math.round(dy * scale),
          })
          if (stepDuration > 0) await new Promise(r => setTimeout(r, stepDuration))
        }
      }
    } catch {
      // Not in Tauri, or the target window disappeared mid-shake; silent.
    }
  }

  return { shakeWindowByHwnd }
}
