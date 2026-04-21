import { describe, it, expect, vi } from 'vitest'
import { useMouseShakeDetector } from '../useMouseShakeDetector'

function mkEvent(x: number, y: number): MouseEvent {
  return { clientX: x, clientY: y } as unknown as MouseEvent
}

describe('useMouseShakeDetector', () => {
  it('does not trigger on straight-line movement', () => {
    const onShake = vi.fn()
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => 0,
    })
    // Linear motion: no direction reversals
    onMouseMove(mkEvent(0, 0))
    onMouseMove(mkEvent(50, 0))
    onMouseMove(mkEvent(100, 0))
    onMouseMove(mkEvent(150, 0))
    onMouseMove(mkEvent(200, 0))
    expect(onShake).not.toHaveBeenCalled()
  })

  it('triggers when reversals >= 4 and distance >= 300 within window', () => {
    const onShake = vi.fn()
    let t = 0
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => t,
    })
    // 5 reversals, 500 total px, all within 800ms
    const xs = [0, 100, 0, 100, 0, 100]
    for (const x of xs) {
      t += 100
      onMouseMove(mkEvent(x, 0))
    }
    expect(onShake).toHaveBeenCalledTimes(1)
  })

  it('does not re-trigger during cooldown', () => {
    const onShake = vi.fn()
    let t = 0
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => t,
      cooldownMs: 5000,
    })
    const shake = () => {
      const xs = [0, 100, 0, 100, 0, 100]
      for (const x of xs) {
        t += 100
        onMouseMove(mkEvent(x, 0))
      }
    }
    shake()
    expect(onShake).toHaveBeenCalledTimes(1)
    // Second shake within cooldown
    t += 1000
    shake()
    expect(onShake).toHaveBeenCalledTimes(1)
    // After cooldown
    t += 6000
    shake()
    expect(onShake).toHaveBeenCalledTimes(2)
  })

  it('prunes old events outside the window', () => {
    const onShake = vi.fn()
    let t = 0
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => t,
      windowMs: 800,
    })
    // First 3 reversals very old
    onMouseMove(mkEvent(0, 0)); t += 100
    onMouseMove(mkEvent(100, 0)); t += 100
    onMouseMove(mkEvent(0, 0)); t += 1500 // way after window
    // After pruning, only the next events count
    onMouseMove(mkEvent(100, 0)); t += 100
    onMouseMove(mkEvent(0, 0)); t += 100
    expect(onShake).not.toHaveBeenCalled()
  })
})
