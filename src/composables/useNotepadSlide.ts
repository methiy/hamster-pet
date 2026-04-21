import { invoke } from '@tauri-apps/api/core'
import { currentMonitor } from '@tauri-apps/api/window'

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

type Direction = 'left' | 'right' | 'top' | 'bottom'

const SLIDE_DURATION_MS = 800

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function pickDir(): Direction {
  const dirs: Direction[] = ['left', 'right', 'top', 'bottom']
  return dirs[Math.floor(Math.random() * dirs.length)]
}

/**
 * Slides a newly-opened Notepad reminder window from off-screen to screen center.
 *
 * Flow: create desktop .txt via Rust command → open notepad → get its HWND →
 * measure its size → animate it from a random off-screen edge to the monitor
 * center with ease-out-cubic over 800ms.
 *
 * Returns true on success. On any failure (non-Windows, hwnd lookup failed,
 * SetWindowPos failed) returns false so the caller can fall back to the
 * original shake-window behavior.
 */
export function useNotepadSlide() {
  async function slideNotepadReminder(text: string): Promise<boolean> {
    let hwnd: number
    try {
      hwnd = await invoke<number>('create_reminder_notepad', { text })
    } catch {
      return false
    }
    if (!hwnd) return false

    try {
      const monitor = await currentMonitor()
      if (!monitor) return false
      const mPos = monitor.position // physical px
      const mSize = monitor.size    // physical px

      // Wait a moment for notepad to finish sizing its window before we read it
      await new Promise((r) => setTimeout(r, 120))
      const rect = await invoke<Rect | null>('get_hwnd_rect', { hwnd })
      if (!rect) return false
      const w = rect.right - rect.left
      const h = rect.bottom - rect.top

      const centerX = Math.round(mPos.x + (mSize.width - w) / 2)
      const centerY = Math.round(mPos.y + (mSize.height - h) / 2)

      const dir = pickDir()
      let startX = centerX
      let startY = centerY
      switch (dir) {
        case 'left':
          startX = mPos.x - w - 20
          startY = centerY
          break
        case 'right':
          startX = mPos.x + mSize.width + 20
          startY = centerY
          break
        case 'top':
          startX = centerX
          startY = mPos.y - h - 20
          break
        case 'bottom':
          startX = centerX
          startY = mPos.y + mSize.height + 20
          break
      }

      // Place at off-screen start, then animate
      await invoke('set_hwnd_position', { hwnd, x: startX, y: startY })

      await new Promise<void>((resolve) => {
        const t0 = performance.now()
        function step(now: number) {
          const p = Math.min((now - t0) / SLIDE_DURATION_MS, 1)
          const e = easeOutCubic(p)
          const x = Math.round(startX + (centerX - startX) * e)
          const y = Math.round(startY + (centerY - startY) * e)
          invoke('set_hwnd_position', { hwnd, x, y }).catch(() => {})
          if (p < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })

      return true
    } catch {
      return false
    }
  }

  return { slideNotepadReminder }
}
