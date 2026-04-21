import { describe, it, expect, vi, beforeEach } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}))

// Mock useWindowShake so we can assert how it's called
const shakeMock = vi.fn(async () => {})
vi.mock('../useWindowShake', () => ({
  useWindowShake: () => ({ shakeWindowByHwnd: shakeMock }),
}))

import { useAlertUser } from '../useAlertUser'

describe('useAlertUser', () => {
  let playSound: ReturnType<typeof vi.fn>
  let walkTo: ReturnType<typeof vi.fn>
  let showSpeech: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invokeMock.mockReset()
    shakeMock.mockClear()
    playSound = vi.fn()
    walkTo = vi.fn(async () => {})
    showSpeech = vi.fn()
  })

  it('fallback path: skips shake and only shows speech when capture reports not captured', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd_debug') {
        return Promise.resolve({
          captured: false, hwnd: null, fg_pid: 1111, self_pid: 2222,
          title: 'somewindow', reason: 'foreground is our own process',
        })
      }
      if (cmd === 'append_debug_log') return Promise.resolve('/tmp/log')
      return Promise.resolve(null)
    })

    const { alertUserWithPet } = useAlertUser({ playSound: playSound as any, walkTo: walkTo as any, showSpeech: showSpeech as any })
    await alertUserWithPet('hello')

    expect(playSound).toHaveBeenCalledWith('notification')
    expect(shakeMock).not.toHaveBeenCalled()
    expect(walkTo).not.toHaveBeenCalled()
    expect(showSpeech).toHaveBeenCalledWith('hello')
  })

  it('happy path: captures hwnd, shakes it, walks pet to window center, shows speech', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd_debug') {
        return Promise.resolve({
          captured: true, hwnd: 99999, fg_pid: 3333, self_pid: 2222,
          title: 'Visual Studio Code', reason: 'ok',
        })
      }
      if (cmd === 'get_hwnd_rect') {
        // Rust WindowRect: { left, top, right, bottom }. Window is 800x600 at (200,300).
        return Promise.resolve({ left: 200, top: 300, right: 1000, bottom: 900 })
      }
      if (cmd === 'append_debug_log') return Promise.resolve('/tmp/log')
      return Promise.resolve(null)
    })

    const { alertUserWithPet } = useAlertUser({ playSound: playSound as any, walkTo: walkTo as any, showSpeech: showSpeech as any })
    await alertUserWithPet('reminder text')

    expect(playSound).toHaveBeenCalledWith('notification')
    expect(shakeMock).toHaveBeenCalledWith(99999)
    expect(walkTo).toHaveBeenCalledTimes(1)
    expect(walkTo.mock.calls[0][1]).toEqual({ speedMultiplier: 3 })
    const [x, y] = walkTo.mock.calls[0][0]
    // Window center: left + width/2, top + height/2.
    expect(x).toBe(200 + 800 / 2)
    expect(y).toBe(300 + 600 / 2)
    expect(showSpeech).toHaveBeenCalledWith('reminder text')
  })

  it('accepts custom sound', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd_debug') {
        return Promise.resolve({ captured: false, hwnd: null, fg_pid: 0, self_pid: 0, title: '', reason: 'x' })
      }
      return Promise.resolve(null)
    })
    const { alertUserWithPet } = useAlertUser({ playSound: playSound as any, walkTo: walkTo as any, showSpeech: showSpeech as any })
    await alertUserWithPet('x', { sound: 'summon' })
    expect(playSound).toHaveBeenCalledWith('summon')
  })
})
