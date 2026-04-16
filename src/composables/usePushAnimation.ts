import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalPosition } from '@tauri-apps/api/dpi'
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

export function usePushAnimation(callbacks: PushCallbacks) {
  const isPushing = ref(false)
  const isWalking = ref(false)
  const isWalkingBack = ref(false)

  let animationFrame: number | null = null

  /** Smoothly move hamster window from current position to target */
  function animateMove(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now()
      const appWindow = getCurrentWindow()

      function step(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)

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

  async function startPush(activity: ActivityType, targetRect: WindowRect | null) {
    if (isPushing.value) return
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

      // 1. Remember current position
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // Target: left edge of the foreground window, vertically centered
      const targetX = targetRect.left - 130 // Slightly to the left of the target window
      const targetY = Math.round((targetRect.top + targetRect.bottom) / 2) - 60

      // 2. Walk to the target window (1.5 seconds)
      isWalking.value = true
      callbacks.triggerReaction('running', 5000) // Running animation during walk
      await animateMove(startX, startY, targetX, targetY, 1500)

      // 3. Arrive - show speech bubble with push phrase
      isWalking.value = false
      const pushPhrases = PUSH_PHRASES[activity]
      const phrase = pushPhrases.length > 0
        ? pushPhrases[Math.floor(Math.random() * pushPhrases.length)]
        : ACTIVITY_PHRASES[activity].phrases[Math.floor(Math.random() * ACTIVITY_PHRASES[activity].phrases.length)]
      callbacks.showSpeech(phrase)
      callbacks.triggerReaction('happy', 2500)

      // 4. Push animation (2 seconds) - CSS handles the visual
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 5. Walk back to original position (1.5 seconds)
      isWalkingBack.value = true
      callbacks.triggerReaction('running', 2000)
      await animateMove(targetX, targetY, startX, startY, 1500)

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
