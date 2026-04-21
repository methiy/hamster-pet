import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'

/**
 * Base shake offset sequence, designed for a base intensity of 14 pixels.
 * 15 steps that deflect in cardinal directions with decaying magnitude,
 * ending exactly at origin. At stepDuration=40ms the full shake takes
 * ~600ms — enough to read as a deliberate "hey, look here" shake rather
 * than a flicker.
 */
const BASE_OFFSETS: Array<[number, number]> = [
  [14, 0], [-14, 0], [0, 14], [0, -14],
  [10, 0], [-10, 0], [0, 10], [0, -10],
  [6, 0], [-6, 0], [0, 6], [0, -6],
  [3, 0], [-3, 0], [0, 0],
]

/** Matches Rust's WindowRect in activity.rs — serde emits the struct's
 * field names verbatim, so this is {left,top,right,bottom}, NOT
 * {x,y,width,height}. Historically this was typed wrong here; all reads
 * produced undefined, offsets collapsed to NaN, and set_hwnd_position
 * silently rejected at the invoke boundary.
 */
interface WindowRect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface WindowShakeOptions {
  /** Peak deflection in pixels. Default 14. Offsets scale as intensity/14. */
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
    const intensity = opts.intensity ?? 14
    const stepDuration = opts.stepDuration ?? 40
    const scale = intensity / 14

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
        const rect = await invoke<WindowRect | null>('get_hwnd_rect', { hwnd })
        if (!rect) return
        const origX = rect.left
        const origY = rect.top
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
