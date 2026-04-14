<template>
  <Teleport to="body">
    <div class="status-note">
      <div class="note-content">
        <div class="note-title">仓仓出门啦！</div>
        <div class="note-location">{{ locationEmoji }} {{ locationName }}</div>
        <div class="note-time">预计回来时间: {{ returnTimeStr }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  locationEmoji: string
  locationName: string
  endTime: number
}>()

const returnTimeStr = computed(() => {
  const d = new Date(props.endTime)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
})
</script>

<style scoped>
.status-note {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  z-index: 4000;
  pointer-events: none;
}

.note-content {
  background: #FFFDE7;
  border: 1px solid #F0E68C;
  border-radius: 4px;
  padding: 10px 16px;
  box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  min-width: 140px;
  text-align: center;
}

.note-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}

.note-location {
  font-size: 14px;
  margin-bottom: 4px;
}

.note-time {
  font-size: 11px;
  color: #999;
}
</style>
