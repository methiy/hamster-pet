<template>
  <div
    class="app-container"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onRightClick"
    @dblclick="onDoubleClick"
  >
    <div class="scene" :style="sceneStyle">
      <div class="scene-inner">
        <SpeechBubble
          :text="speechText"
          :visible="speechVisible"
          @hide="speechVisible = false"
        />

        <div class="info-stack">
          <WeatherWidget
            :weather="weather"
            :emoji="weatherEmoji"
          />

          <StatusNote
            v-if="isOnAdventure && adventureLocation && adventureEndTime"
            :location-emoji="adventureLocation.emoji"
            :location-name="adventureLocation.name"
            :end-time="adventureEndTime"
          />

          <PomodoroNote
            :is-running="pomodoroIsRunning"
            :phase-emoji="pomodoroPhaseEmoji"
            :phase-label="pomodoroPhaseLabel"
            :display-time="pomodoroDisplayTime"
          />
        </div>

        <div class="hamster-spacer"></div>

        <div class="hamster-area" :class="pushAnimationClasses">
          <HamsterSprite
            :state="displayState"
            :wiggle="chaseWiggle"
            @region-click="onRegionClick"
            @region-hover="onRegionHover"
            @miss-click="onMissClick"
            @grab-start="onGrabStart"
            @grab-move="onGrabMove"
            @grab-end="onGrabEnd"
            @hit-mousemove="onShakeMouseMove"
          />
        </div>
      </div>
    </div>

    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { listen, emit as tauriEmit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import HamsterSprite from './components/HamsterSprite.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import StatusNote from './components/StatusNote.vue'
import ToastNotification from './components/ToastNotification.vue'
import PomodoroNote from './components/PomodoroNote.vue'
import WeatherWidget from './components/WeatherWidget.vue'
import { useHamster } from './composables/useHamster'
import { useInventory } from './composables/useInventory'
import { useAdventure } from './composables/useAdventure'
import { useSave, type SettingsData } from './composables/useSave'
import { useBuff } from './composables/useBuff'
import { useToast } from './composables/useToast'
import { useActivitySensor } from './composables/useActivitySensor'
import { useActivityReaction } from './composables/useActivityReaction'
import { usePushAnimation } from './composables/usePushAnimation'
import { useReminder } from './composables/useReminder'
import { useAudio } from './composables/useAudio'
import { useStatus } from './composables/useStatus'
import { usePomodoro } from './composables/usePomodoro'
import { WORK_ENCOURAGE_PHRASES, WORK_SLACKING_PHRASES, BREAK_PHRASES, COMPLETE_PHRASES } from './data/pomodoroPhrases'
import { useWeather } from './composables/useWeather'
import { usePanelWindow } from './composables/usePanelWindow'
import { WEATHER_PHRASES } from './data/weatherPhrases'
import { CLICK_PHRASES, HOVER_PHRASES, REACTION_MAP, GRAB_PHRASES, GRAB_HOLDING_PHRASES, GRAB_RELEASE_PHRASES } from './data/hamsterPhrases'
import { useNotepadSlide } from './composables/useNotepadSlide'
import { useMouseShakeDetector } from './composables/useMouseShakeDetector'
import { useChaseCursor } from './composables/useChaseCursor'
import { useWindowShake } from './composables/useWindowShake'
import { useAlertUser } from './composables/useAlertUser'
import { useFeedingOverlay } from './composables/useFeedingOverlay'
import type { BodyRegion } from './data/hamsterPhrases'
import type { ActivityType } from './data/activityPhrases'
import { SUMMON_PHRASES } from './data/activityPhrases'
import { foods } from './data/foods'

// --- Settings ---
const settings = ref<SettingsData>({
  alwaysOnTop: false,
  size: 'medium',
  volume: 70,
  muted: false,
})

// --- Audio ---
const audioVolume = computed(() => settings.value.volume ?? 70)
const audioMuted = computed(() => settings.value.muted ?? false)
const { playSound } = useAudio(audioVolume, audioMuted)

// --- Core composables ---
const { currentState, displayState, triggerHappy, feedHamster, setState, triggerReaction } = useHamster()
const { showToast } = useToast()

const {
  reminders,
  addReminder,
  removeReminder,
  checkDueReminders,
  getReminders,
  loadReminders,
} = useReminder()

const {
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
} = useStatus()

const {
  phase: pomodoroPhase,
  workDuration: pomodoroWorkDuration,
  breakDuration: pomodoroBreakDuration,
  stats: pomodoroStats,
  isRunning: pomodoroIsRunning,
  displayTime: pomodoroDisplayTime,
  phaseEmoji: pomodoroPhaseEmoji,
  phaseLabel: pomodoroPhaseLabel,
  startWork: pomodoroStartWork,
  cancel: pomodoroCancel,
  reportSlacking: pomodoroReportSlacking,
  setCallbacks: pomodoroSetCallbacks,
  getPomodoroData,
  loadPomodoroData,
  destroy: pomodoroDestroy,
} = usePomodoro()

const {
  weather,
  weatherEmoji,
  updateWeather,
  startAutoFetch,
  stopAutoFetch,
} = useWeather()

let lastWeatherCondition: string | null = null

const {
  coins,
  ownedFoods,
  buyFood,
  useFood,
  getFoodDetails,
  startCoinTimer,
  stopCoinTimer,
} = useInventory()

const { buffValues } = useBuff()

const {
  isOnAdventure,
  adventureLocation,
  adventureEndTime,
  collectedPostcards,
  collectedSouvenirs,
  hasTent,
  hasScarf,
  hasTreasureMap,
  hasBoatTicket,
  hasTelescope,
  startAdventure,
  checkAdventureReturn,
  getAdventureData,
  loadAdventureData,
} = useAdventure()

const offlineCoinCap = computed(() => buffValues.value.offlineCoinCap)

const { save, load, startAutoSave, stopAutoSave } = useSave(coins, ownedFoods, {
  getAdventureData,
  loadAdventureData,
}, {
  settings,
  offlineCoinCap,
}, {
  getReminders,
  loadReminders,
  getStatusData,
  loadStatusData,
  getPomodoroData,
  loadPomodoroData,
})

// --- Activity sensing & reaction ---
const { currentActivity, windowInfo } = useActivitySensor()

// Check for slacking during pomodoro work phase
watch(currentActivity, (activity) => {
  if (pomodoroPhase.value === 'work' && (activity === 'video' || activity === 'gaming')) {
    pomodoroReportSlacking()
  }
})

// Weather change speech
watch(weather, (w) => {
  if (!w) return
  if (lastWeatherCondition && lastWeatherCondition !== w.condition) {
    // Weather changed — say something
    const phrases = WEATHER_PHRASES[w.condition]
    if (phrases && phrases.length > 0) {
      showSpeechText(phrases[Math.floor(Math.random() * phrases.length)])
    }
  }
  lastWeatherCondition = w.condition
})

function showSpeechText(text: string) {
  speechText.value = text
  speechVisible.value = true
}

const { isPushing, isWalking, isWalkingBack, pushDirection, startPush, startVideoPause, startSummonWalk, cancelAnimation } = usePushAnimation({
  showSpeech: showSpeechText,
  triggerReaction,
  onComplete: () => {
    resetReacting()
  },
})

// --- Cursor chase feature ---
const chaseWiggle = ref(false)
let chaseWiggleTimer: ReturnType<typeof setTimeout> | null = null
const { isChasing, startChase, cancel: cancelChase } = useChaseCursor({
  showSpeech: showSpeechText,
  triggerReaction,
  playSound,
  onPrank: () => {
    chaseWiggle.value = true
    if (chaseWiggleTimer) clearTimeout(chaseWiggleTimer)
    chaseWiggleTimer = setTimeout(() => {
      chaseWiggle.value = false
      chaseWiggleTimer = null
    }, 1800)
  },
})

// --- Notepad-slide reminder feature ---
const { slideNotepadReminder } = useNotepadSlide()

const { shakeWindowByHwnd } = useWindowShake()

const { alertUserWithPet } = useAlertUser({
  playSound: (name: string) => playSound(name as Parameters<typeof playSound>[0]),
  walkTo: async ([x, y], opts) => {
    await startSummonWalk(x, y, { speedMultiplier: opts?.speedMultiplier })
  },
  showSpeech: showSpeechText,
  getPetPosition: async () => {
    const pos = await getCurrentWindow().outerPosition()
    return [pos.x, pos.y]
  },
})

const feeding = useFeedingOverlay()

const { onMouseMove: onShakeMouseMove } = useMouseShakeDetector(() => {
  // Don't start chase while other animations are active
  if (isChasing.value) return
  if (isPushing.value || isWalking.value || isWalkingBack.value) return
  if (isGrabbing.value) return
  startChase()
})

// --- Activity reaction settings (derived from settings ref) ---
const activityReactionEnabled = computed(() => settings.value.activityReactionEnabled ?? true)
const activityPushEnabled = computed(() => settings.value.activityPushEnabled ?? true)
const activityCheckInterval = computed(() => settings.value.activityCheckInterval ?? 1)

const { resetReacting, startPeriodicCheck, stopPeriodicCheck } = useActivityReaction(
  currentActivity,
  {
    showSpeech: showSpeechText,
    triggerReaction,
    startPush: (activity: ActivityType) => {
      if (isChasing.value) return
      startPush(activity, windowInfo.value?.rect ?? null, windowInfo.value?.process_name)
    },
    startVideoPause: () => {
      if (isChasing.value) return
      startVideoPause(windowInfo.value?.rect ?? null, windowInfo.value?.process_name)
    },
  },
  {
    reactionEnabled: activityReactionEnabled,
    pushEnabled: activityPushEnabled,
    checkInterval: activityCheckInterval,
    onFirstPush: () => {
      showSpeechText('主人~如果不想被打扰，可以去设置里关闭互动哦~')
    },
  },
)

// --- Panel window ---
const { preloadPanel, openPanel, syncState, setupActionListener, destroyActionListener, currentOpenPanel } = usePanelWindow()

// Default global-shortcut accelerators, by logical id. These must stay
// in sync with the Rust-side default_accel() in src-tauri/src/lib.rs
// and the labels in components/AboutPanel.vue. User-customized values
// live in settings.shortcuts.
const DEFAULT_SHORTCUTS: Record<string, string> = {
  summon:   'Ctrl+Shift+P',
  feed:     'Ctrl+Shift+F',
  reminder: 'Ctrl+Shift+N',
  pomodoro: 'Ctrl+Shift+T',
  snack:    'Ctrl+Shift+E',
}

/** The currently-active shortcut map (custom overrides on top of defaults). */
function getEffectiveShortcuts(): Record<string, string> {
  const custom = settings.value.shortcuts ?? {}
  return { ...DEFAULT_SHORTCUTS, ...custom }
}

function getPanelData(panel: string): Record<string, any> {
  switch (panel) {
    case 'shop':
      return {
        coins: coins.value,
        hasTent: hasTent.value,
        hasScarf: hasScarf.value,
        hasTreasureMap: hasTreasureMap.value,
        hasBoatTicket: hasBoatTicket.value,
        hasTelescope: hasTelescope.value,
      }
    case 'feed':
      return { ownedFoods: ownedFoods.value }
    case 'postcard':
      return { collectedPostcards: [...collectedPostcards.value] }
    case 'souvenir':
      return { collectedSouvenirs: collectedSouvenirs.value }
    case 'reminder':
      return { reminders: reminders.value }
    case 'status':
      return { status: status.value, moodLevel: moodLevel.value }
    case 'pomodoro':
      return {
        isRunning: pomodoroIsRunning.value,
        workDuration: pomodoroWorkDuration.value,
        breakDuration: pomodoroBreakDuration.value,
        displayTime: pomodoroDisplayTime.value,
        phaseEmoji: pomodoroPhaseEmoji.value,
        phaseLabel: pomodoroPhaseLabel.value,
        stats: pomodoroStats.value,
      }
    case 'settings':
      return {
        alwaysOnTop: settings.value.alwaysOnTop,
        size: settings.value.size,
        volume: settings.value.volume ?? 70,
        muted: settings.value.muted ?? false,
        weatherCity: settings.value.weatherCity ?? '',
        passThrough: settings.value.passThrough ?? false,
        autoStart: settings.value.autoStart ?? false,
        activityReactionEnabled: settings.value.activityReactionEnabled ?? true,
        activityPushEnabled: settings.value.activityPushEnabled ?? true,
        activityCheckInterval: settings.value.activityCheckInterval ?? 1,
      }
    case 'about':
      return {
        shortcuts: getEffectiveShortcuts(),
        defaultShortcuts: DEFAULT_SHORTCUTS,
      }
    default:
      return {}
  }
}

function handlePanelAction(action: string, payload?: any) {
  switch (action) {
    case 'buyFood': onBuyFood(payload); break
    case 'buyGear': onBuyGear(payload); break
    case 'feed': onFeedItem(payload); break
    case 'addReminder': onAddReminder(payload.text, payload.opts); break
    case 'removeReminder': onRemoveReminder(payload); break
    case 'pomodoroStart': onPomodoroStart(); break
    case 'pomodoroCancel': onPomodoroCancel(); break
    case 'updateWorkDuration': pomodoroWorkDuration.value = payload; break
    case 'updateBreakDuration': pomodoroBreakDuration.value = payload; break
    case 'updateAlwaysOnTop': onToggleAlwaysOnTop(payload); break
    case 'updateSize': onChangeSize(payload); break
    case 'updateVolume': onChangeVolume(payload); break
    case 'updateMuted': onChangeMuted(payload); break
    case 'updateWeatherCity': onChangeWeatherCity(payload); break
    case 'updatePassThrough': onTogglePassThrough(payload); break
    case 'updateAutoStart': onToggleAutoStart(payload); break
    case 'updateActivityReactionEnabled': settings.value = { ...settings.value, activityReactionEnabled: payload }; break
    case 'updateActivityPushEnabled': settings.value = { ...settings.value, activityPushEnabled: payload }; break
    case 'updateActivityCheckInterval': settings.value = { ...settings.value, activityCheckInterval: payload }; break
    case 'rebindShortcut': onRebindShortcut(payload.id, payload.key); break
    case 'resetShortcut': onResetShortcut(payload); break
  }

  // Sync updated state back to panel after action
  if (currentOpenPanel.value) {
    syncState(getPanelData(currentOpenPanel.value))
  }
}

/**
 * Rebind a global shortcut by id. On success, persists the new
 * binding to settings.shortcuts and re-syncs the panel. On failure
 * (conflict, invalid accelerator, OS-level registration failed), the
 * Rust side has already rolled back to the previous binding; we just
 * forward the error message to the panel so it can surface it to the
 * user.
 */
async function onRebindShortcut(id: string, newKey: string) {
  const currentMap = getEffectiveShortcuts()
  const oldKey = currentMap[id]
  if (!oldKey || oldKey === newKey) return

  try {
    await invoke('rebind_shortcut', { id, newAccel: newKey })
    settings.value = {
      ...settings.value,
      shortcuts: { ...(settings.value.shortcuts ?? {}), [id]: newKey },
    }
    save()
    syncState(getPanelData('about'))
  } catch (err) {
    // Let the panel know so it can show a toast. We pass the error
    // string through in a dedicated event; the panel listens for it
    // in its own code.
    tauriEmit('shortcut-rebind-error', { id, attempted: newKey, error: String(err) }).catch(() => {})
    syncState(getPanelData('about'))
  }
}

async function onResetShortcut(id: string) {
  const def = DEFAULT_SHORTCUTS[id]
  if (!def) return
  const current = getEffectiveShortcuts()[id]
  if (current === def) {
    // Already at default — just clear the custom override entry.
    const next = { ...(settings.value.shortcuts ?? {}) }
    delete next[id]
    settings.value = { ...settings.value, shortcuts: next }
    save()
    syncState(getPanelData('about'))
    return
  }
  try {
    await invoke('rebind_shortcut', { id, newAccel: def })
    const next = { ...(settings.value.shortcuts ?? {}) }
    delete next[id]
    settings.value = { ...settings.value, shortcuts: next }
    save()
    syncState(getPanelData('about'))
  } catch (err) {
    tauriEmit('shortcut-rebind-error', { id, attempted: def, error: String(err) }).catch(() => {})
    syncState(getPanelData('about'))
  }
}

function openPanelFor(panel: string) {
  openPanel(panel, getPanelData(panel))
}

// --- Speech bubble ---
const speechText = ref('')
const speechVisible = ref(false)

// --- Hover cooldown ---
let lastHoverSpeechTime = 0

// --- Click debounce ---
let clickTimer: ReturnType<typeof setTimeout> | null = null
let pendingRegion: BodyRegion | null = null

// --- Scale style ---
const BASE_WIDTH = 150
const BASE_HEIGHT = 170
const sizeScaleMap: Record<string, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.3,
}

