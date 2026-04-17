<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="pomodoro-panel" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="panel-title">🍅 番茄钟</h2>

        <div v-if="!isRunning" class="setup-section">
          <!-- Work duration -->
          <div class="setting-row">
            <span class="setting-label">⏱️ 工作时长</span>
            <div class="duration-selector">
              <button
                v-for="opt in workOptions"
                :key="opt"
                class="dur-btn"
                :class="{ active: workDuration === opt }"
                @click="emit('update:workDuration', opt)"
              >
                {{ opt }}分钟
              </button>
            </div>
          </div>

          <!-- Break duration -->
          <div class="setting-row">
            <span class="setting-label">☕ 休息时长</span>
            <div class="duration-selector">
              <button
                v-for="opt in breakOptions"
                :key="opt"
                class="dur-btn"
                :class="{ active: breakDuration === opt }"
                @click="emit('update:breakDuration', opt)"
              >
                {{ opt }}分钟
              </button>
            </div>
          </div>

          <button class="start-btn" @click="emit('start')">
            🍅 开始专注
          </button>
        </div>

        <div v-else class="running-section">
          <div class="timer-display">
            <div class="phase-label">{{ phaseEmoji }} {{ phaseLabel }}</div>
            <div class="timer-time">{{ displayTime }}</div>
          </div>
          <button class="cancel-btn" @click="emit('cancel')">
            取消
          </button>
        </div>

        <!-- Stats -->
        <div class="stats-section">
          <h3 class="section-title">📈 统计</h3>
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-card-value">🍅 {{ stats.todayPomodoros }}</div>
              <div class="stat-card-label">今日番茄</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">🍅 {{ stats.totalPomodoros }}</div>
              <div class="stat-card-label">总计番茄</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">⏱️ {{ stats.totalMinutes }}</div>
              <div class="stat-card-label">总分钟数</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">🪙 {{ stats.totalMinutes }}</div>
              <div class="stat-card-label">获得金币</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PomodoroStats } from '../composables/usePomodoro'

defineProps<{
  isRunning: boolean
  workDuration: number
  breakDuration: number
  displayTime: string
  phaseEmoji: string
  phaseLabel: string
  stats: PomodoroStats
}>()

const emit = defineEmits<{
  close: []
  start: []
  cancel: []
  'update:workDuration': [value: number]
  'update:breakDuration': [value: number]
}>()

const workOptions = [25, 30, 45]
const breakOptions = [5, 10]
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.pomodoro-panel {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 340px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 13px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
}

.panel-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.setting-row {
  margin-bottom: 12px;
}

.setting-label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 13px;
}

.duration-selector {
  display: flex;
  gap: 6px;
}

.dur-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid rgba(92, 64, 51, 0.2);
  border-radius: 8px;
  background: white;
  color: #5C4033;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.dur-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.dur-btn:hover:not(.active) {
  background: rgba(242, 166, 90, 0.1);
}

.start-btn {
  width: 100%;
  padding: 12px;
  background: #E74C3C;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
}

.start-btn:hover {
  background: #C0392B;
}

.running-section {
  text-align: center;
  padding: 16px 0;
}

.timer-display {
  margin-bottom: 12px;
}

.phase-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.timer-time {
  font-size: 48px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #E74C3C;
}

.cancel-btn {
  padding: 8px 24px;
  background: rgba(92, 64, 51, 0.1);
  border: none;
  border-radius: 8px;
  color: #5C4033;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: rgba(92, 64, 51, 0.2);
}

.stats-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(92, 64, 51, 0.1);
}

.section-title {
  font-size: 14px;
  margin: 0 0 8px;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  border: 1px solid rgba(92, 64, 51, 0.08);
}

.stat-card-value {
  font-size: 16px;
  font-weight: 700;
}

.stat-card-label {
  font-size: 11px;
  color: #A08060;
  margin-top: 2px;
}
</style>
