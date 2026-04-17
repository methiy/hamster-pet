<template>
  <div
    class="app-container"
    :class="{ 'work-mode': isWorkMode }"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onRightClick"
    @dblclick="onDoubleClick"
  >
    <!-- Normal mode: full pet view -->
    <div v-if="!isWorkMode" class="hamster-area" :class="pushAnimationClasses" :style="hamsterScaleStyle">
      <SpeechBubble
        :text="speechText"
        :visible="speechVisible"
        @hide="speechVisible = false"
      />

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

    <ContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      @feed="onFeed"
      @shop="onShop"
      @postcard="onPostcard"
      @souvenir="onSouvenir"
      @wardrobe="onWardrobe"
      @typing="onTypingMode"
      @settings="onSettings"
      @quit="onQuit"
      @close="closeMenu"
    />

    <StatusNote
      v-if="isOnAdventure && adventureLocation && adventureEndTime"
      :location-emoji="adventureLocation.emoji"
      :location-name="adventureLocation.name"
      :end-time="adventureEndTime"
    />

    <ShopWindow
      v-if="showShop"
      :coins="coins"
      :has-tent="hasTent"
      :has-scarf="hasScarf"
      :has-treasure-map="hasTreasureMap"
      :has-boat-ticket="hasBoatTicket"
      :has-telescope="hasTelescope"
      :owned-decorations="ownedDecorations"
      :owned-furniture="ownedFurniture"
      @close="showShop = false"
      @buy-food="onBuyFood"
      @buy-decoration="onBuyDecoration"
      @buy-furniture="onBuyFurniture"
      @buy-gear="onBuyGear"
    />

    <FeedMenu
      v-if="showFeed"
      :owned-foods="ownedFoods"
      @close="showFeed = false"
      @feed="onFeedItem"
    />

    <PostcardGallery
      v-if="showPostcards"
      :collected-postcards="collectedPostcards"
      @close="showPostcards = false"
    />

    <SouvenirShelf
      v-if="showSouvenirs"
      :collected-souvenirs="collectedSouvenirs"
      @close="showSouvenirs = false"
    />

    <WardrobePanel
      v-if="showWardrobe"
      :owned-decorations="ownedDecorations"
      :equipped-decorations="equippedDecorations"
      @close="showWardrobe = false"
      @toggle-equip="onToggleEquip"
    />

    <SettingsPanel
      v-if="showSettings"
      :always-on-top="settings.alwaysOnTop"
      :size="settings.size"
      @close="showSettings = false"
      @update:always-on-top="onToggleAlwaysOnTop"
      @update:size="onChangeSize"
    />

    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalPosition } from '@tauri-apps/api/dpi'
import HamsterSprite from './components/HamsterSprite.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import ContextMenu from './components/ContextMenu.vue'
import StatusNote from './components/StatusNote.vue'
import ShopWindow from './components/ShopWindow.vue'
import FeedMenu from './components/FeedMenu.vue'
import PostcardGallery from './components/PostcardGallery.vue'
import SouvenirShelf from './components/SouvenirShelf.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ToastNotification from './components/ToastNotification.vue'
import WardrobePanel from './components/WardrobePanel.vue'
import TypingGame from './components/TypingGame.vue'
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
import { CLICK_PHRASES, HOVER_PHRASES, REACTION_MAP, GRAB_PHRASES, GRAB_HOLDING_PHRASES, GRAB_RELEASE_PHRASES } from './data/hamsterPhrases'
import type { BodyRegion } from './data/hamsterPhrases'
import type { ActivityType } from './data/activityPhrases'
import { decorations } from './data/decorations'
import { furniture } from './data/furniture'
import { foods } from './data/foods'

// --- Settings ---
const settings = ref<SettingsData>({
  alwaysOnTop: false,
  size: 'medium',
})

// --- Core composables ---
const { currentState, displayState, triggerHappy, feedHamster, setState, triggerReaction, pauseAutoTransition, resumeAutoTransition } = useHamster()
const { showToast } = useToast()
const { mode, setMode, initModeListener, destroyModeListener } = useAppMode()
const isWorkMode = computed(() => mode.value === 'work')

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
})

// --- Activity sensing & reaction ---
const { currentActivity, windowInfo } = useActivitySensor()