const sceneStyle = computed(() => {
  const scale = sizeScaleMap[settings.value.size] ?? 1.0
  if (scale === 1.0) return {}
  return { transform: `scale(${scale})`, transformOrigin: 'bottom center' }
})

const pushAnimationClasses = computed(() => {
  const pushing = isPushing.value && !isWalking.value && !isWalkingBack.value
  const dir = pushDirection.value
  return {
    'hamster-pushing': pushing,
    'hamster-push-left': pushing && dir === 'left',
    'hamster-push-right': pushing && dir === 'right',
    'hamster-push-up': pushing && dir === 'up',
    'hamster-push-down': pushing && dir === 'down',
    // Walking to window: face direction of movement (handled by walk logic)
    // Walking back: flip to face return direction
    'hamster-flipped': isWalkingBack.value || (isWalking.value && dir === 'right') || (pushing && dir === 'left'),
  }
})

// --- Drag ---
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  try { getCurrentWindow().startDragging() } catch { /* Not in Tauri */ }
}

function onMissClick(_e: MouseEvent) {
  try { getCurrentWindow().startDragging() } catch { /* Not in Tauri */ }
}

function onRightClick(_e: MouseEvent) {
  invoke('show_context_menu')
}

function onDoubleClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    pendingRegion = null
  }
  triggerHappy()
  playSound('happy')
}

