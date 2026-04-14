<template>
  <div
    class="app-container"
    @mousedown.left="onDragStart"
    @dblclick="onDoubleClick"
    @contextmenu.prevent="onRightClick"
    @click="closeMenu"
  >
    <HamsterSprite :state="currentState" />

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
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import HamsterSprite from './components/HamsterSprite.vue'
import ContextMenu from './components/ContextMenu.vue'
import { useHamster } from './composables/useHamster'
import { useInventory } from './composables/useInventory'
import { useSave } from './composables/useSave'

const { currentState, triggerHappy, feedHamster } = useHamster()
const { coins, ownedFoods, useFood, startCoinTimer, stopCoinTimer } = useInventory()
const { save, load, startAutoSave, stopAutoSave } = useSave(coins, ownedFoods)

// Context menu
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

function onRightClick(e: MouseEvent) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

function closeMenu() {
  menuVisible.value = false
}

// Drag to move window
async function onDragStart(_e: MouseEvent) {
  if (menuVisible.value) return
  try {
    const tauriWindow = (window as any).__TAURI__
    if (tauriWindow) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().startDragging()
    }
  } catch {
    // Not in Tauri environment, ignore
  }
}

function onDoubleClick() {
  closeMenu()
  triggerHappy()
}

// Menu actions
function onFeed() {
  closeMenu()
  // Try to use the first available food
  if (ownedFoods.value.length > 0) {
    const food = ownedFoods.value[0]
    if (useFood(food.id)) {
      feedHamster()
    }
  } else {
    feedHamster() // free feeding for now
  }
}

function onShop() {
  closeMenu()
  alert(`🏪 商店 — 你有 ${coins.value} 金币\n\n商店功能开发中...`)
}

function onPostcard() {
  closeMenu()
  alert('📮 明信片功能开发中...')
}

function onSouvenir() {
  closeMenu()
  alert('🎁 纪念品功能开发中...')
}

function onSettings() {
  closeMenu()
  alert('⚙️ 设置功能开发中...')
}

async function onQuit() {
  closeMenu()
  save()
  try {
    const tauriWindow = (window as any).__TAURI__
    if (tauriWindow) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    }
  } catch {
    window.close()
  }
}

onMounted(() => {
  load()
  startCoinTimer()
  startAutoSave()
})

onUnmounted(() => {
  save()
  stopCoinTimer()
  stopAutoSave()
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
  cursor: grab;
}

.app-container:active {
  cursor: grabbing;
}
</style>
