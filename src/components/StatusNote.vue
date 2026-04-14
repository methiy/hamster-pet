<template>
  <Teleport to="body">
    <div class="status-note">
      <div class="note-content">
        <span class="note-icon">{{ locationEmoji }}</span>
        <span class="note-text">去{{ locationName }}啦~ {{ returnTimeStr }}回</span>
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
  bottom: 210px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4000;
  pointer-events: none;
}

.note-content {
  background: #FFFDE7;
  border: 1px solid #F0E68C;
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
  font-weight: 500;
}
</style>
