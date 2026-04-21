import { ref } from 'vue'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
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

/** Get screen bounds and clamp a position to stay within screen */
async function clampPosition(x: number, y: number): Promise<{ x: number; y: number }> {
  try {
    const monitor = await currentMonitor()
    if (!monitor) return { x, y }
    const win = getCurrentWindow()
    const size = await win.outerSize()

    const mPos = monitor.position
    const mSize = monitor.size
    const margin = Math.round(size.width * 0.2)
    const minX = mPos.x - margin
    const minY = mPos.y
    const maxX = mPos.x + mSize.width - size.width + margin
    const maxY = mPos.y + mSize.height - Math.round(size.height * 0.5)

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    }
  } catch {
    return { x, y }
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
   * Walk to a dynamically updating target. Every `pollIntervalMs` the
   * `getTarget` callback is called to get the latest endpoint.
   * Returns the final position the pet arrived at, or null if cancelled/invalid.
   */
  function animateTrackingWalk(
    startX: number,
    startY: number,
    initialEndX: number,
    initialEndY: number,
    getTarget: () => Promise<{ valid: boolean; x: number; y: number } | null>,
    pollIntervalMs = 500,
  ): Promise<{ endX: number; endY: number } | null> {
    return new Promise((resolve) => {
      if (cancelled) { resolve(null); return }
      const appWindow = getCurrentWindow()

      let currentEndX = initialEndX
      let currentEndY = initialEndY
      let lastPollTime = performance.now()

      // We track the current hamster position so we can smoothly redirect
      let hamsterX = startX
      let hamsterY = startY

      function step(now: number) {
        if (cancelled) { resolve(null); return }

        // Periodically poll for updated target position
        if (now - lastPollTime > pollIntervalMs) {
          lastPollTime = now
          getTarget().then(result => {
            if (result === null || !result.valid) {
              // Target gone — we'll handle this on arrival check
              return
            }
            currentEndX = result.x
            currentEndY = result.y
          }).catch(() => {})
        }

        // Calculate distance to current target
        const dx = currentEndX - hamsterX
        const dy = currentEndY - hamsterY
        const distRemaining = Math.sqrt(dx * dx + dy * dy)

        // Arrived (close enough)
        if (distRemaining < 3) {
          appWindow.setPosition(new PhysicalPosition(Math.round(currentEndX), Math.round(currentEndY)))
            .catch(() => {})
          animationFrame = null
          resolve({ endX: currentEndX, endY: currentEndY })
          return
        }

        // Move toward target at constant speed (physical px per frame at ~60fps)
        const frameMs = 16.67
        const moveThisFrame = WALK_SPEED * frameMs
        const ratio = Math.min(moveThisFrame / distRemaining, 1)

        hamsterX += dx * ratio
        hamsterY += dy * ratio

        appWindow.setPosition(new PhysicalPosition(Math.round(hamsterX), Math.round(hamsterY)))
          .catch(() => {})

        animationFrame = requestAnimationFrame(step)
      }

      animationFrame = requestAnimationFrame(step)
    })
  }

  /** Compute the approach position for a given direction and target rect */
  function computeApproachPosition(
    rect: WindowRect,
    dir: PushDirection,
    scale: number,
  ): { x: number; y: number; dirX: number; dirY: number } {
    const petWinW = PET_WIN_W * scale
    const hRightEdge = H_RIGHT_EDGE * scale
    const hLeftEdge = H_LEFT_EDGE * scale
    const hTopEdge = H_TOP_EDGE * scale
    const hBottomEdge = H_BOTTOM_EDGE * scale

    const targetCenterX = Math.round((rect.left + rect.right) / 2)
    const targetCenterY = Math.round((rect.top + rect.bottom) / 2)

    let x = 0, y = 0, dirX = 0, dirY = 0

    switch (dir) {
      case 'right':
        x = rect.left - hRightEdge
        y = targetCenterY - hBottomEdge + 20 * scale
        dirX = 1
        break
      case 'left':
        x = rect.right - hLeftEdge
        y = targetCenterY - hBottomEdge + 20 * scale
        dirX = -1
        break
      case 'down':
        x = targetCenterX - petWinW / 2
        y = rect.top - hBottomEdge
        dirY = 1
        break
      case 'up':
        x = targetCenterX - petWinW / 2
        y = rect.bottom - hTopEdge
        dirY = -1
        break
    }

    return { x, y, dirX, dirY }
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
      await invoke('capture_foreground_hwnd').catch(() => {})

      const scale = await getScaleFactor()

      // 1. Remember current position (physical pixels)
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // 2. Pick a random push direction
      const dir = pickRandomDirection()
      pushDirection.value = dir

      // 3. Compute initial approach position
      let approach = computeApproachPosition(currentTargetRect, dir, scale)

      // 4. Walk to the target window with real-time tracking
      isWalking.value = true
      callbacks.triggerReaction('running', 15000)

      await animateTrackingWalk(
        startX, startY,
        approach.x, approach.y,
        async () => {
          if (!processName) return null
          const check = await isTargetStillValid(processName)
          if (!check.valid || !check.freshRect) return { valid: false, x: 0, y: 0 }
          currentTargetRect = check.freshRect
          const newApproach = computeApproachPosition(currentTargetRect, dir, scale)
          approach = newApproach
          return { valid: true, x: newApproach.x, y: newApproach.y }
        },
        400, // poll every 400ms
      )
      if (cancelled) return

      // --- Checkpoint B: final validation after walk ---
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
          isWalking.value = false
          isWalkingBack.value = true
          callbacks.triggerReaction('running', 2000)
          const currentPos = await appWindow.outerPosition()
          const returnDist = Math.sqrt((startX - currentPos.x) ** 2 + (startY - currentPos.y) ** 2)
          const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
          await animateHamsterMove(currentPos.x, currentPos.y, startX, startY, returnDuration)
          isWalkingBack.value = false
          return
        }
        if (check.freshRect) {
          currentTargetRect = check.freshRect
          // Recompute final approach to ensure pet is touching the edge
          approach = computeApproachPosition(currentTargetRect, dir, scale)
        }
      }

      // 5. Snap to exact approach position (ensure touching edge)
      const finalApproachX = approach.x
      const finalApproachY = approach.y
      await appWindow.setPosition(new PhysicalPosition(Math.round(finalApproachX), Math.round(finalApproachY)))
        .catch(() => {})

      // 6. Arrive — show push phrase
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

      // 7. Push! Hamster and target window slide together
      // Clamp push distance to stay within screen bounds
      let pushDist = PUSH_DISTANCE * scale
      const potentialEndX = finalApproachX + approach.dirX * pushDist
      const potentialEndY = finalApproachY + approach.dirY * pushDist
      const clampedEnd = await clampPosition(potentialEndX, potentialEndY)
      // Reduce push distance if it would go off-screen
      if (approach.dirX !== 0) {
        pushDist = Math.abs(clampedEnd.x - finalApproachX)
      } else {
        pushDist = Math.abs(clampedEnd.y - finalApproachY)
      }
      if (pushDist < 10) pushDist = 10 // minimum push

      await animatePushTogether(
        finalApproachX, finalApproachY,
        currentTargetRect.left, currentTargetRect.top,
        approach.dirX, approach.dirY,
        pushDist,
        PUSH_DURATION,
      )
      if (cancelled) return

      // 8. Walk back to original position
      const afterPushX = finalApproachX + approach.dirX * pushDist
      const afterPushY = finalApproachY + approach.dirY * pushDist
      isWalkingBack.value = true
      callbacks.triggerReaction('running', 2000)

      // Clamp return position to screen bounds
      const clampedStart = await clampPosition(startX, startY)
      const returnDist = Math.sqrt(
        (clampedStart.x - afterPushX) ** 2 + (clampedStart.y - afterPushY) ** 2,
      )
      const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
      await animateHamsterMove(afterPushX, afterPushY, clampedStart.x, clampedStart.y, returnDuration)

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
      const phrase = VIDEO_PAUSE_PHRASES[Math.floor(Math.random() * VIDEO_PAUSE_PHRASES.length)]
      callbacks.showSpeech(phrase)
      callbacks.triggerReaction('happy', 2000)
      setTimeout(() => callbacks.onComplete(), 2500)
      return
    }

    isPushing.value = true

    try {
      const appWindow = getCurrentWindow()

      // --- Checkpoint A ---
      let currentTargetRect = targetRect
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
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

      await invoke('capture_foreground_hwnd').catch(() => {})

      const scale = await getScaleFactor()
      const petWinW = PET_WIN_W * scale
      const hBottomEdge = H_BOTTOM_EDGE * scale

      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // Helper to compute center target from a rect
      const computeCenter = (rect: WindowRect) => ({
        x: Math.round((rect.left + rect.right) / 2) - petWinW / 2,
        y: Math.round((rect.top + rect.bottom) / 2) - hBottomEdge + 20 * scale,
      })

      let center = computeCenter(currentTargetRect)

      // Walk to center with real-time tracking
      isWalking.value = true
      pushDirection.value = center.x > startX ? 'right' : 'left'
      callbacks.triggerReaction('running', 15000)

      await animateTrackingWalk(
        startX, startY,
        center.x, center.y,
        async () => {
          if (!processName) return null
          const check = await isTargetStillValid(processName)
          if (!check.valid || !check.freshRect) return { valid: false, x: 0, y: 0 }
          currentTargetRect = check.freshRect
          center = computeCenter(currentTargetRect)
          return { valid: true, x: center.x, y: center.y }
        },
        400,
      )
      if (cancelled) return

      // --- Checkpoint B ---
      if (processName) {
        const check = await isTargetStillValid(processName)
        if (!check.valid) {
          isWalking.value = false
          isWalkingBack.value = true
          callbacks.triggerReaction('running', 2000)
          const currentPos = await appWindow.outerPosition()
          const returnDist = Math.sqrt((startX - currentPos.x) ** 2 + (startY - currentPos.y) ** 2)
          const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
          await animateHamsterMove(currentPos.x, currentPos.y, startX, startY, returnDuration)
          isWalkingBack.value = false
          return
        }
      }

      // Arrive — show video pause phrase
      isWalking.value = false
      const phrase = VIDEO_PAUSE_PHRASES[Math.floor(Math.random() * VIDEO_PAUSE_PHRASES.length)]
      callbacks.showSpeech(phrase)

      await new Promise(resolve => setTimeout(resolve, 500))
      if (cancelled) return

      await invoke('send_space_to_window').catch(() => {})
      callbacks.triggerReaction('happy', 2500)

      await new Promise(resolve => setTimeout(resolve, 2000))
      if (cancelled) return

      // Walk back to original position
      const currentPos = await appWindow.outerPosition()
      isWalkingBack.value = true
      pushDirection.value = currentPos.x > startX ? 'right' : 'left'
      callbacks.triggerReaction('running', 2000)

      // Clamp return position to screen bounds
      const clampedReturn = await clampPosition(startX, startY)
      const returnDist = Math.sqrt(
        (clampedReturn.x - currentPos.x) ** 2 + (clampedReturn.y - currentPos.y) ** 2,
      )
      const returnDuration = Math.max(returnDist / WALK_SPEED, 800)
      await animateHamsterMove(currentPos.x, currentPos.y, clampedReturn.x, clampedReturn.y, returnDuration)

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
   * Summon walk: pet walks from current position to a target position (physical pixels),
   * shows a happy reaction and speech on arrival.
   *
   * @param opts.speedMultiplier - Multiplier applied to walk speed.
   *   Values > 1 make the walk faster; values < 1 make it slower.
   *   Defaults to 1 (normal speed). The resulting duration is floored at 250 ms.
   */
  async function startSummonWalk(
    targetPhysX: number,
    targetPhysY: number,
    opts: { speedMultiplier?: number } = {}
  ) {
    if (isPushing.value) return
    cancelled = false
    isPushing.value = true

    try {
      const appWindow = getCurrentWindow()
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // Clamp target to screen bounds
      const clamped = await clampPosition(targetPhysX, targetPhysY)
      targetPhysX = clamped.x
      targetPhysY = clamped.y

      const dx = targetPhysX - startX
      const dy = targetPhysY - startY
      const walkDist = Math.sqrt(dx * dx + dy * dy)

      // If already very close, just teleport
      if (walkDist < 50) {
        await appWindow.setPosition(new PhysicalPosition(Math.round(targetPhysX), Math.round(targetPhysY)))
        return
      }

      const speedMul = Math.max(opts.speedMultiplier ?? 1, 0.1)
      const baseDuration = Math.max(walkDist / WALK_SPEED, 800)
      const walkDuration = Math.max(baseDuration / speedMul, 250)

      isWalking.value = true
      pushDirection.value = dx > 0 ? 'right' : 'left'
      callbacks.triggerReaction('running', walkDuration + 500)
      await animateHamsterMove(startX, startY, targetPhysX, targetPhysY, walkDuration)

      isWalking.value = false
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
    startSummonWalk,
    cancelAnimation,
  }
}
