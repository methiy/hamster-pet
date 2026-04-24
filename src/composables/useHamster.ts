import { ref, computed, onMounted, onUnmounted } from 'vue'

export type HamsterState =
  | 'idle'
  | 'eating'
  | 'sleeping'
  | 'running'
  | 'hiding'
  | 'adventure_out'
  | 'adventure_back'
  | 'happy'
  | 'shy'
  | 'chase'
  | 'grabbed'
  | 'landed'
  | 'push_horizontal'
  | 'push_vertical'
  | 'angry'
  | 'yawn'
  | 'scratch'
  | 'bark'

interface StateConfig {
  minDuration: number
  maxDuration: number
  weight: number
}

const stateConfigs: Record<HamsterState, StateConfig> = {
  idle:            { minDuration: 5000,  maxDuration: 15000, weight: 40 },
  eating:          { minDuration: 3000,  maxDuration: 6000,  weight: 0 },  // triggered manually
  sleeping:        { minDuration: 8000,  maxDuration: 20000, weight: 15 },
  running:         { minDuration: 4000,  maxDuration: 10000, weight: 20 },
  hiding:          { minDuration: 3000,  maxDuration: 8000,  weight: 5 },
  adventure_out:   { minDuration: 5000,  maxDuration: 12000, weight: 10 },
  adventure_back:  { minDuration: 2000,  maxDuration: 4000,  weight: 0 },  // follows adventure_out
  happy:           { minDuration: 2000,  maxDuration: 3000,  weight: 0 },  // triggered manually
  // Reaction-only states (weight 0 — never entered by the idle loop,
  // always driven by triggerReaction from some external event):
  shy:             { minDuration: 1500,  maxDuration: 2000,  weight: 0 },
  chase:           { minDuration: 3000,  maxDuration: 10000, weight: 0 },
  grabbed:         { minDuration: 1000,  maxDuration: 30000, weight: 0 },
  landed:          { minDuration: 500,   maxDuration: 800,   weight: 0 },
  push_horizontal: { minDuration: 3000,  maxDuration: 5000,  weight: 0 },
  push_vertical:   { minDuration: 3000,  maxDuration: 5000,  weight: 0 },
  angry:           { minDuration: 2500,  maxDuration: 4000,  weight: 0 },
  yawn:            { minDuration: 800,   maxDuration: 800,   weight: 0 },
  scratch:         { minDuration: 2000,  maxDuration: 3000,  weight: 0 },
  bark:            { minDuration: 1500,  maxDuration: 2500,  weight: 0 },
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
  let idleVariationTimer: ReturnType<typeof setTimeout> | null = null

  // Reaction system: temporarily override displayed state
  const reactionState = ref<HamsterState | null>(null)
  let reactionTimer: ReturnType<typeof setTimeout> | null = null

  function triggerReaction(state: HamsterState, durationMs = 1500) {
    if (reactionTimer) clearTimeout(reactionTimer)
    reactionState.value = state
    reactionTimer = setTimeout(() => {
      reactionState.value = null
    }, durationMs)
  }

  /** Display state: reaction state takes priority over current state */
  const displayState = computed(() => reactionState.value ?? currentState.value)

  /**
   * While the pet is in idle, periodically sprinkle in a short yawn or
   * scratch variation so it feels alive instead of always doing the same
   * breathing loop. Scheduled recursively; cleared on state change.
   */
  function scheduleIdleVariation() {
    if (idleVariationTimer) clearTimeout(idleVariationTimer)
    // First variation after 20-45s of continuous idle
    const delay = randomBetween(20000, 45000)
    idleVariationTimer = setTimeout(() => {
      // Only trigger if we're still in idle and no other reaction is active
      if (currentState.value === 'idle' && reactionState.value === null) {
        const pick = Math.random()
        if (pick < 0.5) {
          triggerReaction('yawn', 900)
        } else {
          triggerReaction('scratch', randomBetween(2000, 3000))
        }
      }
      scheduleIdleVariation()
    }, delay)
  }

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
    scheduleIdleVariation()
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
    if (idleVariationTimer) clearTimeout(idleVariationTimer)
    if (reactionTimer) clearTimeout(reactionTimer)
  })

  return {
    currentState,
    displayState,
    triggerHappy,
    feedHamster,
    setState,
    triggerReaction,
  }
}
