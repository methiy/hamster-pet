<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="status-panel" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="panel-title">📊 仓鼠状态</h2>

        <!-- Mood & Fullness bars -->
        <div class="stat-section">
          <div class="stat-row">
            <span class="stat-label">{{ moodEmoji }} 心情</span>
            <div class="progress-bar">
              <div class="progress-fill mood-fill" :style="{ width: status.mood + '%' }"></div>
            </div>
            <span class="stat-value">{{ status.mood }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">🍖 饱腹</span>
            <div class="progress-bar">
              <div class="progress-fill fullness-fill" :style="{ width: status.fullness + '%' }"></div>
            </div>
            <span class="stat-value">{{ status.fullness }}</span>
          </div>
        </div>

        <!-- Today stats -->
        <div class="stat-section">
          <h3 class="section-title">📅 今日统计</h3>
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-card-value">{{ status.clicksToday }}</div>
              <div class="stat-card-label">点击次数</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">{{ status.feedsToday }}</div>
              <div class="stat-card-label">喂食次数</div>
            </div>
          </div>
        </div>

        <!-- Cumulative stats -->
        <div class="stat-section">
          <h3 class="section-title">🏆 累计成就</h3>
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-card-value">🪙 {{ status.totalCoinsEarned }}</div>
              <div class="stat-card-label">总金币收入</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">🗺️ {{ status.adventuresCompleted }}</div>
              <div class="stat-card-label">冒险完成</div>
            </div>
          </div>
        </div>

        <!-- Mood hint -->
        <div class="mood-hint">
          <span v-if="moodLevel === 'happy'">🥰 仓鼠很开心！继续保持~</span>
          <span v-else-if="moodLevel === 'normal'">😊 仓鼠状态还不错</span>
          <span v-else>😢 仓鼠有点难过...多陪陪它吧</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatusData, MoodLevel } from '../composables/useStatus'

const props = defineProps<{
  status: StatusData
  moodLevel: MoodLevel
}>()

const emit = defineEmits<{
  close: []
}>()

const moodEmoji = computed(() => {
  if (props.moodLevel === 'happy') return '😄'
  if (props.moodLevel === 'normal') return '😊'
  return '😢'
})
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

.status-panel {
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

.stat-section {
  margin-bottom: 14px;
}

.section-title {
  font-size: 14px;
  margin: 0 0 8px;
  font-weight: 600;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.stat-label {
  font-weight: 600;
  width: 60px;
  font-size: 12px;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: rgba(92, 64, 51, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.mood-fill {
  background: linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77);
}

.fullness-fill {
  background: linear-gradient(90deg, #FF9A76, #F2A65A, #6BCB77);
}

.stat-value {
  font-weight: 700;
  font-size: 12px;
  width: 28px;
  text-align: right;
  flex-shrink: 0;
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
  font-size: 18px;
  font-weight: 700;
  color: #5C4033;
}

.stat-card-label {
  font-size: 11px;
  color: #A08060;
  margin-top: 2px;
}

.mood-hint {
  text-align: center;
  padding: 10px;
  background: rgba(92, 64, 51, 0.05);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}
</style>
