import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Tauri modules before importing the composable
const invokeMock = vi.fn()
const setPositionMock = vi.fn()
const outerPositionMock = vi.fn(async () => ({ x: 100, y: 200 }))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}))

vi.mock('@tauri-apps/api/window', () => ({
  PhysicalPosition: class {
    constructor(public x: number, public y: number) {}
  },
  getCurrentWindow: () => ({
    setPosition: setPositionMock,
    outerPosition: outerPositionMock,
  }),
}))

import { useWindowShake } from '../useWindowShake'

describe('useWindowShake', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    setPositionMock.mockReset()
    outerPositionMock.mockClear()
    invokeMock.mockResolvedValue(null)
    setPositionMock.mockResolvedValue(undefined)
  })

  it('shakes a specific hwnd via set_hwnd_position when hwnd is provided', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      // Match Rust's WindowRect serialization.
      if (cmd === 'get_hwnd_rect') return Promise.resolve({ left: 500, top: 600, right: 900, bottom: 900 })
      return Promise.resolve(null)
    })

    const { shakeWindowByHwnd } = useWindowShake()
    await shakeWindowByHwnd(12345, { stepDuration: 0 })

    const setPosCalls = invokeMock.mock.calls.filter((c: any[]) => c[0] === 'set_hwnd_position')
    expect(setPosCalls.length).toBe(11)
    expect(setPosCalls[0][1]).toEqual({ hwnd: 12345, x: 506, y: 600 })
    expect(setPosCalls[10][1]).toEqual({ hwnd: 12345, x: 500, y: 600 })
  })

  it('shakes the pet window when hwnd is null', async () => {
    const { shakeWindowByHwnd } = useWindowShake()
    await shakeWindowByHwnd(null, { stepDuration: 0 })

    expect(setPositionMock).toHaveBeenCalledTimes(11)
    const setHwndCalls = invokeMock.mock.calls.filter((c: any[]) => c[0] === 'set_hwnd_position')
    expect(setHwndCalls.length).toBe(0)
  })

  it('scales offsets by intensity parameter', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_hwnd_rect') return Promise.resolve({ left: 0, top: 0, right: 100, bottom: 100 })
      return Promise.resolve(null)
    })

    const { shakeWindowByHwnd } = useWindowShake()
    await shakeWindowByHwnd(9999, { stepDuration: 0, intensity: 12 })

    const setPosCalls = invokeMock.mock.calls.filter((c: any[]) => c[0] === 'set_hwnd_position')
    expect(setPosCalls[0][1]).toEqual({ hwnd: 9999, x: 12, y: 0 })
  })
})
