<template>
  <div v-if="isRunning" class="pomodoro-note">
    <div class="note-content">
      <span class="note-icon">{{ phaseEmoji }}</span>
      <span class="note-text">{{ phaseLabel }} {{ displayTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isRunning: boolean
  phaseEmoji: string
  phaseLabel: string
  displayTime: string
}>()
</script>

<style scoped>
.pomodoro-note {
  pointer-events: none;
}

.note-content {
  background: #FFF0F0;
  border: 1px solid #FFB4B4;
  border-radius: 12px;
  padding: 5px 12px;
  box-shadow: 1px 2px 6px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 11px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.note-icon {
  font-size: 13px;
}

.note-text {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
