<template>
  <div
    class="app-container"
    @contextmenu.prevent="onRightClick"
  >
    <!-- Drag region: only the hamster area is draggable -->
    <div
      class="hamster-drag-region"
      data-tauri-drag-region
      @dblclick="onDoubleClick"
    >
      <HamsterSprite :state="currentState" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import HamsterSprite from './components/HamsterSprite.vue'
import ContextMenu from './components/ContextMenu.vue'
import StatusNote from './components/StatusNote.vue'
import ShopWindow from './components/ShopWindow.vue'
import FeedMenu from './components/FeedMenu.vue'
import PostcardGallery from './components/PostcardGallery.vue'
import SouvenirShelf from './components/SouvenirShelf.vue'
import { useHamster } from './composables/useHamster'
import { useInventory } from './composables/useInventory'
import { useAdventure } from './composables/useAdventure'
import { useSave } from './composables/useSave'

const { currentState, triggerHappy, feedHamster, setState } = useHamster()
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

const NORMAL_SIZE = 250
const EXPANDED_SIZE = 500

async function resizeWindow(size: number) {
  try {
    const win = getCurrentWindow()
    await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(size, size))
  } catch {
    // Not in Tauri
  }
}

async function onRightClick(e: MouseEvent) {
  // Expand window so menu doesn't get clipped
  await resizeWindow(EXPANDED_SIZE)
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

async function closeMenu() {
  if (!menuVisible.value) return
  menuVisible.value = false
  // Shrink back after a short delay
  setTimeout(() => resizeWindow(NORMAL_SIZE), 100)
}

function onDoubleClick() {
  closeMenu()
  triggerHappy()
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
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  position: relative;
  overflow: visible;
}

.hamster-drag-region {
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hamster-drag-region:active {
  cursor: grabbing;
}
</style>
