import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor } from '@tauri-apps/api/window'
import { PhysicalPosition } from '@tauri-apps/api/dpi'

type Direction = 'left' | 'right' | 'top' | 'bottom'

/** 滑入动画时长（毫秒） */
const SLIDE_DURATION_MS = 900
/** 默认记事本窗口大小（逻辑像素） */
const WIN_W = 420
const WIN_H = 280

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function pickDir(): Direction {
  const dirs: Direction[] = ['left', 'right', 'top', 'bottom']
  return dirs[Math.floor(Math.random() * dirs.length)]
}

/**
 * Shows a fake-notepad reminder window that slides in from off-screen.
 *
 * Flow:
 *  1. Persist text to `<appDataDir>/reminder.txt` (via Rust `write_reminder_file`)
 *     so it survives between runs and the user doesn't need to clean desktop files.
 *  2. Create a borderless Tauri WebviewWindow rendering `reminder.html` at an
 *     off-screen position (random edge of the current monitor).
 *  3. Animate `setPosition` frame-by-frame with ease-out-cubic for 900ms until
 *     centered on the monitor.
 *  4. The window stays there until the user clicks its ✕ button or closes it
 *     via the OS.
 *
 * Returns true on success, false on any failure (so the caller can fall back
 * to the original shake-window behavior).
 */
export function useNotepadSlide() {
  let activeLabel = 0

  async function slideNotepadReminder(text: string): Promise<boolean> {
    // 1. Persist the file (fire-and-forget; failure here shouldn't block the UI)
    invoke('write_reminder_file', { text }).catch(() => { /* ignore */ })

    let win: WebviewWindow | null = null
    try {
      const monitor = await currentMonitor()
      if (!monitor) return false
      const scale = monitor.scaleFactor ?? 1.0
      const mPos = monitor.position // physical px
      const mSize = monitor.size    // physical px

      const physW = Math.round(WIN_W * scale)
      const physH = Math.round(WIN_H * scale)

      const centerX = Math.round(mPos.x + (mSize.width - physW) / 2)
      const centerY = Math.round(mPos.y + (mSize.height - physH) / 2)

      const dir = pickDir()
      let startX = centerX
      let startY = centerY
      switch (dir) {
        case 'left':
          startX = mPos.x - physW - 20
          startY = centerY
          break
        case 'right':
          startX = mPos.x + mSize.width + 20
          startY = centerY
          break
        case 'top':
          startX = centerX
          startY = mPos.y - physH - 20
          break
        case 'bottom':
          startX = centerX
          startY = mPos.y + mSize.height + 20
          break
      }

      // Unique label per invocation so concurrent reminders don't clash.
      activeLabel++
      const label = `reminder-${Date.now()}-${activeLabel}`

      const url = `reminder.html?text=${encodeURIComponent(text)}`
      win = new WebviewWindow(label, {
        url,
        title: '记事本 - 提醒',
        width: WIN_W,
        height: WIN_H,
        decorations: false,
        transparent: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: false,
        focus: true,
        visible: false, // show after we position it off-screen
        x: startX,
        y: startY,
      })

      await new Promise<void>((resolve, reject) => {
        win!.once('tauri://created', () => resolve())
        win!.once('tauri://error', (e) => reject(e))
      })

      // Force off-screen position (some platforms ignore creation x/y)
      await win.setPosition(new PhysicalPosition(startX, startY))
      await win.show()

      await new Promise<void>((resolve) => {
        const t0 = performance.now()
        function step(now: number) {
          const p = Math.min((now - t0) / SLIDE_DURATION_MS, 1)
          const e = easeOutCubic(p)
          const x = Math.round(startX + (centerX - startX) * e)
          const y = Math.round(startY + (centerY - startY) * e)
          win!.setPosition(new PhysicalPosition(x, y)).catch(() => {})
          if (p < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })

      return true
    } catch {
      try { await win?.close() } catch { /* ignore */ }
      return false
    }
  }

  return { slideNotepadReminder }
}
