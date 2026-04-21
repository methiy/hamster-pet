import { invoke } from '@tauri-apps/api/core'
import { useWindowShake } from './useWindowShake'
import { estimateSpeechDurationMs } from '../components/speechDuration'

/** Matches Rust's WindowRect in activity.rs (serde default field casing). */
interface WindowRect {
  left: number
  top: number
  right: number
  bottom: number
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
  /**
   * Read the pet window's current physical position. Used to remember the
   * "home" spot so the pet can return there after delivering the reminder.
   * Optional: when omitted, the pet just stays at the target window.
   */
  getPetPosition?: () => Promise<[number, number]>
}

export interface AlertUserOptions {
  /** Sound name passed to playSound. Default 'notification'. */
  sound?: string
  /** Pet speed multiplier during the walk step. Default 3 (fast). */
  petSpeed?: number
  /**
   * After the bubble closes, walk the pet back to where it was before the
   * alert. Default true. Has no effect if `getPetPosition` dep is absent.
   */
  returnHome?: boolean
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

  // Fire-and-forget write to the in-app debug log.
  function dbg(line: string): void {
    // Keep it async; ignore failures (logging must never block the alert).
    invoke('append_debug_log', { line }).catch(() => {})
  }

  async function alertUserWithPet(
    text: string,
    opts: AlertUserOptions = {}
  ): Promise<void> {
    const sound = opts.sound ?? 'notification'
    const speedMul = opts.petSpeed ?? 3
    const returnHome = opts.returnHome ?? true

    deps.playSound(sound)

    // Remember where the pet was before we drag it off to the foreground
    // window. We do this as early as possible so subsequent animations
    // (shake, walk) can't accidentally overwrite our notion of "home".
    let home: [number, number] | null = null
    if (returnHome && deps.getPetPosition) {
      try {
        home = await deps.getPetPosition()
        dbg(`home: (${home[0]}, ${home[1]})`)
      } catch (e) {
        dbg(`getPetPosition threw: ${String(e)}`)
      }
    }

    let hwnd: number | null = null
    try {
      const info = await invoke<CaptureDebug>('capture_foreground_hwnd_debug')
      dbg(`capture: captured=${info.captured} fg_pid=${info.fg_pid} self_pid=${info.self_pid} reason=${info.reason} title="${(info.title || '').slice(0, 60)}"`)
      if (info.captured) {
        hwnd = info.hwnd
      }
    } catch (e) {
      dbg(`capture invoke threw: ${String(e)}`)
      hwnd = null
    }

    if (hwnd === null) {
      dbg('fallback: null hwnd, speech-only')
      // Foreground is our own pet window (or capture unavailable on this
      // platform). Don't shake our own window — just show the speech bubble.
      // No need to walk back either, since we never walked out.
      deps.showSpeech(text)
      return
    }

    dbg(`proceed: shake+walk hwnd=${hwnd}`)

    // Fire shake and walk in parallel so the pet starts moving while the
    // foreground window is still wobbling.
    const shakePromise = shakeWindowByHwnd(hwnd).catch((e) => {
      dbg(`shake rejected: ${String(e)}`)
    })

    let rect: WindowRect | null = null
    try {
      rect = await invoke<WindowRect | null>('get_hwnd_rect', { hwnd })
      dbg(`get_hwnd_rect -> ${rect ? `l=${rect.left} t=${rect.top} r=${rect.right} b=${rect.bottom}` : 'null'}`)
    } catch (e) {
      dbg(`get_hwnd_rect threw: ${String(e)}`)
      rect = null
    }

    if (rect) {
      const width = rect.right - rect.left
      const height = rect.bottom - rect.top
      const anchorX = rect.left + width / 2
      const anchorY = rect.top + height / 2
      dbg(`walkTo target: (${anchorX}, ${anchorY})`)
      try {
        await deps.walkTo([anchorX, anchorY], { speedMultiplier: speedMul })
        dbg('walkTo done')
      } catch (e) {
        dbg(`walkTo threw: ${String(e)}`)
      }
    } else {
      dbg('no rect, skipping walkTo')
    }

    await shakePromise
    deps.showSpeech(text)

    // Walk back home once the bubble has had time to be read. We mirror the
    // SpeechBubble's own duration formula (plus a small buffer so we don't
    // start walking the instant the bubble disappears).
    if (home) {
      const speechMs = estimateSpeechDurationMs(text)
      dbg(`schedule return home in ${speechMs + 300}ms`)
      await new Promise(r => setTimeout(r, speechMs + 300))
      try {
        await deps.walkTo(home, { speedMultiplier: speedMul })
        dbg('returned home')
      } catch (e) {
        dbg(`return walkTo threw: ${String(e)}`)
      }
    }
  }

  return { alertUserWithPet }
}
