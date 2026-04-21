import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { invoke } from '@tauri-apps/api/core'
import type { HamsterState } from './useHamster'
import {
  CHASE_START_PHRASES,
  CHASE_CATCH_PHRASES,
  CHASE_FAIL_PHRASES,
  CHASE_PRANK_PHRASES,
} from '../data/hamsterPhrases'

export interface DistanceSample {
  t: number
  dist: number
}

export interface CatchOptions {
  threshold: number
  holdMs: number
}

/** 判定是否追上：最近 holdMs 内所有采样点距离都 < threshold */
export function evaluateCatch(
  samples: DistanceSample[],
  nowT: number,
  opts: CatchOptions,
): boolean {
  const cutoff = nowT - opts.holdMs
  const recent = samples.filter(s => s.t >= cutoff)
  if (recent.length === 0) return false
  // 需要窗口确实被填满——第一条采样必须早于等于 cutoff 前的紧邻采样
  const earliest = recent[0].t
  if (earliest > cutoff + 50) return false // 窗口还没填够
  return recent.every(s => s.dist < opts.threshold)
}

/** 彩蛋概率判定（可测） */
export function shouldTriggerPrank(roll: number, prankChance: number): boolean {
  return roll < prankChance
}

interface ChaseCallbacks {
  showSpeech: (text: string) => void
  triggerReaction: (state: HamsterState, duration: number) => void
  playSound: (name: string) => void
  onPrank?: () => void
}

// Tunables
const CHASE_TIMEOUT_MS = 5000
const CATCH_THRESHOLD_PX = 80
const CATCH_HOLD_MS = 500
const PRANK_CHANCE = 0.2
const CHASE_WALK_SPEED = 0.25 // px per ms

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function useChaseCursor(callbacks: ChaseCallbacks) {
  const isChasing = ref(false)
  let cancelled = false
  let animationFrame: number | null = null

  async function startChase(): Promise<void> {
    if (isChasing.value) return
    isChasing.value = true
    cancelled = false
    let done = false

    try {
      const appWindow = getCurrentWindow()
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      let scale = 1.0
      try { scale = await appWindow.scaleFactor() } catch { /* fallback */ }

      const win = await appWindow.outerSize()
      const petHalfW = win.width / 2
      const petHalfH = win.height / 2

      callbacks.showSpeech(pickRandom(CHASE_START_PHRASES))
      callbacks.triggerReaction('running', CHASE_TIMEOUT_MS + 500)

      const chaseStart = performance.now()
      const samples: DistanceSample[] = []
      let petX = startX
      let petY = startY

      // Chase loop
      await new Promise<void>((resolve) => {
        function step(now: number) {
          if (cancelled) { done = true; resolve(); return }
          const elapsed = now - chaseStart
          if (elapsed >= CHASE_TIMEOUT_MS) { done = true; resolve(); return }

          // Poll cursor (fire and forget — we use last known in closure via invoke-and-update)
          invoke<{ x: number; y: number } | null>('get_cursor_position').then(cur => {
            if (cancelled || done) return
            if (!cur) return
            const targetX = cur.x - petHalfW
            const targetY = cur.y - petHalfH

            const dx = targetX - petX
            const dy = targetY - petY
            const dist = Math.sqrt(dx * dx + dy * dy)

            samples.push({ t: elapsed, dist })
            // Prune old samples
            const cutoff = elapsed - CATCH_HOLD_MS - 100
            while (samples.length > 0 && samples[0].t < cutoff) {
              samples.shift()
            }

            const frameMs = 16.67
            const moveThis = CHASE_WALK_SPEED * frameMs
            const ratio = dist > 0 ? Math.min(moveThis / dist, 1) : 0
            petX += dx * ratio
            petY += dy * ratio

            appWindow.setPosition(new PhysicalPosition(Math.round(petX), Math.round(petY)))
              .catch(() => {})
          }).catch(() => {})

          animationFrame = requestAnimationFrame(step)
        }
        animationFrame = requestAnimationFrame(step)
      })
      if (cancelled) return

      // Evaluate catch
      const caught = evaluateCatch(samples, CHASE_TIMEOUT_MS, {
        threshold: CATCH_THRESHOLD_PX * scale,
        holdMs: CATCH_HOLD_MS,
      })

      if (caught) {
        callbacks.triggerReaction('happy', 3000)
        callbacks.showSpeech(pickRandom(CHASE_CATCH_PHRASES))
        callbacks.playSound('happy')
        await sleep(2000)
      } else {
        callbacks.showSpeech(pickRandom(CHASE_FAIL_PHRASES))
        callbacks.triggerReaction('hiding', 2000)
        await sleep(1500)

        if (shouldTriggerPrank(Math.random(), PRANK_CHANCE)) {
          // Teleport to cursor
          try {
            const cur = await invoke<{ x: number; y: number } | null>('get_cursor_position')
            if (cur) {
              await appWindow.setPosition(
                new PhysicalPosition(Math.round(cur.x - petHalfW), Math.round(cur.y - petHalfH)),
              )
            }
          } catch { /* ignore */ }
          callbacks.onPrank?.()
          callbacks.showSpeech(pickRandom(CHASE_PRANK_PHRASES))
          callbacks.triggerReaction('happy', 3000)
          callbacks.playSound('happy')
          await sleep(3000)
        } else {
          await sleep(1000)
        }
      }

      // Walk back to start
      await walkBack(startX, startY)
    } catch {
      /* not in tauri or aborted */
    } finally {
      isChasing.value = false
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    }
  }

  async function walkBack(targetX: number, targetY: number): Promise<void> {
    const appWindow = getCurrentWindow()
    const cur = await appWindow.outerPosition()
    const dx = targetX - cur.x
    const dy = targetY - cur.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 3) return
    const duration = Math.max(dist / CHASE_WALK_SPEED, 600)
    const startT = performance.now()
    const startX = cur.x
    const startY = cur.y
    await new Promise<void>((resolve) => {
      function step(now: number) {
        if (cancelled) { resolve(); return }
        const p = Math.min((now - startT) / duration, 1)
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        const x = startX + dx * eased
        const y = startY + dy * eased
        appWindow.setPosition(new PhysicalPosition(Math.round(x), Math.round(y))).catch(() => {})
        if (p < 1) {
          animationFrame = requestAnimationFrame(step)
        } else {
          animationFrame = null
          resolve()
        }
      }
      animationFrame = requestAnimationFrame(step)
    })
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function cancel() {
    cancelled = true
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    isChasing.value = false
  }

  return { isChasing, startChase, cancel }
}
