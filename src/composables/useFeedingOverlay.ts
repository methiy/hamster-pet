import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { PhysicalPosition, PhysicalSize, currentMonitor } from '@tauri-apps/api/window'
import { listen, emit } from '@tauri-apps/api/event'

/**
 * "Feeding mode" orchestration — called from the pet window.
 *
 * Why a separate, fullscreen, transparent webview window?
 *   The pet window is only 150×170 px. The whole point of this feature
 *   is that the user drops a snack *anywhere* on the screen. We can't
 *   capture clicks outside our own window from JS, so we need a second
 *   window that covers the monitor, briefly accepts a single click,
 *   then turns click-through again so it doesn't steal the user's
 *   normal input.
 *
 * Usage from the pet window:
 *   const feeding = useFeedingOverlay()
 *   feeding.onSnackDropped((ev) => pet.walkToAndEat(ev.physX, ev.physY))
 *   feeding.enter() // called when user presses Ctrl+Shift+E
 */

export interface SnackDroppedEvent {
  id: number
  /** Physical (monitor-coordinate) pixel location where the snack lands. */
  physX: number
  physY: number
  emoji: string
}

const OVERLAY_LABEL = 'feeding-overlay'

export function useFeedingOverlay() {
  async function ensureOverlayWindow(): Promise<WebviewWindow | null> {
    // Reuse the window across invocations — creating a webview is
    // expensive (100s of ms) and we want the mode to feel instant.
    const existing = await WebviewWindow.getByLabel(OVERLAY_LABEL)
    if (existing) return existing

    const mon = await currentMonitor()
    if (!mon) return null

    // Cover the entire monitor. We use physical position/size so the
    // window covers pixel-for-pixel — fullscreen: true on Tauri
    // sometimes activates exclusive fullscreen, which we do NOT want
    // (it'd hide the taskbar and take focus). Explicit size + position
    // avoids that.
    const win = new WebviewWindow(OVERLAY_LABEL, {
      url: 'feeding.html',
      // Fullscreen-by-geometry, not by OS fullscreen mode:
      width: mon.size.width,
      height: mon.size.height,
      x: mon.position.x,
      y: mon.position.y,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focus: false, // don't steal focus from the user's current app
      visible: false, // we'll show() it explicitly below
      shadow: false,
      title: 'Snack Overlay',
    })

    // Resolve when created successfully.
    return new Promise<WebviewWindow | null>((resolve) => {
      win.once('tauri://created', () => resolve(win))
      win.once('tauri://error', () => resolve(null))
    })
  }

  async function enter(): Promise<void> {
    const win = await ensureOverlayWindow()
    if (!win) return
    // Recompute monitor each time in case user moved the taskbar /
    // changed resolution / unplugged a monitor since last enter.
    try {
      const mon = await currentMonitor()
      if (mon) {
        await win.setPosition(new PhysicalPosition(mon.position.x, mon.position.y))
        await win.setSize(new PhysicalSize(mon.size.width, mon.size.height))
      }
    } catch { /* ignore */ }

    // Reset per-enter state: the overlay page may have toggled these
    // off during its last run. We also kick the overlay's internal
    // waitingClick flag via the feeding:reset event — after a snack
    // finishes the overlay intentionally does NOT re-arm itself
    // (otherwise it would silently keep capturing clicks); we do it
    // from here instead, as close to show() as possible.
    try { await win.setAlwaysOnTop(true) } catch { /* ignore */ }
    try { await win.setIgnoreCursorEvents(false) } catch { /* ignore */ }
    try { await emit('feeding:reset', null) } catch { /* ignore */ }
    try { await win.show() } catch { /* ignore */ }
  }

  async function onSnackDropped(
    handler: (ev: SnackDroppedEvent) => void,
  ): Promise<() => void> {
    return listen<SnackDroppedEvent>('snack-dropped', (event) => {
      handler(event.payload)
    })
  }

  return { enter, onSnackDropped }
}
