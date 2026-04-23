<template>
  <div class="panel-layout">
    <!-- Left tab bar -->
    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: currentPanel === tab.key }"
        :title="tab.label"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
      </button>
    </nav>

    <!-- Right content area -->
    <div class="panel-content" v-if="currentPanel">
      <component
        :is="panelComponent"
        v-bind="panelProps"
        @close="onClose"
        @buy-food="emitAction('buyFood', $event)"
        @buy-gear="emitAction('buyGear', $event)"
        @feed="emitAction('feed', $event)"
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
        @rebind-shortcut="emitAction('rebindShortcut', $event)"
        @reset-shortcut="emitAction('resetShortcut', $event)"
      />
    </div>
    <div v-else class="panel-loading">
      <div class="loading-emoji">🐶</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { listen, emit as tauriEmit } from '@tauri-apps/api/event'
import { emitTo } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import ShopWindow from './components/ShopWindow.vue'
import FeedMenu from './components/FeedMenu.vue'
import PostcardGallery from './components/PostcardGallery.vue'
import SouvenirShelf from './components/SouvenirShelf.vue'
import ReminderPanel from './components/ReminderPanel.vue'
import StatusPanel from './components/StatusPanel.vue'
import PomodoroPanel from './components/PomodoroPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import AboutPanel from './components/AboutPanel.vue'

const tabs = [
  { key: 'shop', icon: '🏪', label: '商店' },
  { key: 'feed', icon: '🍽️', label: '喂食' },
  { key: 'postcard', icon: '📮', label: '明信片' },
  { key: 'souvenir', icon: '🎁', label: '纪念品' },
  { key: 'reminder', icon: '📝', label: '备忘' },
  { key: 'status', icon: '📊', label: '状态' },
  { key: 'pomodoro', icon: '🍅', label: '番茄钟' },
  { key: 'settings', icon: '⚙️', label: '设置' },
  { key: 'about', icon: 'ℹ️', label: '关于' },
]

const panelMap: Record<string, Component> = {
  shop: ShopWindow,
  feed: FeedMenu,
  postcard: PostcardGallery,
  souvenir: SouvenirShelf,
  reminder: ReminderPanel,
  status: StatusPanel,
  pomodoro: PomodoroPanel,
  settings: SettingsPanel,
  about: AboutPanel,
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

function switchTab(panel: string) {
  if (currentPanel.value === panel) return
  currentPanel.value = panel
  // Request fresh data from main window
  try {
    emitTo('main', 'panel:request-data', { panel })
  } catch { /* Not in Tauri */ }
}

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

    // Signal to main window that panel is ready to receive events
    await tauriEmit('panel:ready', {})
  } catch { /* Not in Tauri */ }
})

onUnmounted(() => {
  if (unlistenOpen) unlistenOpen()
  if (unlistenSync) unlistenSync()
})
</script>

<style scoped>
.panel-layout {
  width: 100vw;
  height: 100vh;
  display: flex;
  background: #FFF8F0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.tab-bar {
  width: 48px;
  min-width: 48px;
  background: #FFF0E0;
  border-right: 1px solid #F0D8B8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 2px;
  overflow-y: auto;
}

.tab-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.1s;
}

.tab-btn:hover {
  background: #FFE4C8;
  transform: scale(1.05);
}

.tab-btn.active {
  background: #FFD4A8;
  box-shadow: inset 0 0 0 2px #F0A050;
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.panel-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
