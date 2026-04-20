<template>
  <div
    class="app-container"
    :class="{ 'work-mode': isWorkMode }"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onRightClick"
    @dblclick="onDoubleClick"
  >
    <!-- Normal mode: full pet view -->
    <SpeechBubble
      v-if="!isWorkMode"
      :text="speechText"
      :visible="speechVisible"
      @hide="speechVisible = false"
    />

    <div v-if="!isWorkMode" class="hamster-area" :class="pushAnimationClasses" :style="hamsterScaleStyle">
      <div class="decoration-layer">
        <img
          v-for="deco in visibleDecorations"
          :key="deco.id"
          class="decoration-img"
          :src="deco.icon"
          :alt="deco.id"
          :style="deco.style"
        />
      </div>

      <img
        v-for="furn in visibleFurniture"
        :key="furn.id"
        class="furniture-img"
        :src="furn.icon"
        :alt="furn.id"
        :style="furn.style"
      />

      <HamsterSprite
        :state="displayState"
        @region-click="onRegionClick"
        @region-hover="onRegionHover"
        @miss-click="onMissClick"
        @grab-start="onGrabStart"
        @grab-move="onGrabMove"
        @grab-end="onGrabEnd"
      />
    </div>

    <!-- Work mode: side-by-side layout -->
    <div v-if="isWorkMode" class="work-layout">
      <div class="work-hamster-area">
        <SpeechBubble
          :text="speechText"
          :visible="speechVisible"
          @hide="speechVisible = false"
        />
        <HamsterSprite
          :state="displayState"
          @region-click="onRegionClick"
          @region-hover="onRegionHover"
          @miss-click="onMissClick"
          @grab-start="onGrabStart"
          @grab-move="onGrabMove"
          @grab-end="onGrabEnd"
        />
      </div>
      <div class="work-game-area">
        <TypingGame
          @close="exitWorkMode"
          @correct="onTypingCorrect"
          @mistake="onTypingMistake"
          @word-complete="onTypingWordComplete"
          @streak="onTypingStreak"
          @idle="onTypingIdle"
          @speech="onTypingSpeech"
        />
      </div>
    </div>

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

    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import HamsterSprite from './components/HamsterSprite.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import StatusNote from './components/StatusNote.vue'
import ToastNotification from './components/ToastNotification.vue'
import TypingGame from './components/TypingGame.vue'
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
import { useAppMode } from './composables/useAppMode'
import { useReminder } from './composables/useReminder'
import { useAudio } from './composables/useAudio'
import { useStatus } from './composables/useStatus'
import { usePomodoro } from './composables/usePomodoro'
import { WORK_ENCOURAGE_PHRASES, WORK_SLACKING_PHRASES, BREAK_PHRASES, COMPLETE_PHRASES } from './data/pomodoroPhrases'
import { useWeather } from './composables/useWeather'
import { usePanelWindow } from './composables/usePanelWindow'
import { WEATHER_PHRASES } from './data/weatherPhrases'
import { CLICK_PHRASES, HOVER_PHRASES, REACTION_MAP, GRAB_PHRASES, GRAB_HOLDING_PHRASES, GRAB_RELEASE_PHRASES } from './data/hamsterPhrases'
import type { BodyRegion } from './data/hamsterPhrases'
import type { ActivityType } from './data/activityPhrases'
import { SUMMON_PHRASES } from './data/activityPhrases'
import { decorations } from './data/decorations'
import { furniture } from './data/furniture'
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
const audioVolumeRef = ref(audioVolume.value)
const audioMutedRef = ref(audioMuted.value)
watch(audioVolume, v => { audioVolumeRef.value = v })
watch(audioMuted, v => { audioMutedRef.value = v })
const { playSound } = useAudio(audioVolumeRef, audioMutedRef)

// --- Core composables ---
const { currentState, displayState, triggerHappy, feedHamster, setState, triggerReaction, pauseAutoTransition, resumeAutoTransition } = useHamster()
const { showToast } = useToast()
const { mode, setMode, initModeListener, destroyModeListener } = useAppMode()
const isWorkMode = computed(() => mode.value === 'work')

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
  ownedDecorations,
  equippedDecorations,
  ownedFurniture,
  buyFood,
  useFood,
  getFoodDetails,
  buyDecoration,
  toggleEquipDecoration,
  buyFurniture,
  startCoinTimer,
  stopCoinTimer,
} = useInventory()