// --- Interaction ---
function onRegionClick(region: BodyRegion) {
  pendingRegion = region
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    if (pendingRegion) {
      handleRegionClick(pendingRegion)
      pendingRegion = null
    }
    clickTimer = null
  }, 250)
}

function handleRegionClick(region: BodyRegion) {
  const phrases = CLICK_PHRASES[region]
  speechText.value = phrases[Math.floor(Math.random() * phrases.length)]
  speechVisible.value = true
  const reaction = REACTION_MAP[region]
  triggerReaction(reaction.state, reaction.duration)
  playSound('click')
  recordClick()
}

function onRegionHover(region: BodyRegion | null) {
  if (!region) return
  const now = Date.now()
  if (now - lastHoverSpeechTime < 5000) return
  if (Math.random() > 0.3) return
  lastHoverSpeechTime = now
  speechText.value = HOVER_PHRASES[Math.floor(Math.random() * HOVER_PHRASES.length)]
  speechVisible.value = true
}

// --- Grab / lift interaction ---
let grabScreenX = 0
let grabScreenY = 0
let grabWindowX = 0
let grabWindowY = 0
let grabHoldTimer: ReturnType<typeof setTimeout> | null = null
const isGrabbing = ref(false)

// --- Screen boundary clamping ---
async function clampToScreen() {
  try {
    const win = getCurrentWindow()
    const monitor = await currentMonitor()
    if (!monitor) return
    const pos = await win.outerPosition()
    const size = await win.outerSize()

    const mPos = monitor.position   // physical pixels
    const mSize = monitor.size      // physical pixels
    // Keep at least 80% of the window visible on screen
    const margin = Math.round(size.width * 0.2)
    const minX = mPos.x - margin
    const minY = mPos.y
    const maxX = mPos.x + mSize.width - size.width + margin
    const maxY = mPos.y + mSize.height - Math.round(size.height * 0.5)

    let x = pos.x
    let y = pos.y
    let needsClamp = false

    if (x < minX) { x = minX; needsClamp = true }
    if (x > maxX) { x = maxX; needsClamp = true }
    if (y < minY) { y = minY; needsClamp = true }
    if (y > maxY) { y = maxY; needsClamp = true }

    if (needsClamp) {
      await win.setPosition(new PhysicalPosition(x, y))
    }
  } catch { /* Not in Tauri */ }
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function onGrabStart() {
  isGrabbing.value = true
  playSound('grab')

  // Remember window position at grab start
  try {
    const pos = await getCurrentWindow().outerPosition()
    grabWindowX = pos.x
    grabWindowY = pos.y
    grabScreenX = 0 // will be set on first move
    grabScreenY = 0
  } catch { /* Not in Tauri */ }

  // Scared reaction + speech
  triggerReaction('hiding', 30000) // long duration, will be cleared on release
  speechText.value = pickRandom(GRAB_PHRASES)
  speechVisible.value = true

  // If held for a while, say more stuff
  grabHoldTimer = setTimeout(() => {
    if (isGrabbing.value) {
      speechText.value = pickRandom(GRAB_HOLDING_PHRASES)
      speechVisible.value = true
    }
  }, 3000)
}

async function onGrabMove(screenX: number, screenY: number) {
  if (!isGrabbing.value) return

  // Track the first move to establish delta baseline
  if (grabScreenX === 0 && grabScreenY === 0) {
    grabScreenX = screenX
    grabScreenY = screenY
    return
  }

  const dx = screenX - grabScreenX
  const dy = screenY - grabScreenY

  try {
    await getCurrentWindow().setPosition(
      new PhysicalPosition(grabWindowX + dx, grabWindowY + dy)
    )
  } catch { /* Not in Tauri */ }
}

async function onGrabEnd() {
  isGrabbing.value = false
  playSound('drop')

  if (grabHoldTimer) {
    clearTimeout(grabHoldTimer)
    grabHoldTimer = null
  }

  // Relief reaction + speech
  speechText.value = pickRandom(GRAB_RELEASE_PHRASES)
  speechVisible.value = true

  // Drop animation: fall down then bounce (using physical pixels since outerPosition returns physical)
  try {
    const win = getCurrentWindow()
    const pos = await win.outerPosition()
    const startX = pos.x
    const startY = pos.y
    let scale = 1.0
    try { scale = await win.scaleFactor() } catch { /* fallback */ }
    const dropDistance = Math.round(80 * scale)   // scale to physical pixels
    const bounceHeight = Math.round(20 * scale)

    // Phase 1: fall down (accelerating)
    const fallDuration = 300
    const fallStart = performance.now()
    await new Promise<void>((resolve) => {
      function step() {
        const elapsed = performance.now() - fallStart
        const progress = Math.min(elapsed / fallDuration, 1)
        const eased = progress * progress
        const currentY = startY + dropDistance * eased
        win.setPosition(new PhysicalPosition(startX, Math.round(currentY))).catch(() => {})
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(step)
    })

    // Phase 2: bounce up
    const bounceUpDuration = 150
    const bounceStart = performance.now()
    const afterDropY = startY + dropDistance
    await new Promise<void>((resolve) => {
      function step() {
        const elapsed = performance.now() - bounceStart
        const progress = Math.min(elapsed / bounceUpDuration, 1)
        const eased = 1 - (1 - progress) * (1 - progress)
        const currentY = afterDropY - bounceHeight * eased
        win.setPosition(new PhysicalPosition(startX, Math.round(currentY))).catch(() => {})
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(step)
    })

    // Phase 3: settle back down
    const settleDuration = 120
    const settleStart = performance.now()
    const bounceTopY = afterDropY - bounceHeight
    await new Promise<void>((resolve) => {
      function step() {
        const elapsed = performance.now() - settleStart
        const progress = Math.min(elapsed / settleDuration, 1)
        const eased = progress * progress
        const currentY = bounceTopY + bounceHeight * eased
        win.setPosition(new PhysicalPosition(startX, Math.round(currentY))).catch(() => {})
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(step)
    })
  } catch { /* Not in Tauri */ }

  await clampToScreen()
  triggerReaction('happy', 2000)
}

// --- Menu actions ---
function onFeedItem(foodId: string) {
  if (useFood(foodId)) {
    const food = getFoodDetails(foodId)
    feedHamster()
    playSound('feed')
    recordFeed()

    if (food?.effect === 'happy') {
      setTimeout(() => triggerHappy(), 3000)
      showToast({ type: 'success', icon: '🎉', title: `仓鼠吃了 ${food.emoji} ${food.name}`, message: '好好吃的蛋糕！🎂' })
    } else if (food?.effect === 'special_happy') {
      setTimeout(() => triggerHappy(), 3000)
      showToast({ type: 'success', icon: '✨', title: `仓鼠吃了 ${food.emoji} ${food.name}`, message: '这是什么神仙美食！太幸福了！✨' })
    } else {
      showToast({ type: 'success', icon: '🎉', title: `仓鼠吃了 ${food?.emoji ?? '🍽️'} ${food?.name ?? foodId}`, message: '看起来很满足~' })
    }
  }
}

function onBuyFood(foodId: string) {
  const food = foods.find(f => f.id === foodId)
  if (!food) return
  if (coins.value < food.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${food.price - coins.value} 金币` })
    return
  }
  if (buyFood(foodId)) {
    showToast({ type: 'success', icon: '🎉', title: `成功购买 ${food.emoji} ${food.name} ×1` })
    playSound('shop')
  }
}

function onBuyGear(gearId: string) {
  const gearMap: Record<string, { price: number; flag: () => void; emoji: string; name: string; unlocks: string }> = {
    tent: { price: 100, flag: () => { hasTent.value = true }, emoji: '⛺', name: '帐篷', unlocks: '森林' },
    scarf: { price: 100, flag: () => { hasScarf.value = true }, emoji: '🧣', name: '围巾', unlocks: '雪山' },
    treasure_map: { price: 150, flag: () => { hasTreasureMap.value = true }, emoji: '🗺️', name: '藏宝图', unlocks: '废弃矿洞' },
    boat_ticket: { price: 180, flag: () => { hasBoatTicket.value = true }, emoji: '🎫', name: '船票', unlocks: '神秘海岛' },
    telescope: { price: 200, flag: () => { hasTelescope.value = true }, emoji: '🔭', name: '望远镜', unlocks: '星空天文台' },
  }

  const gear = gearMap[gearId]
  if (!gear) return
  if (coins.value < gear.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${gear.price - coins.value} 金币` })
    return
  }
  coins.value -= gear.price
  gear.flag()
  showToast({ type: 'success', icon: '🎉', title: `获得 ${gear.emoji} ${gear.name}！`, message: `解锁 ${gear.unlocks}` })
}

function onAddReminder(text: string, opts: {
  type: 'once'
  datetime: number | null
} | {
  type: 'interval'
  startTime: string
  endTime: string
  intervalMinutes: number
  repeatDays: ('workday' | 'weekend')[]
}) {
  addReminder(text, opts)
  showToast({ type: 'success', icon: '📝', title: '备忘已添加', message: text.slice(0, 30) })
}

function onRemoveReminder(id: string) {
  removeReminder(id)
}

function onPomodoroStart() {
  pomodoroStartWork()
  showToast({ type: 'info', icon: '🍅', title: '番茄钟开始！', message: `专注 ${pomodoroWorkDuration.value} 分钟` })
}

function onPomodoroCancel() {
  pomodoroCancel()
  showToast({ type: 'info', icon: '🍅', title: '番茄钟已取消' })
}

function onToggleAlwaysOnTop(value: boolean) {
  settings.value = { ...settings.value, alwaysOnTop: value }
  try { getCurrentWindow().setAlwaysOnTop(value) } catch { /* Not in Tauri */ }
}

function onChangeSize(value: string) {
  settings.value = { ...settings.value, size: value as SettingsData['size'] }
  const scale = sizeScaleMap[value] ?? 1.0
  const w = Math.round(BASE_WIDTH * scale)
  const h = Math.round(BASE_HEIGHT * scale)
  import('@tauri-apps/api/dpi').then(({ LogicalSize }) => {
    getCurrentWindow().setSize(new LogicalSize(w, h))
  }).catch(() => { /* Not in Tauri */ })
}

function onChangeVolume(value: number) {
  settings.value = { ...settings.value, volume: value }
}

function onChangeMuted(value: boolean) {
  settings.value = { ...settings.value, muted: value }
}

function onChangeWeatherCity(value: string) {
  settings.value = { ...settings.value, weatherCity: value }
  if (value.trim()) {
    updateWeather(value)
  }
}

async function shakeWindow() {
  await shakeWindowByHwnd(null)
}

function onTogglePassThrough(value: boolean) {
  settings.value = { ...settings.value, passThrough: value }
  try {
    getCurrentWindow().setIgnoreCursorEvents(value)
    tauriEmit('sync-passthrough', value)
  } catch { /* Not in Tauri */ }
}

async function onToggleAutoStart(value: boolean) {
  settings.value = { ...settings.value, autoStart: value }
  try {
    const { enable, disable } = await import('@tauri-apps/plugin-autostart')
    if (value) await enable()
    else await disable()
  } catch { /* Not in Tauri or plugin not available */ }
}

// --- Adventure integration ---
let adventureTimer: ReturnType<typeof setInterval> | null = null
let reminderTimer: ReturnType<typeof setInterval> | null = null
let pomodoroSyncTimer: ReturnType<typeof setInterval> | null = null
let unlistenSummon: (() => void) | null = null
let unlistenTrayAction: (() => void) | null = null
let unlistenRequestData: (() => void) | null = null
let unlistenMoved: (() => void) | null = null
let unlistenSnackDropped: (() => void) | null = null
// Guards the drop -> walk -> eat -> walk-home sequence. While true,
// additional dropped snacks are ignored (they'll still fall and fade
// out on the overlay's own timer). This keeps pet behavior coherent
// when the user rapid-fires clicks in feeding mode.
let busyWithSnack = false
/**
 * Resolves when the overlay emits snack-landed for the given snack id,
 * or after timeoutMs. Used so the pet waits for the snack to actually
 * settle on the ground before switching to eating state — otherwise
 * fast pets catch up mid-fall and appear to chew empty air.
 */
function waitForSnackLanded(id: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    let unlisten: (() => void) | null = null
    const timer = setTimeout(() => {
      if (done) return
      done = true
      unlisten?.()
      resolve()
    }, timeoutMs)
    listen<{ id: number }>('snack-landed', (event) => {
      if (event.payload.id !== id) return
      if (done) return
      done = true
      clearTimeout(timer)
      unlisten?.()
      resolve()
    }).then((fn) => {
      // If the snack already landed before we registered, the listener
      // never fires; the timeout above covers that case.
      unlisten = fn
      if (done) fn()
    }).catch(() => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    })
  })
}

