import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { invoke } from '@tauri-apps/api/core'
import { ACTIVITY_PHRASES, PUSH_PHRASES, VIDEO_PAUSE_PHRASES, type ActivityType } from '../data/activityPhrases'
import type { HamsterState } from './useHamster'

interface WindowRect {
  left: number
  top: number
  right: number
  bottom: number
}

interface ActiveWindowInfo {
  title: string
  process_name: string
  rect: WindowRect
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

export type PushDirection = 'left' | 'right' | 'up' | 'down'

/**
 * Pet window is 250×300 in pet mode (logical pixels).
 * Hamster sprite (120px wide) is centered at bottom of window.
 * These offsets help position the pet so it visually touches the target window edge.
 * NOTE: These are in logical pixels and must be scaled by DPI factor when used
 * with physical pixel coordinates from GetWindowRect.
 */
const PET_WIN_W = 250
// Horizontal offset: pet window left → hamster right edge ≈ 185px
const H_RIGHT_EDGE = 185
// Horizontal offset: pet window left → hamster left edge ≈ 65px
const H_LEFT_EDGE = 65
// Vertical offset: pet window top → hamster top ≈ 170px
const H_TOP_EDGE = 170
// Vertical offset: pet window top → hamster bottom ≈ 290px
const H_BOTTOM_EDGE = 290

/** Get the current DPI scale factor */
async function getScaleFactor(): Promise<number> {
  try {
    return await getCurrentWindow().scaleFactor()
  } catch {
    return 1.0
  }
}

/** Check if the target window (by process name) is still the active foreground window */
async function isTargetStillValid(expectedProcess: string): Promise<{ valid: boolean; freshRect?: WindowRect }> {
  try {
    const info = await invoke<ActiveWindowInfo | null>('get_active_window')
    if (!info) return { valid: false }
    if (info.process_name !== expectedProcess) return { valid: false }
    return { valid: true, freshRect: info.rect }
  } catch {
    return { valid: false }
  }
}

function pickRandomDirection(): PushDirection {
  const dirs: PushDirection[] = ['left', 'right', 'up', 'down']
  return dirs[Math.floor(Math.random() * dirs.length)]
}

export function usePushAnimation(callbacks: PushCallbacks) {
  const isPushing = ref(false)
  const isWalking = ref(false)
  const isWalkingBack = ref(false)
  const pushDirection = ref<PushDirection>('right')

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

        appWindow.setPosition(new PhysicalPosition(Math.round(currentX), Math.round(currentY)))
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
    dirX: number,  // normalized direction X (-1, 0, or 1)
    dirY: number,  // normalized direction Y (-1, 0, or 1)
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

        const hx = hamsterX + dirX * moved
        const hy = hamsterY + dirY * moved
        const tx = targetWinX + dirX * moved
        const ty = targetWinY + dirY * moved

        // Move hamster
        appWindow.setPosition(new PhysicalPosition(Math.round(hx), Math.round(hy)))
          .catch(() => {})

        // Move target foreground window via Rust command (captured HWND)
        invoke('move_captured_window', { x: Math.round(tx), y: Math.round(ty) })
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

  async function startPush(activity: ActivityType, targetRect: WindowRect | null, processName?: string) {
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

      // --- Checkpoint A: validate target window before starting walk ---
      let currentTargetRect = targetRect
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
          // Target window gone — fall back to simple complaint
          isPushing.value = false
          const phrase = ACTIVITY_PHRASES[activity].phrases[
            Math.floor(Math.random() * ACTIVITY_PHRASES[activity].phrases.length)
          ]
          callbacks.showSpeech(phrase)
          callbacks.triggerReaction(ACTIVITY_PHRASES[activity].reactionState, ACTIVITY_PHRASES[activity].reactionDuration)
          setTimeout(() => callbacks.onComplete(), ACTIVITY_PHRASES[activity].reactionDuration + 500)
          return
        }
        if (check.freshRect) {
          currentTargetRect = check.freshRect
        }
      }

