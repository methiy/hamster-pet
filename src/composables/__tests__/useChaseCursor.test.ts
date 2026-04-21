import { describe, it, expect } from 'vitest'
import { evaluateCatch, shouldTriggerPrank, type DistanceSample } from '../useChaseCursor'

describe('evaluateCatch', () => {
  it('returns true when last 500ms distances all < threshold', () => {
    const samples: DistanceSample[] = [
      { t: 0,    dist: 200 },
      { t: 4500, dist: 70 },
      { t: 4700, dist: 60 },
      { t: 4900, dist: 50 },
      { t: 5000, dist: 40 },
    ]
    expect(evaluateCatch(samples, 5000, { threshold: 80, holdMs: 500 })).toBe(true)
  })

  it('returns false when last sample within threshold but window not filled', () => {
    const samples: DistanceSample[] = [
      { t: 0,    dist: 200 },
      { t: 4900, dist: 70 },
      { t: 5000, dist: 60 },
    ]
    expect(evaluateCatch(samples, 5000, { threshold: 80, holdMs: 500 })).toBe(false)
  })

  it('returns false when any sample in the hold window exceeds threshold', () => {
    const samples: DistanceSample[] = [
      { t: 4500, dist: 70 },
      { t: 4700, dist: 150 }, // too far in window
      { t: 4900, dist: 50 },
      { t: 5000, dist: 40 },
    ]
    expect(evaluateCatch(samples, 5000, { threshold: 80, holdMs: 500 })).toBe(false)
  })
})

describe('shouldTriggerPrank', () => {
  it('triggers when random < prankChance', () => {
    expect(shouldTriggerPrank(0.1, 0.2)).toBe(true)
  })
  it('does not trigger when random >= prankChance', () => {
    expect(shouldTriggerPrank(0.5, 0.2)).toBe(false)
    expect(shouldTriggerPrank(0.2, 0.2)).toBe(false)
  })
})
