<template>
  <div class="panel-container" v-if="currentPanel">
    <component
      :is="panelComponent"
      v-bind="panelProps"
      @close="onClose"
      @buy-food="emitAction('buyFood', $event)"
      @buy-decoration="emitAction('buyDecoration', $event)"
      @buy-furniture="emitAction('buyFurniture', $event)"
      @buy-gear="emitAction('buyGear', $event)"
      @feed="emitAction('feed', $event)"
      @toggle-equip="emitAction('toggleEquip', $event)"
      @add="(text: string, opts: any) => emitAction('addReminder', { text, opts })"
      @remove="emitAction('removeReminder', $event)"
      @start="emitAction('pomodoroStart')"
      @cancel="emitAction('pomodoroCancel')"
      @update:work-duration="emitAction('updateWorkDuration', $event)"
      @update:break-duration="emitAction('updateBreakDuration', $event)"
      @update:always-on-top="emitAction('updateAlwaysOnTop', $event)"
      @update:size="emitAction('updateSize', $event)"
      @update:volume="emitAction('updateVolume', $event)"
      @update:muted="emitAction('updateMuted', $event)"
      @update:weather-city="emitAction('updateWeatherCity', $event)"
      @update:pass-through="emitAction('updatePassThrough', $event)"
      @update:auto-start="emitAction('updateAutoStart', $event)"
      @update:activity-reaction-enabled="emitAction('updateActivityReactionEnabled', $event)"
      @update:activity-push-enabled="emitAction('updateActivityPushEnabled', $event)"
      @update:activity-check-interval="emitAction('updateActivityCheckInterval', $event)"
    />
  </div>
  <div v-else class="panel-loading">
    <div class="loading-emoji">🐹</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { emitTo } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import ShopWindow from './components/ShopWindow.vue'
import FeedMenu from './components/FeedMenu.vue'
import PostcardGallery from './components/PostcardGallery.vue'
import SouvenirShelf from './components/SouvenirShelf.vue'
import WardrobePanel from './components/WardrobePanel.vue'
import ReminderPanel from './components/ReminderPanel.vue'
import StatusPanel from './components/StatusPanel.vue'
import PomodoroPanel from './components/PomodoroPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const panelMap: Record<string, Component> = {
  shop: ShopWindow,
  feed: FeedMenu,
  postcard: PostcardGallery,
  souvenir: SouvenirShelf,
  wardrobe: WardrobePanel,
  reminder: ReminderPanel,
  status: StatusPanel,
  pomodoro: PomodoroPanel,
  settings: SettingsPanel,
}

const currentPanel = ref<string | null>(null)
const panelData = ref<Record<string, any>>({})

const panelComponent = computed(() => {
  if (!currentPanel.value) return null
  return panelMap[currentPanel.value] ?? null
})

const panelProps = computed(() => {
  return panelData.value
})

function emitAction(action: string, payload?: any) {
  try {
    emitTo('main', 'panel:action', { action, payload })
  } catch { /* Not in Tauri */ }
}

function onClose() {
  currentPanel.value = null
  try {
    getCurrentWindow().hide()
  } catch {
    window.close()
  }
}

let unlistenOpen: (() => void) | null = null
let unlistenSync: (() => void) | null = null

onMounted(async () => {
  try {
    // Listen for panel open commands
    unlistenOpen = await listen<{ panel: string; data: Record<string, any> }>('panel:open', (event) => {
      currentPanel.value = event.payload.panel
      panelData.value = event.payload.data ?? {}
    })

    // Listen for state sync updates (e.g. pomodoro timer)
    unlistenSync = await listen<Record<string, any>>('panel:sync-state', (event) => {
      panelData.value = { ...panelData.value, ...event.payload }
    })
  } catch { /* Not in Tauri */ }
})

onUnmounted(() => {
  if (unlistenOpen) unlistenOpen()
  if (unlistenSync) unlistenSync()
})
</script>

<style scoped>
.panel-container {
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  background: #FFF8F0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.panel-loading {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF8F0;
}

.loading-emoji {
  font-size: 48px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