      // Capture the target window's HWND before we start moving
      // (so we move the correct window even after focus changes)
      await invoke('capture_foreground_hwnd').catch(() => {})

      // Get DPI scale factor to convert logical offsets to physical pixels
      const scale = await getScaleFactor()

      // Scale pet offsets from logical to physical pixels
      const petWinW = PET_WIN_W * scale
      const hRightEdge = H_RIGHT_EDGE * scale
      const hLeftEdge = H_LEFT_EDGE * scale
      const hTopEdge = H_TOP_EDGE * scale
      const hBottomEdge = H_BOTTOM_EDGE * scale

      // 1. Remember current position (physical pixels)
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // 2. Pick a random push direction
      const dir = pickRandomDirection()
      pushDirection.value = dir

      // Calculate approach position: pet stands on the OPPOSITE side of push direction
      // and needs to visually touch the window edge
      // currentTargetRect is in physical pixels (from GetWindowRect), offsets scaled to physical
      let approachX: number
      let approachY: number
      let dirX = 0
      let dirY = 0

      const targetCenterX = Math.round((currentTargetRect.left + currentTargetRect.right) / 2)
      const targetCenterY = Math.round((currentTargetRect.top + currentTargetRect.bottom) / 2)

      switch (dir) {
        case 'right':
          // Pet stands on the LEFT side of the window, pushes right
          approachX = currentTargetRect.left - hRightEdge
          approachY = targetCenterY - hBottomEdge + 20 * scale
          dirX = 1
          break
        case 'left':
          // Pet stands on the RIGHT side of the window, pushes left
          approachX = currentTargetRect.right - hLeftEdge
          approachY = targetCenterY - hBottomEdge + 20 * scale
          dirX = -1
          break
        case 'down':
          // Pet stands ABOVE the window, pushes down
          approachX = targetCenterX - petWinW / 2
          approachY = currentTargetRect.top - hBottomEdge
          dirY = 1
          break
        case 'up':
          // Pet stands BELOW the window, pushes up
          approachX = targetCenterX - petWinW / 2
          approachY = currentTargetRect.bottom - hTopEdge
          dirY = -1
          break
      }

      // Calculate walk distance → duration (slow walk)
      const dx = approachX - startX
      const dy = approachY - startY
      const walkDist = Math.sqrt(dx * dx + dy * dy)
      const walkDuration = Math.max(walkDist / WALK_SPEED, 800)

      // 3. Walk to the target window
      isWalking.value = true
      callbacks.triggerReaction('running', walkDuration + 1000)
      await animateHamsterMove(startX, startY, approachX, approachY, walkDuration)
      if (cancelled) return