function showSpeechText(text: string) {
  speechText.value = text
  speechVisible.value = true
}

const { isPushing, isWalking, isWalkingBack, pushDirection, startPush, cancelAnimation } = usePushAnimation({
  showSpeech: showSpeechText,
  triggerReaction,
  onComplete: () => {
    resetReacting()
  },
})

const { resetReacting, startPeriodicCheck, stopPeriodicCheck } = useActivityReaction(
  currentActivity,
  {
    showSpeech: showSpeechText,
    triggerReaction,
    startPush: (activity: ActivityType) => {
      startPush(activity, windowInfo.value?.rect ?? null)
    },
  },
)

// --- Context menu ---
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

// --- Popup states ---
const showShop = ref(false)
const showFeed = ref(false)
const showPostcards = ref(false)
const showSouvenirs = ref(false)
const showSettings = ref(false)
const showWardrobe = ref(false)

// --- Speech bubble ---
const speechText = ref('')
const speechVisible = ref(false)

// --- Hover cooldown ---
let lastHoverSpeechTime = 0

// --- Any popup open ---
const anyPopupOpen = computed(() =>
  showShop.value || showFeed.value || showPostcards.value ||
  showSouvenirs.value || showSettings.value || showWardrobe.value
)

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
  if (menuVisible.value || anyPopupOpen.value) return
  try { getCurrentWindow().startDragging() } catch { /* Not in Tauri */ }
}

function onMissClick(_e: MouseEvent) {
  if (menuVisible.value || anyPopupOpen.value) return
  try { getCurrentWindow().startDragging() } catch { /* Not in Tauri */ }
}

function onRightClick(e: MouseEvent) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

function closeMenu() {
  menuVisible.value = false
}

function onDoubleClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    pendingRegion = null
  }
  closeMenu()
  triggerHappy()
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

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function onGrabStart() {
  isGrabbing.value = true

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
      new LogicalPosition(grabWindowX + dx, grabWindowY + dy)
    )
  } catch { /* Not in Tauri */ }
}

function onGrabEnd() {
  isGrabbing.value = false

  if (grabHoldTimer) {
    clearTimeout(grabHoldTimer)
    grabHoldTimer = null
  }

  // Relief reaction + speech
  triggerReaction('happy', 2000)
  speechText.value = pickRandom(GRAB_RELEASE_PHRASES)
  speechVisible.value = true
}

// --- Menu actions ---
function onFeed() {
  closeMenu()
  showFeed.value = true
}

function onFeedItem(foodId: string) {
  if (useFood(foodId)) {
    const food = getFoodDetails(foodId)
    feedHamster()

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
  showFeed.value = false
}

function onShop() {
  closeMenu()
  showShop.value = true
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

function onPostcard() {
  closeMenu()
  showPostcards.value = true
}

function onSouvenir() {
  closeMenu()
  showSouvenirs.value = true
}

function onWardrobe() {
  closeMenu()
  showWardrobe.value = true
}

function onTypingMode() {
  closeMenu()
  setMode('work')
  pauseAutoTransition()
  setState('typing')
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

function onSettings() {
  closeMenu()
  showSettings.value = true
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

async function onQuit() {
  closeMenu()
  save()
  try { await getCurrentWindow().close() } catch { window.close() }
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

onMounted(() => {
  const { offlineMinutes, offlineCoins } = load()

  if (settings.value.alwaysOnTop) {
    try { getCurrentWindow().setAlwaysOnTop(true) } catch { /* Not in Tauri */ }
  }

  if (offlineCoins > 0) {
    showToast({ type: 'info', icon: 'ℹ️', title: `离开了 ${offlineMinutes} 分钟`, message: `获得 ${offlineCoins} 金币` })
  }

  startCoinTimer(() => buffValues.value.coinMultiplier)
  startAutoSave()
  startPeriodicCheck()
  initModeListener()
  adventureTimer = setInterval(pollAdventure, 5000)
  if (isOnAdventure.value) {
    setState('adventure_out')
  }
})

onUnmounted(() => {
  save()
  stopCoinTimer()
  stopAutoSave()
  stopPeriodicCheck()
  destroyModeListener()
  cancelAnimation()
  if (adventureTimer) clearInterval(adventureTimer)
  if (clickTimer) clearTimeout(clickTimer)
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
