import { ref, computed } from 'vue'

export type PomodoroPhase = 'idle' | 'work' | 'break'

export interface PomodoroStats {
  totalPomodoros: number
  totalMinutes: number
  todayPomodoros: number
  lastDayReset: string
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function usePomodoro() {
  const phase = ref<PomodoroPhase>('idle')
  const workDuration = ref(25)   // minutes
  const breakDuration = ref(5)   // minutes
  const remainingSeconds = ref(0)
  const stats = ref<PomodoroStats>({
    totalPomodoros: 0,
    totalMinutes: 0,
    todayPomodoros: 0,
    lastDayReset: todayStr(),
  })

  let tickTimer: ReturnType<typeof setInterval> | null = null
  let slackCheckTimer: ReturnType<typeof setInterval> | null = null

  // Callbacks set by App.vue
  let onComplete: ((coinReward: number) => void) | null = null
  let onSlackDetected: (() => void) | null = null
  let onEncourage: (() => void) | null = null
  let onBreakStart: (() => void) | null = null
  let onBreakEnd: (() => void) | null = null

  const isRunning = computed(() => phase.value !== 'idle')

  const displayTime = computed(() => {
    const m = Math.floor(remainingSeconds.value / 60)
    const s = remainingSeconds.value % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  })

  const phaseEmoji = computed(() => {
    if (phase.value === 'work') return '🍅'
    if (phase.value === 'break') return '☕'
    return ''
  })

  const phaseLabel = computed(() => {
    if (phase.value === 'work') return '工作中'
    if (phase.value === 'break') return '休息中'
    return ''
  })

  function checkDayReset() {
    const today = todayStr()
    if (stats.value.lastDayReset !== today) {
      stats.value.todayPomodoros = 0
      stats.value.lastDayReset = today
    }
  }

  function startWork() {
    if (phase.value !== 'idle') return
    checkDayReset()
    phase.value = 'work'
    remainingSeconds.value = workDuration.value * 60

    tickTimer = setInterval(() => {
      if (remainingSeconds.value <= 0) {
        completeWork()
        return
      }
      remainingSeconds.value--
    }, 1000)

    // Encourage every 60 seconds
    slackCheckTimer = setInterval(() => {
      if (phase.value === 'work' && onEncourage) {
        onEncourage()
      }
    }, 60000)
  }

  function completeWork() {
    stopTimers()
    const coinReward = workDuration.value  // 1 coin per minute
    stats.value.totalPomodoros++
    stats.value.todayPomodoros++
    stats.value.totalMinutes += workDuration.value

    if (onComplete) onComplete(coinReward)

    // Start break
    phase.value = 'break'
    remainingSeconds.value = breakDuration.value * 60
    if (onBreakStart) onBreakStart()

    tickTimer = setInterval(() => {
      if (remainingSeconds.value <= 0) {
        completeBreak()
        return
      }
      remainingSeconds.value--
    }, 1000)
  }

  function completeBreak() {
    stopTimers()
    phase.value = 'idle'
    remainingSeconds.value = 0
    if (onBreakEnd) onBreakEnd()
  }

  function cancel() {
    stopTimers()
    phase.value = 'idle'
    remainingSeconds.value = 0
  }

  function stopTimers() {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    if (slackCheckTimer) {
      clearInterval(slackCheckTimer)
      slackCheckTimer = null
    }
  }

  /** Called by activity sensor when slacking detected during work phase */
  function reportSlacking() {
    if (phase.value === 'work' && onSlackDetected) {
      onSlackDetected()
    }
  }

  function setCallbacks(cbs: {
    onComplete?: (coinReward: number) => void
    onSlackDetected?: () => void
    onEncourage?: () => void
    onBreakStart?: () => void
    onBreakEnd?: () => void
  }) {
    onComplete = cbs.onComplete ?? null
    onSlackDetected = cbs.onSlackDetected ?? null
    onEncourage = cbs.onEncourage ?? null
    onBreakStart = cbs.onBreakStart ?? null
    onBreakEnd = cbs.onBreakEnd ?? null
  }

  function getPomodoroData(): PomodoroStats {
    return { ...stats.value }
  }

  function loadPomodoroData(data: PomodoroStats) {
    stats.value = { ...stats.value, ...data }
    checkDayReset()
  }

  function destroy() {
    stopTimers()
  }

  return {
    phase,
    workDuration,
    breakDuration,
    remainingSeconds,
    stats,
    isRunning,
    displayTime,
    phaseEmoji,
    phaseLabel,
    startWork,
    cancel,
    reportSlacking,
    setCallbacks,
    getPomodoroData,
    loadPomodoroData,
    destroy,
  }
}
