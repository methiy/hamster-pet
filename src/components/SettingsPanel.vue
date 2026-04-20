<template>
  <div class="settings-panel" @click.stop>
    <h2 class="settings-title">⚙️ 设置</h2>

        <div class="setting-row">
          <span class="setting-label">🔊 音效</span>
          <label class="toggle">
            <input type="checkbox" :checked="!muted" @change="emit('update:muted', !muted)" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div v-if="!muted" class="setting-row">
          <span class="setting-label">🔉 音量</span>
          <input
            type="range"
            min="0"
            max="100"
            :value="volume"
            class="volume-slider"
            @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div class="setting-row">
          <span class="setting-label">🎯 置顶显示</span>
          <label class="toggle">
            <input type="checkbox" :checked="alwaysOnTop" @change="emit('update:alwaysOnTop', !alwaysOnTop)" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <span class="setting-label">👆 鼠标穿透</span>
          <label class="toggle">
            <input type="checkbox" :checked="passThrough" @change="emit('update:passThrough', !passThrough)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="passThrough" class="setting-hint">右键托盘图标可关闭穿透</div>

        <div class="setting-row">
          <span class="setting-label">📐 大小</span>
          <div class="size-selector">
            <button
              v-for="opt in sizeOptions"
              :key="opt.value"
              class="size-btn"
              :class="{ active: size === opt.value }"
              @click="emit('update:size', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="setting-row city-row">
          <span class="setting-label">🌤️ 天气城市</span>
          <input
            type="text"
            :value="weatherCity"
            class="city-input"
            placeholder="如: Beijing"
            @change="emit('update:weatherCity', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="setting-row">
          <span class="setting-label">🚀 开机自启</span>
          <label class="toggle">
            <input type="checkbox" :checked="autoStart" @change="emit('update:autoStart', !autoStart)" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="section-divider">
          <h3 class="section-label">🐹 互动行为</h3>
        </div>

        <div class="setting-row">
          <span class="setting-label">💬 活动提醒</span>
          <label class="toggle">
            <input type="checkbox" :checked="activityReactionEnabled" @change="emit('update:activityReactionEnabled', !activityReactionEnabled)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-hint">检测到看视频、打游戏等时弹气泡提醒</div>

        <div v-if="activityReactionEnabled" class="setting-row">
          <span class="setting-label">🫸 推窗口/暂停</span>
          <label class="toggle">
            <input type="checkbox" :checked="activityPushEnabled" @change="emit('update:activityPushEnabled', !activityPushEnabled)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="activityReactionEnabled" class="setting-hint">仓鼠会跑去推窗口或帮你暂停视频</div>

        <div v-if="activityReactionEnabled" class="setting-row">
          <span class="setting-label">⏱️ 提醒间隔</span>
          <div class="interval-selector">
            <button
              v-for="opt in intervalOptions"
              :key="opt.value"
              class="size-btn"
              :class="{ active: activityCheckInterval === opt.value }"
              @click="emit('update:activityCheckInterval', opt.value)"
            >
              {{ opt.label }}
            </button>
            <div class="custom-interval-wrap">
              <input
                type="number"
                min="5"
                max="300"
                :value="isCustomInterval ? customIntervalInput : ''"
                :placeholder="isCustomInterval ? '' : '自定义'"
                class="custom-interval-input"
                :class="{ active: isCustomInterval }"
                @focus="customIntervalInput = String(activityCheckInterval)"
                @change="onCustomIntervalChange"
                @input="customIntervalInput = ($event.target as HTMLInputElement).value"
              />
              <span class="custom-interval-unit">秒</span>
            </div>
          </div>
        </div>

        <div class="about-section">
          <div class="about-text">仓鼠宠物 v0.7.0</div>
          <div class="about-heart">❤️</div>
        </div>

        <div class="shortcuts-section">
          <h3 class="shortcuts-title">⌨️ 快捷键</h3>
          <div class="shortcut-row">
            <span class="shortcut-label">📍 召唤宠物</span>
            <kbd class="shortcut-key">Ctrl+Shift+P</kbd>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-label">🍽️ 喂食</span>
            <kbd class="shortcut-key">Ctrl+Shift+F</kbd>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-label">📝 备忘</span>
            <kbd class="shortcut-key">Ctrl+Shift+N</kbd>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-label">🍅 番茄钟</span>
            <kbd class="shortcut-key">Ctrl+Shift+T</kbd>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  alwaysOnTop: boolean
  size: string
  volume: number
  muted: boolean
  weatherCity: string
  passThrough: boolean
  autoStart: boolean
  activityReactionEnabled: boolean
  activityPushEnabled: boolean
  activityCheckInterval: number
}>()