// Keep the status panel in sync with the pet-side status ref in real
// time. The panel window only sees data we explicitly push via
// syncState; without this watch it only updates when the user
// triggers an action from the panel itself (see handlePanelAction),
// so a feed event fired from the pet window never made it to the
// panel's feedsToday counter. `deep: true` because status is a
// nested object and we care about any field change.
watch(status, () => {
  if (currentOpenPanel.value === 'status') {
    syncState(getPanelData('status'))
  }
}, { deep: true })

watch(currentState, (newState) => {
  if (newState === 'adventure_out' && !isOnAdventure.value) {
    startAdventure({
      adventureTimeReduction: buffValues.value.adventureTimeReduction,
      souvenirChanceBonus: buffValues.value.souvenirChanceBonus,
      adventureCoinBonus: buffValues.value.adventureCoinBonus,
    })
  }
})

function pollAdventure() {
  if (!isOnAdventure.value) return
  const currentLocation = adventureLocation.value
  const rewards = checkAdventureReturn({
    adventureTimeReduction: buffValues.value.adventureTimeReduction,
    souvenirChanceBonus: buffValues.value.souvenirChanceBonus,
    adventureCoinBonus: buffValues.value.adventureCoinBonus,
  })
  if (rewards) {
    setState('adventure_back')
    coins.value += rewards.coins
    recordAdventure()
    recordCoinsEarned(rewards.coins)

    showToast({ type: 'reward', icon: '✨', title: '冒险归来！', message: `获得 ${rewards.coins} 金币` })

    if (rewards.postcard) {
      const locName = currentLocation?.name ?? ''
      setTimeout(() => {
        showToast({ type: 'reward', icon: '📮', title: '收到新明信片！', message: locName ? `${locName} 风景` : undefined })
      }, 500)
    }

    if (rewards.souvenir) {
      const rarityLabel = rewards.souvenir.rarity === 'legendary' ? '传说' : rewards.souvenir.rarity === 'rare' ? '稀有' : '普通'
      setTimeout(() => {
        showToast({ type: 'reward', icon: '🎁', title: '发现纪念品！', message: `${rewards.souvenir!.emoji} ${rewards.souvenir!.name}（${rarityLabel}）` })
      }, rewards.postcard ? 1000 : 500)
    }
  }
}