      // --- Checkpoint B: validate target window after walk, before push ---
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
          // Target window gone — skip push, walk back to original position
          isWalking.value = false
          isWalkingBack.value = true
          callbacks.triggerReaction('running', 2000)
          const returnDist = Math.sqrt((startX - approachX) ** 2 + (startY - approachY) ** 2)
          const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
          await animateHamsterMove(approachX, approachY, startX, startY, returnDuration)
          isWalkingBack.value = false
          return
        }
        if (check.freshRect) {
          currentTargetRect = check.freshRect
        }
      }

      // 4. Arrive — show push phrase
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

      // 5. Push! Hamster and target window slide together
      const pushDist = PUSH_DISTANCE * scale
      await animatePushTogether(
        approachX, approachY,
        currentTargetRect.left, currentTargetRect.top,
        dirX, dirY,
        pushDist,
        PUSH_DURATION,
      )
      if (cancelled) return

      // 6. Walk back to original position
      const afterPushX = approachX + dirX * pushDist
      const afterPushY = approachY + dirY * pushDist
      isWalkingBack.value = true
      callbacks.triggerReaction('running', 2000)

      const returnDist = Math.sqrt(
        (startX - afterPushX) ** 2 + (startY - afterPushY) ** 2,
      )
      const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
      await animateHamsterMove(afterPushX, afterPushY, startX, startY, returnDuration)

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

  /**
   * Video pause sequence: pet walks to the center of the video window,
   * says a phrase, sends space to pause the video, then walks back.
   */
  async function startVideoPause(targetRect: WindowRect | null, processName?: string) {
    if (isPushing.value) return
    cancelled = false

    if (!targetRect) {
      // No target window, just say something
      const phrase = VIDEO_PAUSE_PHRASES[Math.floor(Math.random() * VIDEO_PAUSE_PHRASES.length)]
      callbacks.showSpeech(phrase)
      callbacks.triggerReaction('happy', 2000)
      setTimeout(() => callbacks.onComplete(), 2500)
      return
    }

    isPushing.value = true

    try {
      const appWindow = getCurrentWindow()

      // --- Checkpoint A: validate target window before starting walk ---
      let currentTargetRect = targetRect
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
          // Target window gone — fall back to simple phrase
          isPushing.value = false
          const phrase = VIDEO_PAUSE_PHRASES[Math.floor(Math.random() * VIDEO_PAUSE_PHRASES.length)]
          callbacks.showSpeech(phrase)
          callbacks.triggerReaction('happy', 2000)
          setTimeout(() => callbacks.onComplete(), 2500)
          return
        }
        if (check.freshRect) {
          currentTargetRect = check.freshRect
        }
      }

      // Capture the target window HWND
      await invoke('capture_foreground_hwnd').catch(() => {})

      // Get DPI scale factor
      const scale = await getScaleFactor()
      const petWinW = PET_WIN_W * scale
      const hBottomEdge = H_BOTTOM_EDGE * scale

      // 1. Remember current position (physical pixels)
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // 2. Calculate center of target window (physical pixels)
      const targetCenterX = Math.round((currentTargetRect.left + currentTargetRect.right) / 2) - petWinW / 2
      const targetCenterY = Math.round((currentTargetRect.top + currentTargetRect.bottom) / 2) - hBottomEdge + 20 * scale

      // 3. Walk to center of the video window
      const dx = targetCenterX - startX
      const dy = targetCenterY - startY
      const walkDist = Math.sqrt(dx * dx + dy * dy)
      const walkDuration = Math.max(walkDist / WALK_SPEED, 800)

      isWalking.value = true
      pushDirection.value = dx > 0 ? 'right' : 'left'
      callbacks.triggerReaction('running', walkDuration + 1000)
      await animateHamsterMove(startX, startY, targetCenterX, targetCenterY, walkDuration)
      if (cancelled) return

      // --- Checkpoint B: validate target window after walk, before sending space ---
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
          // Target window gone — skip space key, walk back
          isWalking.value = false
          isWalkingBack.value = true
          callbacks.triggerReaction('running', 2000)
          const returnDist = Math.sqrt((startX - targetCenterX) ** 2 + (startY - targetCenterY) ** 2)
          const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
          await animateHamsterMove(targetCenterX, targetCenterY, startX, startY, returnDuration)
          isWalkingBack.value = false
          return
        }
      }

      // 4. Arrive — show video pause phrase
      isWalking.value = false
      const phrase = VIDEO_PAUSE_PHRASES[Math.floor(Math.random() * VIDEO_PAUSE_PHRASES.length)]
      callbacks.showSpeech(phrase)

      // 5. Short pause before sending space
      await new Promise(resolve => setTimeout(resolve, 500))
      if (cancelled) return

      // 6. Send space key to pause the video
      await invoke('send_space_to_window').catch(() => {})

      // 7. Happy reaction after pausing
      callbacks.triggerReaction('happy', 2500)

      // 8. Stay for 2 seconds so user sees the pet
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (cancelled) return

      // 9. Walk back to original position
      isWalkingBack.value = true
      pushDirection.value = targetCenterX > startX ? 'right' : 'left'
      callbacks.triggerReaction('running', 2000)

      const returnDist = Math.sqrt(
        (startX - targetCenterX) ** 2 + (startY - targetCenterY) ** 2,
      )
      const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
      await animateHamsterMove(targetCenterX, targetCenterY, startX, startY, returnDuration)

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
    pushDirection,
    startPush,
    startVideoPause,
    cancelAnimation,
  }
}
