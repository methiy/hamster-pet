import { ref, computed } from 'vue'

export interface StatusData {
  mood: number        // 0-100
  fullness: number    // 0-100
  clicksToday: number
  feedsToday: number
  totalCoinsEarned: number
  adventuresCompleted: number
  lastDayReset: string  // YYYY-MM-DD
}

export type MoodLevel = 'happy' | 'normal' | 'sad'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultStatus(): StatusData {
  return {
    mood: 60,
    fullness: 50,
    clicksToday: 0,
    feedsToday: 0,
    totalCoinsEarned: 0,
    adventuresCompleted: 0,
    lastDayReset: todayStr(),
  }
}

export function useStatus() {
  const status = ref<StatusData>(defaultStatus())
  let decayTimer: ReturnType<typeof setInterval> | null = null

  const moodLevel = computed<MoodLevel>(() => {
    if (status.value.mood >= 70) return 'happy'
    if (status.value.mood >= 30) return 'normal'
    return 'sad'
  })

  function checkDayReset() {
    const today = todayStr()
    if (status.value.lastDayReset !== today) {
      status.value.clicksToday = 0
      status.value.feedsToday = 0
      status.value.lastDayReset = today
    }
  }

  /** Start periodic decay: fullness -2, mood -1 every 5 minutes */
  function startDecay() {
    decayTimer = setInterval(() => {
      checkDayReset()
      status.value.fullness = Math.max(0, status.value.fullness - 2)
      status.value.mood = Math.max(0, status.value.mood - 1)
    }, 5 * 60 * 1000)
  }

  function stopDecay() {
    if (decayTimer) {
      clearInterval(decayTimer)
      decayTimer = null
    }
  }

  // --- Event recorders ---
  function recordClick() {
    checkDayReset()
    status.value.clicksToday++
    status.value.mood = Math.min(100, status.value.mood + 2)
  }

  function recordFeed() {
    checkDayReset()
    status.value.feedsToday++
    status.value.fullness = Math.min(100, status.value.fullness + 15)
    status.value.mood = Math.min(100, status.value.mood + 5)
  }

  function recordAdventure() {
    status.value.adventuresCompleted++
    status.value.mood = Math.min(100, status.value.mood + 10)
  }

  function recordCoinsEarned(amount: number) {
    status.value.totalCoinsEarned += amount
  }

  function getStatusData(): StatusData {
    return { ...status.value }
  }

  function loadStatusData(data: StatusData) {
    status.value = { ...defaultStatus(), ...data }
    checkDayReset()
  }

  return {
    status,
    moodLevel,
    recordClick,
    recordFeed,
    recordAdventure,
    recordCoinsEarned,
    startDecay,
    stopDecay,
    getStatusData,
    loadStatusData,
  }
}