const emit = defineEmits<{
  close: []
  'update:alwaysOnTop': [value: boolean]
  'update:size': [value: string]
  'update:volume': [value: number]
  'update:muted': [value: boolean]
  'update:weatherCity': [value: string]
  'update:passThrough': [value: boolean]
  'update:autoStart': [value: boolean]
  'update:activityReactionEnabled': [value: boolean]
  'update:activityPushEnabled': [value: boolean]
  'update:activityCheckInterval': [value: number]
}>()

const sizeOptions = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

const intervalOptions = [
  { value: 10, label: '10秒' },
  { value: 15, label: '15秒' },
  { value: 30, label: '30秒' },
  { value: 60, label: '1分钟' },
]

const isCustomInterval = computed(() =>
  !intervalOptions.some(opt => opt.value === props.activityCheckInterval)
)

const customIntervalInput = ref('')

watch(() => props.activityCheckInterval, (val) => {
  if (isCustomInterval.value) {
    customIntervalInput.value = String(val)
  }
}, { immediate: true })

function onCustomIntervalChange() {
  const v = parseInt(customIntervalInput.value)
  if (!isNaN(v) && v >= 5 && v <= 300) {
    emit('update:activityCheckInterval', v)
  }
}
</script>

<style scoped>
.settings-panel {
  background: #FFF8F0;
  border-radius: 0;
  padding: 16px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 13px;
}



.settings-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(92, 64, 51, 0.1);
}

.setting-label {
  font-weight: 600;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #ccc;
  border-radius: 22px;
  transition: background 0.2s;
}

.toggle-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle input:checked + .toggle-slider {
  background: #F2A65A;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.size-selector {
  display: flex;
  gap: 4px;
}

.size-btn {
  padding: 4px 12px;
  border: 1px solid rgba(92, 64, 51, 0.2);
  border-radius: 6px;
  background: white;
  color: #5C4033;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.size-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.size-btn:hover:not(.active) {
  background: rgba(242, 166, 90, 0.1);
}

.about-section {
  margin-top: 20px;
  text-align: center;
  padding: 12px;
  background: rgba(92, 64, 51, 0.05);
  border-radius: 8px;
}

.about-text {
  font-size: 13px;
  font-weight: 600;
  color: #5C4033;
}

.about-heart {
  font-size: 18px;
  margin-top: 4px;
}

.volume-slider {
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #F2A65A;
  cursor: pointer;
}

.city-row {
  flex-wrap: wrap;
  gap: 6px;
}

.city-input {
  width: 120px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  color: #5C4033;
  background: white;
}

.city-input:focus {
  outline: none;
  border-color: #F2A65A;
}

.shortcuts-section {
  margin-top: 14px;
  padding: 12px;
  background: rgba(92, 64, 51, 0.05);
  border-radius: 8px;
}

.shortcuts-title {
  font-size: 14px;
  margin: 0 0 8px;
  font-weight: 600;
  text-align: center;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
}

.shortcut-label {
  font-size: 12px;
}

.shortcut-key {
  background: white;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  color: #5C4033;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.setting-hint {
  font-size: 11px;
  color: #B08060;
  padding: 2px 0 6px;
  border-bottom: 1px solid rgba(92, 64, 51, 0.1);
}

.section-divider {
  margin-top: 14px;
  margin-bottom: 4px;
}

.section-label {
  font-size: 14px;
  font-weight: 700;
  color: #5C4033;
  margin: 0;
}

.interval-selector {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.custom-interval-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.custom-interval-input {
  width: 48px;
  padding: 4px 6px;
  border: 1px solid rgba(92, 64, 51, 0.2);
  border-radius: 6px;
  background: white;
  color: #5C4033;
  font-size: 12px;
  text-align: center;
  font-family: inherit;
}

.custom-interval-input:focus {
  outline: none;
  border-color: #F2A65A;
}

.custom-interval-input.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.custom-interval-unit {
  font-size: 11px;
  color: #A08060;
}
</style>
