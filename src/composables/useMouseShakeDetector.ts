interface ShakeEvent {
  x: number
  y: number
  t: number
}

export interface DetectorOptions {
  /** 统计窗口毫秒，默认 800 */
  windowMs?: number
  /** 最少方向翻转次数，默认 4 */
  minReversals?: number
  /** 最小累计像素距离，默认 300 */
  minDistance?: number
  /** 触发后冷却毫秒，默认 5000 */
  cooldownMs?: number
  /** 时间源，测试用 */
  now?: () => number
}

/**
 * Detects a "shake" mouse gesture: many quick direction reversals over a short distance.
 *
 * Algorithm: maintain a sliding window of recent mouse events (default 800ms). On each
 * event, count how many times the cursor's direction reversed on either axis (comparing
 * sign of dx/dy against the previously observed nonzero sign) and sum the euclidean
 * distance between consecutive events. When both thresholds are met (default: ≥4
 * reversals AND ≥300px), fire `onShake` exactly once, then enter a cooldown (default
 * 5000ms) during which further events are tracked for pruning but no new trigger fires.
 *
 * The time source can be injected via `opts.now` for deterministic testing.
 *
 * Used by the cursor-chase feature: when the user shakes the mouse on top of the pet,
 * the pet leaps into a chase animation.
 */
export function useMouseShakeDetector(
  onShake: () => void,
  opts: DetectorOptions = {},
) {
  const windowMs = opts.windowMs ?? 800
  const minReversals = opts.minReversals ?? 4
  const minDistance = opts.minDistance ?? 300
  const cooldownMs = opts.cooldownMs ?? 5000
  const now = opts.now ?? (() => performance.now())

  const events: ShakeEvent[] = []
  let lastTriggerAt = -Infinity

  function onMouseMove(e: MouseEvent) {
    const t = now()
    events.push({ x: e.clientX, y: e.clientY, t })

    // Prune events outside window
    const cutoff = t - windowMs
    while (events.length > 0 && events[0].t < cutoff) {
      events.shift()
    }

    // Cooldown check
    if (t - lastTriggerAt < cooldownMs) return

    if (events.length < 3) return

    // Compute reversals + distance
    let reversals = 0
    let distance = 0
    let prevDirX = 0
    let prevDirY = 0
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x
      const dy = events[i].y - events[i - 1].y
      distance += Math.sqrt(dx * dx + dy * dy)
      const dirX = Math.sign(dx)
      const dirY = Math.sign(dy)
      if (i > 1) {
        if ((dirX !== 0 && prevDirX !== 0 && dirX !== prevDirX) ||
            (dirY !== 0 && prevDirY !== 0 && dirY !== prevDirY)) {
          reversals++
        }
      }
      if (dirX !== 0) prevDirX = dirX
      if (dirY !== 0) prevDirY = dirY
    }

    if (reversals >= minReversals && distance >= minDistance) {
      lastTriggerAt = t
      events.length = 0
      onShake()
    }
  }

  function reset() {
    events.length = 0
    lastTriggerAt = -Infinity
  }

  return { onMouseMove, reset }
}
