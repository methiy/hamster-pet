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

  it('fallback path: skips shake and only shows speech when capture_foreground_hwnd returns false', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd') return Promise.resolve(false)
      return Promise.resolve(null)
    })

    const { alertUserWithPet } = useAlertUser({ playSound: playSound as any, walkTo: walkTo as any, showSpeech: showSpeech as any })
    await alertUserWithPet('hello')

    expect(playSound).toHaveBeenCalledWith('notification')
    expect(shakeMock).not.toHaveBeenCalled()
    expect(walkTo).not.toHaveBeenCalled()
    expect(showSpeech).toHaveBeenCalledWith('hello')
  })

  it('happy path: captures hwnd, shakes it, walks pet fast, shows speech', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd') return Promise.resolve(true)
      if (cmd === 'get_captured_hwnd') return Promise.resolve(99999)
      if (cmd === 'get_hwnd_rect') return Promise.resolve({ x: 200, y: 300, width: 800, height: 600 })
      return Promise.resolve(null)
    })

    const { alertUserWithPet } = useAlertUser({ playSound: playSound as any, walkTo: walkTo as any, showSpeech: showSpeech as any })
    await alertUserWithPet('reminder text')

    expect(playSound).toHaveBeenCalledWith('notification')
    expect(shakeMock).toHaveBeenCalledWith(99999)
    expect(walkTo).toHaveBeenCalledTimes(1)
    expect(walkTo.mock.calls[0][1]).toEqual({ speedMultiplier: 3 })
    const [x, y] = walkTo.mock.calls[0][0]
    expect(x).toBe(200 + 800 / 2)
    expect(y).toBe(300)
    expect(showSpeech).toHaveBeenCalledWith('reminder text')
  })

  it('accepts custom sound', async () => {
    invokeMock.mockImplementation(() => Promise.resolve(false))
    const { alertUserWithPet } = useAlertUser({ playSound: playSound as any, walkTo: walkTo as any, showSpeech: showSpeech as any })
    await alertUserWithPet('x', { sound: 'summon' })
    expect(playSound).toHaveBeenCalledWith('summon')
  })
})