const { buffValues } = useBuff(equippedDecorations, ownedFurniture)

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
  ownedDecorations,
  equippedDecorations,
  ownedFurniture,
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
    clampToScreen()
  },
})

const { resetReacting, startPeriodicCheck, stopPeriodicCheck } = useActivityReaction(
  currentActivity,
  {
    showSpeech: showSpeechText,
    triggerReaction,
    startPush: (activity: ActivityType) => {
      startPush(activity, windowInfo.value?.rect ?? null, windowInfo.value?.process_name)
    },
    startVideoPause: () => {
      startVideoPause(windowInfo.value?.rect ?? null, windowInfo.value?.process_name)
    },
  },
)

// --- Panel window ---
const { openPanel, syncState, setupActionListener, destroyActionListener, currentOpenPanel } = usePanelWindow()

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
        ownedDecorations: ownedDecorations.value,
        ownedFurniture: ownedFurniture.value,
      }
    case 'feed':
      return { ownedFoods: ownedFoods.value }
    case 'postcard':
      return { collectedPostcards: [...collectedPostcards.value] }
    case 'souvenir':
      return { collectedSouvenirs: collectedSouvenirs.value }
    case 'wardrobe':
      return {
        ownedDecorations: ownedDecorations.value,
        equippedDecorations: equippedDecorations.value,
      }
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
      }
    default:
      return {}
  }
}

