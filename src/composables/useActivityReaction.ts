import { ref, watch, type Ref } from 'vue'
import { ACTIVITY_PHRASES, type ActivityType } from '../data/activityPhrases'
import type { HamsterState } from './useHamster'

interface ReactionCallbacks {
  showSpeech: (text: string) => void
  triggerReaction: (state: HamsterState, duration: number) => void
  startPush: (activity: ActivityType) => void
  startVideoPause: () => void
}

interface ReactionSettings {
  /** Whether speech reactions are enabled */
  reactionEnabled: Ref<boolean>
  /** Whether push/pause actions are enabled */
  pushEnabled: Ref<boolean>
  /** Check interval in seconds */
  checkInterval: Ref<number>
  /** Callback when first push happens (for hint) */
  onFirstPush?: () => void
}

export function useActivityReaction(
  currentActivity: Ref<ActivityType>,
  callbacks: ReactionCallbacks,
  reactionSettings: ReactionSettings,
) {
  /** Per-activity cooldown timestamps */
  const cooldowns = ref<Record<string, number>>({})

  /** Lock to prevent overlapping reactions */
  const isReacting = ref(false)

  /** Delay timer for natural feel */
  let delayTimer: ReturnType<typeof setTimeout> | null = null
  /** Periodic check timer */
  let checkTimer: ReturnType<typeof setInterval> | null = null

  /** Track if we've done first push (for hint) */
  let hasShownFirstPushHint = false

  function isOnCooldown(activity: ActivityType): boolean {
    const lastTime = cooldowns.value[activity]
    if (!lastTime) return false
    const config = ACTIVITY_PHRASES[activity]
    return Date.now() - lastTime < config.cooldown
  }

  function setCooldown(activity: ActivityType) {
    cooldowns.value[activity] = Date.now()
  }

  function pickPhrase(activity: ActivityType): string {
    const phrases = ACTIVITY_PHRASES[activity].phrases
    return phrases[Math.floor(Math.random() * phrases.length)]
  }

  function tryReact(activity: ActivityType) {
    // If reactions are disabled, skip entirely
    if (!reactionSettings.reactionEnabled.value) return
    if (isReacting.value) return
    if (isOnCooldown(activity)) return

    isReacting.value = true
    setCooldown(activity)

    const config = ACTIVITY_PHRASES[activity]

    // Random delay 1-3 seconds for natural feel
    const delay = 1000 + Math.random() * 2000
    delayTimer = setTimeout(() => {
      // Check if push actions are enabled
      const pushAllowed = reactionSettings.pushEnabled.value

      // For video activity, prefer video pause over push
      if (pushAllowed && activity === 'video' && config.pushChance > 0 && Math.random() < config.pushChance) {
        // First push hint
        if (!hasShownFirstPushHint) {
          hasShownFirstPushHint = true
          reactionSettings.onFirstPush?.()
        }
        // Video pause sequence — run to center, pause video, come back
        callbacks.startVideoPause()
        // isReacting will be reset when the animation completes
      } else {
        // Decide: simple complaint or push window
        const shouldPush = pushAllowed && config.pushChance > 0 && Math.random() < config.pushChance

        if (shouldPush) {
          // First push hint
          if (!hasShownFirstPushHint) {
            hasShownFirstPushHint = true
            reactionSettings.onFirstPush?.()
          }
          // Push window sequence - the push animation will handle speech
          callbacks.startPush(activity)
          // isReacting will be reset when push animation completes
        } else {
          // Simple complaint: speech bubble + reaction
          const phrase = pickPhrase(activity)
          callbacks.showSpeech(phrase)
          callbacks.triggerReaction(config.reactionState, config.reactionDuration)

          // Reset reacting lock after reaction duration
          setTimeout(() => {
            isReacting.value = false
          }, config.reactionDuration + 500)
        }
      }
    }, delay)
  }

  function resetReacting() {
    isReacting.value = false
  }

  // Watch for activity changes
  watch(currentActivity, (newActivity) => {
    tryReact(newActivity)
  })

  // Also periodically check (in case activity stays the same for a long time)
  function startPeriodicCheck() {
    restartCheckTimer()
  }

  // Restart the timer when interval setting changes
  watch(reactionSettings.checkInterval, () => {
    if (checkTimer) {
      restartCheckTimer()
    }
  })

  function restartCheckTimer() {
    if (checkTimer) clearInterval(checkTimer)
    // checkInterval is in minutes (since v0.7.38). Older installs that
    // had this value as seconds (10, 15, 30, 60) will now interpret
    // their stored value as minutes — intentional per the C migration
    // choice; users can re-pick a sensible value in Settings.
    const intervalMs = reactionSettings.checkInterval.value * 60_000
    checkTimer = setInterval(() => {
      tryReact(currentActivity.value)
    }, intervalMs)
  }

  function stopPeriodicCheck() {
    if (checkTimer) clearInterval(checkTimer)
    if (delayTimer) clearTimeout(delayTimer)
  }

  return {
    isReacting,
    resetReacting,
    startPeriodicCheck,
    stopPeriodicCheck,
  }
}
