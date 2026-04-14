import { ref, onMounted, onUnmounted } from 'vue'

export type HamsterState = 'idle' | 'eating' | 'sleeping' | 'running' | 'hiding' | 'adventure_out' | 'adventure_back' | 'happy'

interface StateConfig {
  minDuration: number
  maxDuration: number
  weight: number
}

const stateConfigs: Record<HamsterState, StateConfig> = {
  idle:           { minDuration: 5000,  maxDuration: 15000, weight: 40 },
  eating:         { minDuration: 3000,  maxDuration: 6000,  weight: 0 },  // triggered manually
  sleeping:       { minDuration: 8000,  maxDuration: 20000, weight: 15 },
  running:        { minDuration: 4000,  maxDuration: 10000, weight: 20 },
  hiding:         { minDuration: 3000,  maxDuration: 8000,  weight: 5 },
  adventure_out:  { minDuration: 5000,  maxDuration: 12000, weight: 10 },
  adventure_back: { minDuration: 2000,  maxDuration: 4000,  weight: 0 },  // follows adventure_out
  happy:          { minDuration: 2000,  maxDuration: 3000,  weight: 0 },  // triggered manually
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickNextState(): HamsterState {
  const candidates = Object.entries(stateConfigs).filter(([_, c]) => c.weight > 0)
  const totalWeight = candidates.reduce((sum, [_, c]) => sum + c.weight, 0)
  let roll = Math.random() * totalWeight
  for (const [state, config] of candidates) {
    roll -= config.weight
    if (roll <= 0) return state as HamsterState
  }
  return 'idle'
}

export function useHamster() {
  const currentState = ref<HamsterState>('idle')
  let timer: ReturnType<typeof setTimeout> | null = null

  function scheduleNext() {
    const config = stateConfigs[currentState.value]
    const duration = randomBetween(config.minDuration, config.maxDuration)
    timer = setTimeout(() => {
      if (currentState.value === 'adventure_out') {
        currentState.value = 'adventure_back'
        scheduleNext()
      } else {
        currentState.value = pickNextState()
        scheduleNext()
      }
    }, duration)
  }

  function triggerHappy() {
    if (timer) clearTimeout(timer)
    currentState.value = 'happy'
    scheduleNext()
  }

  function feedHamster() {
    if (timer) clearTimeout(timer)
    currentState.value = 'eating'
    scheduleNext()
  }

  function setState(state: HamsterState) {
    if (timer) clearTimeout(timer)
    currentState.value = state
    scheduleNext()
  }

  onMounted(() => {
    scheduleNext()
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return {
    currentState,
    triggerHappy,
    feedHamster,
    setState,
  }
}
