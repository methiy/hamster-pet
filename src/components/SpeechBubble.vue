<template>
  <Transition name="bubble">
    <div v-if="visible" class="speech-bubble">
      {{ text }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  text: string
  visible: boolean
}>()

const emit = defineEmits<{
  hide: []
}>()

let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, (v) => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (v) {
    hideTimer = setTimeout(() => {
      emit('hide')
    }, 3000)
  }
})
</script>

<style scoped>
.speech-bubble {
  position: absolute;
  bottom: 135px;
  left: 50%;
  transform: translateX(-50%);
  background: #FFFDE7;
  color: #5D4037;
  font-size: 13px;
  line-height: 1.4;
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

/* Small triangle pointing down */
.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #FFFDE7;
}

.bubble-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.bubble-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.bubble-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}
</style>