function handlePanelAction(action: string, payload?: any) {
  switch (action) {
    case 'buyFood': onBuyFood(payload); break
    case 'buyDecoration': onBuyDecoration(payload); break
    case 'buyFurniture': onBuyFurniture(payload); break
    case 'buyGear': onBuyGear(payload); break
    case 'feed': onFeedItem(payload); break
    case 'toggleEquip': onToggleEquip(payload); break
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
  }

  // Sync updated state back to panel after action
  if (currentOpenPanel.value) {
    syncState(getPanelData(currentOpenPanel.value))
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
const sizeScaleMap: Record<string, number> = {
  small: 0.67,
  medium: 1.0,
  large: 1.33,
}

const hamsterScaleStyle = computed(() => {
  const scale = sizeScaleMap[settings.value.size] ?? 1.0
  if (scale === 1.0) return {}
  return { transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'bottom center' }
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

// --- Visible decorations ---
const decoPositionStyles: Record<string, Record<string, string>> = {
  head_top: { position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', width: '24px', height: '24px', pointerEvents: 'none', zIndex: '10' },
  face: { position: 'absolute', top: '35px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', pointerEvents: 'none', zIndex: '10' },
  ear: { position: 'absolute', top: '8px', right: '18px', width: '18px', height: '18px', pointerEvents: 'none', zIndex: '10' },
  neck: { position: 'absolute', top: '55px', left: '50%', transform: 'translateX(-50%)', width: '18px', height: '18px', pointerEvents: 'none', zIndex: '10' },
  back: { position: 'absolute', top: '40px', right: '10px', width: '20px', height: '20px', pointerEvents: 'none', zIndex: '10' },
}

const visibleDecorations = computed(() => {
  return equippedDecorations.value.map(id => {
    const deco = decorations.find(d => d.id === id)
    return {
      id,
      emoji: deco?.emoji ?? '?',
      icon: deco?.icon ?? '',
      style: decoPositionStyles[deco?.slot ?? 'head_top'] ?? {},
    }
  })
})

// --- Visible furniture ---
const furnPositionStyles: Record<string, Record<string, string>> = {
  right: { position: 'absolute', right: '-30px', bottom: '0', width: '32px', height: '32px', pointerEvents: 'none' },
  left: { position: 'absolute', left: '-30px', bottom: '0', width: '32px', height: '32px', pointerEvents: 'none' },
  upper_right: { position: 'absolute', right: '-25px', top: '-10px', width: '28px', height: '28px', pointerEvents: 'none' },
  lower_left: { position: 'absolute', left: '-25px', bottom: '-5px', width: '26px', height: '26px', pointerEvents: 'none' },
  lower_right: { position: 'absolute', right: '-25px', bottom: '-5px', width: '28px', height: '28px', pointerEvents: 'none' },
}

const visibleFurniture = computed(() => {
  return ownedFurniture.value.map(id => {
    const furn = furniture.find(f => f.id === id)
    return {
      id,
      emoji: furn?.emoji ?? '?',
      icon: furn?.icon ?? '',
      style: furnPositionStyles[furn?.position ?? 'right'] ?? {},
    }
  })
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
    const minX = mPos.x
    const minY = mPos.y
    const maxX = mPos.x + mSize.width - Math.round(size.width * 0.3)   // allow 70% off-right
    const maxY = mPos.y + mSize.height - Math.round(size.height * 0.3) // allow 70% off-bottom

    let x = pos.x
    let y = pos.y
    let needsClamp = false

    if (x < minX - Math.round(size.width * 0.7)) { x = minX; needsClamp = true }
    if (x > maxX) { x = maxX; needsClamp = true }
    if (y < minY - Math.round(size.height * 0.3)) { y = minY; needsClamp = true }
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

function onBuyDecoration(decoId: string) {
  const deco = decorations.find(d => d.id === decoId)
  if (!deco) return
  if (coins.value < deco.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${deco.price - coins.value} 金币` })
    return
  }
  if (buyDecoration(decoId)) {
    const buffText = deco.buff
      ? (deco.buff.coinMultiplier ? `金币收入 +${deco.buff.coinMultiplier * 100}%` :
         deco.buff.adventureTimeReduction ? `冒险时间 -${deco.buff.adventureTimeReduction * 100}%` :
         deco.buff.souvenirChanceBonus ? `纪念品概率 +${deco.buff.souvenirChanceBonus * 100}%` :
         deco.buff.adventureCoinBonus ? `冒险金币 +${deco.buff.adventureCoinBonus * 100}%` : '')
      : ''
    showToast({ type: 'success', icon: '🎉', title: `获得 ${deco.emoji} ${deco.name}！`, message: buffText || undefined })
  }
}

function onBuyFurniture(furnId: string) {
  const furn = furniture.find(f => f.id === furnId)
  if (!furn) return
  if (coins.value < furn.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${furn.price - coins.value} 金币` })
    return
  }
  if (buyFurniture(furnId)) {
    showToast({ type: 'success', icon: '🎉', title: `获得 ${furn.emoji} ${furn.name}！`, message: furn.buff ? '属性加成已生效' : undefined })
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

function onToggleEquip(decoId: string) {
  toggleEquipDecoration(decoId)
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

function exitWorkMode() {
  setMode('normal')
  resumeAutoTransition()
  triggerHappy()
}

function onTypingCorrect() {
  triggerReaction('running', 800)
}

function onTypingMistake() {
  triggerReaction('hiding', 800)
}

function onTypingWordComplete(coinReward: number) {
  coins.value += coinReward
  triggerReaction('happy', 1200)
  showToast({ type: 'success', icon: '🪙', title: `+${coinReward} 金币`, message: '打字完成！' })
  playSound('coin')
  recordCoinsEarned(coinReward)
}

function onTypingStreak(streak: number, coinReward: number) {
  coins.value += coinReward
  showToast({ type: 'reward', icon: '🔥', title: `${streak} 连击！`, message: `+${coinReward} 金币奖励` })
}

function onTypingIdle() {
  triggerReaction('sleeping', 2000)
}

function onTypingSpeech(text: string) {
  speechText.value = text
  speechVisible.value = true
}

function onToggleAlwaysOnTop(value: boolean) {
  settings.value = { ...settings.value, alwaysOnTop: value }
  try { getCurrentWindow().setAlwaysOnTop(value) } catch { /* Not in Tauri */ }
}

function onChangeSize(value: string) {
  settings.value = { ...settings.value, size: value as SettingsData['size'] }
  const sizeMap: Record<string, [number, number]> = {
    small: [160, 180],
    medium: [240, 260],
    large: [320, 340],
  }
  const dims = sizeMap[value]
  if (dims) {
    import('@tauri-apps/api/dpi').then(({ LogicalSize }) => {
      getCurrentWindow().setSize(new LogicalSize(dims[0], dims[1]))
    }).catch(() => { /* Not in Tauri */ })
  }
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

function onTogglePassThrough(value: boolean) {
  settings.value = { ...settings.value, passThrough: value }
  try {
    getCurrentWindow().setIgnoreCursorEvents(value)
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

// --- Mode change watcher ---
watch(mode, (newMode) => {
  if (newMode === 'work') {
    pauseAutoTransition()
    setState('typing')
  } else {
    resumeAutoTransition()
    triggerHappy()
  }
})

// --- Adventure integration ---
let adventureTimer: ReturnType<typeof setInterval> | null = null
let reminderTimer: ReturnType<typeof setInterval> | null = null
let boundsTimer: ReturnType<typeof setInterval> | null = null
let pomodoroSyncTimer: ReturnType<typeof setInterval> | null = null
let unlistenSummon: (() => void) | null = null
let unlistenTrayAction: (() => void) | null = null

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
    try { getCurrentWindow().setIgnoreCursorEvents(true) } catch { /* Not in Tauri */ }
  }

  // Sync autostart state with actual system state
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    const actual = await isEnabled()
    settings.value = { ...settings.value, autoStart: actual }
  } catch { /* Not in Tauri or plugin not available */ }

  if (offlineCoins > 0) {
    showToast({ type: 'info', icon: 'ℹ️', title: `离开了 ${offlineMinutes} 分钟`, message: `获得 ${offlineCoins} 金币` })
  }

  startCoinTimer(() => buffValues.value.coinMultiplier)
  startAutoSave()
  startPeriodicCheck()
  startDecay()
  initModeListener()

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
      showSpeechText(`📝 备忘提醒：${r.text}`)
      showToast({ type: 'info', icon: '📝', title: '备忘提醒！', message: r.text.slice(0, 50) })
      playSound('notification')
    }
  }, 30000)
  boundsTimer = setInterval(clampToScreen, 10000) // check every 10s
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

        await win.show()
        await win.unminimize()
        await win.setFocus()

        if (cursor) {
          playSound('summon')
          // Get DPI scale to compute physical pixel offsets for centering pet on cursor
          let scale = 1.0
          try { scale = await win.scaleFactor() } catch { /* fallback to 1.0 */ }
          const offsetX = 125 * scale  // half pet window width (logical 250/2)
          const offsetY = 150 * scale  // roughly center pet vertically
          const targetX = cursor.x - offsetX
          const targetY = cursor.y - offsetY

          // Walk to cursor position with animation
          speechText.value = pickRandom(SUMMON_PHRASES)
          speechVisible.value = true
          await startSummonWalk(targetX, targetY)
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
    unlistenTrayAction = await listen<string>('tray-action', (event) => {
      const action = event.payload
      switch (action) {
        case 'feed':
        case 'shop':
        case 'postcard':
        case 'souvenir':
        case 'wardrobe':
        case 'reminder':
        case 'status':
        case 'pomodoro':
        case 'settings':
          openPanelFor(action)
          break
        case 'toggle-passthrough':
          onTogglePassThrough(!(settings.value.passThrough ?? false))
          break
        case 'quit':
          save()
          try { getCurrentWindow().close() } catch { window.close() }
          break
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
  destroyModeListener()
  cancelAnimation()
  pomodoroDestroy()
  stopAutoFetch()
  destroyActionListener()
  if (adventureTimer) clearInterval(adventureTimer)
  if (reminderTimer) clearInterval(reminderTimer)
  if (boundsTimer) clearInterval(boundsTimer)
  if (pomodoroSyncTimer) clearInterval(pomodoroSyncTimer)
  if (clickTimer) clearTimeout(clickTimer)
  if (unlistenSummon) unlistenSummon()
  if (unlistenTrayAction) unlistenTrayAction()
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

.app-container.work-mode {
  background: rgba(255, 248, 240, 0.95);
  border-radius: 12px;
  cursor: default;
  overflow: hidden;
}

.app-container.work-mode:active {
  cursor: default;
}

.hamster-area {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
}

/* Work mode layout */
.work-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.work-hamster-area {
  width: 140px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 252, 245, 0.5);
}

.work-game-area {
  flex: 1;
  min-width: 0;
  overflow: hidden;
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
  0% { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) rotate(-15deg); }
}

/* Push left: face left (flipped) and lean into push */
.hamster-push-left {
  animation-name: push-lean-left;
}
@keyframes push-lean-left {
  0% { transform: translateX(-50%) scaleX(-1) rotate(0deg); }
  100% { transform: translateX(-50%) scaleX(-1) rotate(-15deg); }
}

/* Push up: lean backward slightly */
.hamster-push-up {
  animation-name: push-lean-up;
}
@keyframes push-lean-up {
  0% { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) translateY(-5px) rotate(0deg); }
}

/* Push down: lean forward / push down */
.hamster-push-down {
  animation-name: push-lean-down;
}
@keyframes push-lean-down {
  0% { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) translateY(5px) rotate(0deg); }
}

@keyframes push-lean {
  0% { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) rotate(-15deg); }
}

/* Walking back: flip horizontally */
.hamster-flipped {
  transform: translateX(-50%) scaleX(-1);
}
</style>