onMounted(async () => {
  const { offlineMinutes, offlineCoins } = load()

  if (settings.value.alwaysOnTop) {
    try { getCurrentWindow().setAlwaysOnTop(true) } catch { /* Not in Tauri */ }
  }

  // Restore pass-through state
  if (settings.value.passThrough) {
    try {
      getCurrentWindow().setIgnoreCursorEvents(true)
      tauriEmit('sync-passthrough', true)
    } catch { /* Not in Tauri */ }
  }

  // Sync autostart state with actual system state
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    const actual = await isEnabled()
    settings.value = { ...settings.value, autoStart: actual }
  } catch { /* Not in Tauri or plugin not available */ }

  // Apply any user-customized global shortcuts. Rust registered the
  // defaults during setup; here we rebind the ones the user changed
  // (persisted in settings.shortcuts). Failures are silent — the user
  // can re-bind from the About panel if something's off.
  const customShortcuts = settings.value.shortcuts ?? {}
  for (const [id, key] of Object.entries(customShortcuts)) {
    if (DEFAULT_SHORTCUTS[id] && key !== DEFAULT_SHORTCUTS[id]) {
      try {
        await invoke('rebind_shortcut', { id, newAccel: key })
      } catch { /* ignore; default stays active */ }
    }
  }

  if (offlineCoins > 0) {
    showToast({ type: 'info', icon: 'ℹ️', title: `离开了 ${offlineMinutes} 分钟`, message: `获得 ${offlineCoins} 金币` })
  }

  startCoinTimer(() => buffValues.value.coinMultiplier)
  startAutoSave()
  startPeriodicCheck()
  startDecay()

  // Start weather auto-fetch
  startAutoFetch(() => settings.value.weatherCity ?? '')

  // Setup pomodoro callbacks
  pomodoroSetCallbacks({
    onComplete: (coinReward: number) => {
      coins.value += coinReward
      recordCoinsEarned(coinReward)
      showSpeechText(pickRandom(COMPLETE_PHRASES))
      showToast({ type: 'reward', icon: '🍅', title: '番茄完成！', message: `获得 ${coinReward} 金币` })
      playSound('coin')
      triggerHappy()
    },
    onSlackDetected: () => {
      showSpeechText(pickRandom(WORK_SLACKING_PHRASES))
      playSound('notification')
    },
    onEncourage: () => {
      if (Math.random() < 0.3) {
        showSpeechText(pickRandom(WORK_ENCOURAGE_PHRASES))
      }
    },
    onBreakStart: () => {
      showSpeechText(pickRandom(BREAK_PHRASES))
      playSound('notification')
    },
    onBreakEnd: () => {
      showToast({ type: 'info', icon: '☕', title: '休息结束！', message: '准备好下一个番茄了吗？' })
      playSound('notification')
    },
  })
  adventureTimer = setInterval(pollAdventure, 5000)
  reminderTimer = setInterval(() => {
    const due = checkDueReminders()
    for (const r of due) {
      if (r.type === 'once') {
        // Specific-time reminder: slide a real Notepad window in from off-screen
        showSpeechText(`主人，到时间啦：${r.text.slice(0, 20)}`)
        playSound('notification')
        slideNotepadReminder(r.text).then((ok) => {
          if (!ok) {
            // Fallback to original behavior on non-Windows or any failure
            showToast({ type: 'info', icon: '📝', title: '备忘提醒！', message: r.text.slice(0, 50) })
            shakeWindow()
          }
        })
      } else {
        // Interval reminder: shake the user's foreground window and have the pet run over
        alertUserWithPet(`📝 备忘提醒：${r.text}`)
      }
    }
  }, 30000)
  // Clamp after window is moved (e.g. user drags pet off-screen)
  try {
    let moveDebounce: ReturnType<typeof setTimeout> | null = null
    unlistenMoved = await getCurrentWindow().onMoved(() => {
      if (moveDebounce) clearTimeout(moveDebounce)
      moveDebounce = setTimeout(clampToScreen, 500)
    })
  } catch { /* Not in Tauri */ }

  // Sync pomodoro state to panel window every second when running
  pomodoroSyncTimer = setInterval(() => {
    if (pomodoroIsRunning.value && currentOpenPanel.value === 'pomodoro') {
      syncState(getPanelData('pomodoro'))
    }
  }, 1000)
  if (isOnAdventure.value) {
    setState('adventure_out')
  }

  // Setup panel action listener
  setupActionListener(handlePanelAction)

  // Listen for panel:request-data (when user switches tabs in panel)
  try {
    unlistenRequestData = await listen<{ panel: string }>('panel:request-data', (event) => {
      const panel = event.payload.panel
      currentOpenPanel.value = panel
      syncState(getPanelData(panel))
    })
  } catch { /* Not in Tauri */ }

  // Preload panel window in background for instant open
  preloadPanel()

  // Listen for summon-pet event (from tray menu or global shortcut)
  try {
    unlistenSummon = await listen('summon-pet', async () => {
      try {
        const win = getCurrentWindow()
        const cursor = await invoke<{ x: number; y: number } | null>('get_cursor_position')

        // Cancel any ongoing animation so summon always works
        if (isPushing.value) {
          cancelAnimation()
        }
        if (isChasing.value) {
          cancelChase()
        }
        if (isChasing.value) {
          cancelChase()
        }

        await win.show()
        await win.unminimize()
        await win.setFocus()

        if (cursor) {
          playSound('summon')
          // Get DPI scale to compute physical pixel offsets for centering pet on cursor
          let scale = 1.0
          try { scale = await win.scaleFactor() } catch { /* fallback to 1.0 */ }
          const offsetX = 75 * scale  // half pet window width (logical 150/2)
          const offsetY = 85 * scale  // roughly center pet vertically (logical 170/2)
          const targetX = cursor.x - offsetX
          const targetY = cursor.y - offsetY

          // Walk to cursor position with animation. Summon is a
          // user-initiated "come here NOW" gesture, so use a high
          // speed multiplier — the default 1x felt sluggish.
          speechText.value = pickRandom(SUMMON_PHRASES)
          speechVisible.value = true
          await startSummonWalk(targetX, targetY, { speedMultiplier: 3 })
          triggerReaction('happy', 2000)
        } else {
          triggerReaction('happy', 2000)
          speechText.value = pickRandom(SUMMON_PHRASES)
          speechVisible.value = true
        }
      } catch { /* Not in Tauri */ }
    })
  } catch { /* Not in Tauri */ }

  // Listen for tray-action events (from tray menu or global shortcuts)
  try {
    unlistenTrayAction = await listen<string>('tray-action', async (event) => {
      const action = event.payload
      switch (action) {
        case 'feed':
        case 'shop':
        case 'postcard':
        case 'souvenir':
        case 'reminder':
        case 'status':
        case 'pomodoro':
        case 'settings':
        case 'about':
          openPanelFor(action)
          break
        case 'toggle-passthrough':
          onTogglePassThrough(!(settings.value.passThrough ?? false))
          break
        case 'enter-feeding':
          // Ctrl+Shift+E was pressed — pop up the full-screen snack
          // overlay. The overlay captures exactly one mouse click, spawns
          // a falling snack there, and emits 'snack-dropped' back to us.
          feeding.enter()
          break
        case 'quit':
          save()
          // Fully exit so the tray icon goes away too. A plain
          // getCurrentWindow().close() only closes the pet webview and
          // leaves the tray icon dangling.
          try {
            await invoke('quit_app')
          } catch {
            // Not in Tauri / invoke unavailable — fall back to closing
            // just this window.
            try { getCurrentWindow().close() } catch { window.close() }
          }
          break
      }
    })
  } catch { /* Not in Tauri */ }

  // Listen for a snack being dropped by the feeding overlay. With
  // continuous feeding mode (Ctrl+Shift+E → click-click-click → Esc)
  // we no longer gate on hunger — every snack is eaten — but we do
  // serialize: if the pet is already walking to / eating a previous
  // snack, we drop the new event on the floor (the overlay will still
  // fade the snack out on its own timer, so it's just visual confetti).
  try {
    unlistenSnackDropped = await feeding.onSnackDropped(async (ev) => {
      if (busyWithSnack) return
      busyWithSnack = true
      try {
        // Bump the pet window to the very top of the topmost band —
        // the feeding overlay is also alwaysOnTop, and on Windows the
        // last-promoted topmost wins. Flip off → on to force a promote.
        try {
          const win = getCurrentWindow()
          await win.setAlwaysOnTop(false)
          await win.setAlwaysOnTop(true)
        } catch { /* ignore */ }

        let home: [number, number] | null = null
        let petW = 150
        let petH = 170
        try {
          const pos = await getCurrentWindow().outerPosition()
          home = [pos.x, pos.y]
          const size = await getCurrentWindow().outerSize()
          petW = size.width
          petH = size.height
        } catch { /* ignore */ }

        // startSummonWalk moves the pet window's top-left to (x, y).
        // The snack's physX/physY is the snack's *center* in physical
        // pixels. We want the cat's face/paws (roughly the bottom-center
        // of the pet window) to end up on top of the snack, so shift
        // the target by -petW/2 horizontally and -(petH - small offset)
        // vertically. The "~18px from bottom" offset puts the pet's
        // mouth — not its feet — on the snack.
        const MOUTH_FROM_BOTTOM = 18
        const targetX = ev.physX - Math.floor(petW / 2)
        const targetY = ev.physY - (petH - MOUTH_FROM_BOTTOM)

        try {
          await startSummonWalk(targetX, targetY, { speedMultiplier: 2 })
        } catch { /* ignore — walk may be interrupted */ }

        // Pet has reached the spot. If the snack hasn't landed yet
        // (overlay is racing the fall vs. our walk), wait up to 1.5s
        // for the snack-landed event before eating. This prevents the
        // cat from chomping at thin air mid-flight.
        await waitForSnackLanded(ev.id, 1500)

        // Touch = eat: pet just arrived, so consume the snack *now*.
        // feedHamster() switches to the eating sprite; emitting
        // snack-eaten tells the overlay to fade the snack (which it
        // does immediately, not after an artificial 3s delay).
        feedHamster()
        recordFeed()
        tauriEmit('snack-eaten', { id: ev.id }).catch(() => {})

        // Keep the pet parked on-snack for the eating animation — the
        // snack is already disappearing, but the cat still needs time
        // to play the chew frames before walking home.
        await new Promise((r) => setTimeout(r, 2500))
        if (home) {
          try {
            await startSummonWalk(home[0], home[1], { speedMultiplier: 2 })
          } catch { /* ignore */ }
        }
      } finally {
        busyWithSnack = false
      }
    })
  } catch { /* Not in Tauri */ }
})

