import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalPosition } from '@tauri-apps/api/dpi'
import { invoke } from '@tauri-apps/api/core'
import { ACTIVITY_PHRASES, PUSH_PHRASES, type ActivityType } from '../data/activityPhrases'
import type { HamsterState } from './useHamster'

interface WindowRect {
  left: number
  top: number
  right: number
  bottom: number
}

interface PushCallbacks {
  showSpeech: (text: string) => void
  triggerReaction: (state: HamsterState, duration: number) => void
  onComplete: () => void
}

/** Total push distance in px */
const PUSH_DISTANCE = 200
/** Push duration in ms — slow and visible */
const PUSH_DURATION = 3000
/** Walk speed: px per ms */
const WALK_SPEED = 0.15

export function usePushAnimation(callbacks: PushCallbacks) {
  const isPushing = ref(false)
  const isWalking = ref(false)
  const isWalkingBack = ref(false)

  let animationFrame: number | null = null
  let cancelled = false

  /** Smoothly move hamster window between two positions */
  function animateHamsterMove(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (cancelled) { resolve(); return }
      const startTime = performance.now()
      const appWindow = getCurrentWindow()

      function step(now: number) {
        if (cancelled) { resolve(); return }
        const elapsed = now - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        // Ease-in-out quad for smooth movement
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        const currentX = startX + (endX - startX) * eased
        const currentY = startY + (endY - startY) * eased

        appWindow.setPosition(new LogicalPosition(Math.round(currentX), Math.round(currentY)))
          .catch(() => {})

        if (progress < 1) {
          animationFrame = requestAnimationFrame(step)
        } else {
          animationFrame = null
          resolve()
        }
      }

      animationFrame = requestAnimationFrame(step)
    })
  }

  /**
   * The real push: hamster and target window move together.
   * Hamster pushes from its position, both slide in the same direction.
   */
  function animatePushTogether(
    hamsterX: number,
    hamsterY: number,
    targetWinX: number,
    targetWinY: number,
    pushDirX: number,  // normalized direction
    distance: number,
    durationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (cancelled) { resolve(); return }
      const startTime = performance.now()
      const appWindow = getCurrentWindow()

      function step(now: number) {
        if (cancelled) { resolve(); return }
        const elapsed = now - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        // Linear for a steady push feel
        const moved = distance * progress

        const hx = hamsterX + pushDirX * moved
        const tx = targetWinX + pushDirX * moved

        // Move hamster
        appWindow.setPosition(new LogicalPosition(Math.round(hx), Math.round(hamsterY)))
          .catch(() => {})

        // Move target foreground window via Rust command (captured HWND)
        invoke('move_captured_window', { x: Math.round(tx), y: Math.round(targetWinY) })
          .catch(() => {})

        if (progress < 1) {
          animationFrame = requestAnimationFrame(step)
        } else {
          animationFrame = null
          resolve()
        }
      }

      animationFrame = requestAnimationFrame(step)
    })
  }

  async function startPush(activity: ActivityType, targetRect: WindowRect | null) {
    if (isPushing.value) return
    cancelled = false

    if (!targetRect) {
      // No target window info, just do a simple complaint
      const phrase = ACTIVITY_PHRASES[activity].phrases[
        Math.floor(Math.random() * ACTIVITY_PHRASES[activity].phrases.length)
      ]
      callbacks.showSpeech(phrase)
      callbacks.triggerReaction(ACTIVITY_PHRASES[activity].reactionState, ACTIVITY_PHRASES[activity].reactionDuration)
      setTimeout(() => callbacks.onComplete(), ACTIVITY_PHRASES[activity].reactionDuration + 500)
      return
    }

    isPushing.value = true

    try {
      const appWindow = getCurrentWindow()

      // Capture the target window's HWND before we start moving
      // (so we move the correct window even after focus changes)
      await invoke('capture_foreground_hwnd').catch(() => {})

      // 1. Remember current position
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // Target: left edge of the foreground window, vertically centered
      const approachX = targetRect.left - 140
      const approachY = Math.round((targetRect.top + targetRect.bottom) / 2) - 60

      // Calculate walk distance → duration (slow walk)
      const dx = approachX - startX
      const dy = approachY - startY
      const walkDist = Math.sqrt(dx * dx + dy * dy)
      const walkDuration = Math.max(walkDist / WALK_SPEED, 800)

      // 2. Walk to the target window
      isWalking.value = true
      callbacks.triggerReaction('running', walkDuration + 1000)
      await animateHamsterMove(startX, startY, approachX, approachY, walkDuration)
      if (cancelled) return

      // 3. Arrive — show push phrase
      isWalking.value = false
      const pushPhrases = PUSH_PHRASES[activity]
      const phrase = pushPhrases.length > 0
        ? pushPhrases[Math.floor(Math.random() * pushPhrases.length)]
        : ACTIVITY_PHRASES[activity].phrases[Math.floor(Math.random() * ACTIVITY_PHRASES[activity].phrases.length)]
      callbacks.showSpeech(phrase)
      callbacks.triggerReaction('happy', PUSH_DURATION + 1000)

      // Small pause before pushing (仓鼠蓄力)
      await new Promise(resolve => setTimeout(resolve, 500))
      if (cancelled) return

      // 4. Push! Hamster and target window slide together
      const pushDirX = 1  // push the window to the right
      await animatePushTogether(
        approachX, approachY,
        targetRect.left, targetRect.top,
        pushDirX,
        PUSH_DISTANCE,
        PUSH_DURATION,
      )
      if (cancelled) return

      // 5. Walk back to original position
      const afterPushX = approachX + PUSH_DISTANCE
      isWalkingBack.value = true
      callbacks.triggerReaction('running', 2000)

      const returnDist = Math.sqrt(
        (startX - afterPushX) ** 2 + (startY - approachY) ** 2,
      )
      const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
      await animateHamsterMove(afterPushX, approachY, startX, startY, returnDuration)

      isWalkingBack.value = false
    } catch {
      // Not in Tauri or animation failed
    } finally {
      isPushing.value = false
      isWalking.value = false
      isWalkingBack.value = false
      callbacks.onComplete()
    }
  }

  function cancelAnimation() {
    cancelled = true
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    isPushing.value = false
    isWalking.value = false
    isWalkingBack.value = false
  }

  return {
    isPushing,
    isWalking,
    isWalkingBack,
    startPush,
    cancelAnimation,
  }
}
