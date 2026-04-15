<template>
  <div
    class="app-container"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onRightClick"
    @dblclick="onDoubleClick"
  >
    <!-- Hamster sits at bottom center of a larger transparent window -->
    <div class="hamster-area">
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
      />
    </div>

    <ContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      @feed="onFeed"
      @shop="onShop"
      @postcard="onPostcard"
      @souvenir="onSouvenir"
      @settings="onSettings"
      @quit="onQuit"
      @close="closeMenu"
    />

    <!-- Status note when on adventure -->
    <StatusNote
      v-if="isOnAdventure && adventureLocation && adventureEndTime"
      :location-emoji="adventureLocation.emoji"
      :location-name="adventureLocation.name"
      :end-time="adventureEndTime"
    />

    <!-- Popups -->
    <ShopWindow
      v-if="showShop"
      :coins="coins"
      :has-tent="hasTent"
      :has-scarf="hasScarf"
      @close="showShop = false"
      @buy-food="onBuyFood"
      @buy-tent="onBuyTent"
      @buy-scarf="onBuyScarf"
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

    <SettingsPanel
      v-if="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import HamsterSprite from './components/HamsterSprite.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import ContextMenu from './components/ContextMenu.vue'
import StatusNote from './components/StatusNote.vue'
import ShopWindow from './components/ShopWindow.vue'
import FeedMenu from './components/FeedMenu.vue'
import PostcardGallery from './components/PostcardGallery.vue'
import SouvenirShelf from './components/SouvenirShelf.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useHamster } from './composables/useHamster'
import { useInventory } from './composables/useInventory'
import { useAdventure } from './composables/useAdventure'
import { useSave } from './composables/useSave'
import { CLICK_PHRASES, HOVER_PHRASES, REACTION_MAP } from './data/hamsterPhrases'
import type { BodyRegion } from './data/hamsterPhrases'

const { currentState, displayState, triggerHappy, feedHamster, setState, triggerReaction } = useHamster()
const { coins, ownedFoods, buyFood, useFood, startCoinTimer, stopCoinTimer } = useInventory()
const {
  isOnAdventure,
  adventureLocation,
  adventureEndTime,
  collectedPostcards,
  collectedSouvenirs,
  hasTent,
  hasScarf,
  startAdventure,
  checkAdventureReturn,
  getAdventureData,
  loadAdventureData,
} = useAdventure()

const { save, load, startAutoSave, stopAutoSave } = useSave(coins, ownedFoods, {
  getAdventureData,
  loadAdventureData,
})

// Context menu
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

// Popup states
const showShop = ref(false)
const showFeed = ref(false)
const showPostcards = ref(false)
const showSouvenirs = ref(false)
const showSettings = ref(false)

// Speech bubble
const speechText = ref('')
const speechVisible = ref(false)

// Hover cooldown
let lastHoverSpeechTime = 0

// Any popup open?
const anyPopupOpen = computed(() =>
  showShop.value || showFeed.value || showPostcards.value || showSouvenirs.value || showSettings.value
)

// Click debounce: distinguish single click from double click
let clickTimer: ReturnType<typeof setTimeout> | null = null
let pendingRegion: BodyRegion | null = null

// Drag: only on left click, and not when menu/popup is open
function onMouseDown(e: MouseEvent) {
  // Only left button (button === 0), skip right click
  if (e.button !== 0) return
  if (menuVisible.value || anyPopupOpen.value) return
  try {
    getCurrentWindow().startDragging()
  } catch {
    // Not in Tauri
  }
}

/** Called when click misses hamster pixels — start window drag */
function onMissClick(_e: MouseEvent) {
  if (menuVisible.value || anyPopupOpen.value) return
  try {
    getCurrentWindow().startDragging()
  } catch {
    // Not in Tauri
  }
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
  // Cancel pending single-click
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    pendingRegion = null
  }
  closeMenu()
  triggerHappy()
}

// Interaction: region click with 250ms debounce to avoid conflict with dblclick
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
  // Show speech bubble with random phrase
  const phrases = CLICK_PHRASES[region]
  speechText.value = phrases[Math.floor(Math.random() * phrases.length)]
  speechVisible.value = true

  // Trigger reaction animation
  const reaction = REACTION_MAP[region]
  triggerReaction(reaction.state, reaction.duration)
}

// Interaction: region hover with cooldown + probability
function onRegionHover(region: BodyRegion | null) {
  if (!region) return
  const now = Date.now()
  if (now - lastHoverSpeechTime < 5000) return // 5s cooldown
  if (Math.random() > 0.3) return // 30% chance
  lastHoverSpeechTime = now
  speechText.value = HOVER_PHRASES[Math.floor(Math.random() * HOVER_PHRASES.length)]
  speechVisible.value = true
}

// Menu actions
function onFeed() {
  closeMenu()
  showFeed.value = true
}

function onFeedItem(foodId: string) {
  if (useFood(foodId)) {
    feedHamster()
  }
  showFeed.value = false
}

function onShop() {
  closeMenu()
  showShop.value = true
}

function onBuyFood(foodId: string) {
  buyFood(foodId)
}

function onBuyTent() {
  if (coins.value >= 100) {
    coins.value -= 100
    hasTent.value = true
  }
}

function onBuyScarf() {
  if (coins.value >= 100) {
    coins.value -= 100
    hasScarf.value = true
  }
}

function onPostcard() {
  closeMenu()
  showPostcards.value = true
}

function onSouvenir() {
  closeMenu()
  showSouvenirs.value = true
}

function onSettings() {
  closeMenu()
  showSettings.value = true
}

async function onQuit() {
  closeMenu()
  save()
  try {
    await getCurrentWindow().close()
  } catch {
    window.close()
  }
}

// Adventure integration
let adventureTimer: ReturnType<typeof setInterval> | null = null

watch(currentState, (newState) => {
  if (newState === 'adventure_out' && !isOnAdventure.value) {
    startAdventure()
  }
})

function pollAdventure() {
  if (!isOnAdventure.value) return
  const rewards = checkAdventureReturn()
  if (rewards) {
    setState('adventure_back')
    coins.value += rewards.coins
  }
}

onMounted(() => {
  load()
  startCoinTimer()
  startAutoSave()
  adventureTimer = setInterval(pollAdventure, 5000)
  if (isOnAdventure.value) {
    setState('adventure_out')
  }
})

onUnmounted(() => {
  save()
  stopCoinTimer()
  stopAutoSave()
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

/* Hamster sits at bottom center of the window */
.hamster-area {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
}
</style>