onUnmounted(() => {
  save()
  stopCoinTimer()
  stopAutoSave()
  stopPeriodicCheck()
  stopDecay()
  cancelAnimation()
  pomodoroDestroy()
  stopAutoFetch()
  destroyActionListener()
  if (adventureTimer) clearInterval(adventureTimer)
  if (reminderTimer) clearInterval(reminderTimer)
  if (pomodoroSyncTimer) clearInterval(pomodoroSyncTimer)
  if (clickTimer) clearTimeout(clickTimer)
  if (chaseWiggleTimer) clearTimeout(chaseWiggleTimer)
  if (unlistenSummon) unlistenSummon()
  if (unlistenTrayAction) unlistenTrayAction()
  if (unlistenRequestData) unlistenRequestData()
  if (unlistenMoved) unlistenMoved()
  if (unlistenSnackDropped) unlistenSnackDropped()
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  background: transparent;
  position: relative;
  overflow: visible;
  cursor: grab;
}

.app-container:active {
  cursor: grabbing;
}

.scene {
  position: absolute;
  inset: 0;
}

.scene-inner {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  padding-bottom: 5px;
}

.info-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.hamster-spacer {
  height: 4px;
  flex-shrink: 0;
}

.hamster-area {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.decoration-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.decoration-img {
  position: absolute;
  pointer-events: none;
  object-fit: contain;
}

.furniture-img {
  position: absolute;
  pointer-events: none;
  object-fit: contain;
}

/* Push animation: hamster leans forward in push direction */
.hamster-pushing {
  animation: push-lean 0.6s ease-in-out infinite alternate;
}

/* Push right: lean right (default) */
.hamster-push-right {
  animation-name: push-lean-right;
}
@keyframes push-lean-right {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-15deg); }
}

/* Push left: face left (flipped) and lean into push */
.hamster-push-left {
  animation-name: push-lean-left;
}
@keyframes push-lean-left {
  0% { transform: scaleX(-1) rotate(0deg); }
  100% { transform: scaleX(-1) rotate(-15deg); }
}

/* Push up: lean backward slightly */
.hamster-push-up {
  animation-name: push-lean-up;
}
@keyframes push-lean-up {
  0% { transform: rotate(0deg); }
  100% { transform: translateY(-5px) rotate(0deg); }
}

/* Push down: lean forward / push down */
.hamster-push-down {
  animation-name: push-lean-down;
}
@keyframes push-lean-down {
  0% { transform: rotate(0deg); }
  100% { transform: translateY(5px) rotate(0deg); }
}

@keyframes push-lean {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-15deg); }
}

/* Walking back: flip horizontally */
.hamster-flipped {
  transform: scaleX(-1);
}
</style>
