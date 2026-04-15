<template>
  <Teleport to="body">
    <div v-if="visible" class="card3d-overlay" @click="emit('close')" @contextmenu.prevent="emit('close')">
      <div
        class="card3d-container"
        @click.stop="emit('close')"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        @mouseenter="onMouseEnter"
        :style="cardStyle"
      >
        <div class="card3d-content">
          <slot />
        </div>
        <div class="card3d-shine" :style="shineStyle"></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const maxTilt = 15
const rotateX = ref(0)
const rotateY = ref(0)
const shineX = ref(50)
const shineY = ref(50)
const isHovering = ref(false)

function onMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  const normalX = (x - 0.5) * 2
  const normalY = (y - 0.5) * 2

  rotateY.value = normalX * maxTilt
  rotateX.value = -normalY * maxTilt
  shineX.value = x * 100
  shineY.value = y * 100
  isHovering.value = true
}

function onMouseLeave() {
  rotateX.value = 0
  rotateY.value = 0
  shineX.value = 50
  shineY.value = 50
  isHovering.value = false
}

function onMouseEnter() {
  isHovering.value = true
}

const cardStyle = computed(() => ({
  transform: `perspective(800px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg) scale(${isHovering.value ? 1.05 : 1})`,
}))

const shineStyle = computed(() => ({
  background: `radial-gradient(circle at ${shineX.value}% ${shineY.value}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
}))
</script>

<style scoped>
.card3d-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6000;
}

.card3d-container {
  transform-style: preserve-3d;
  transition: transform 0.15s ease-out;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  background: white;
}

.card3d-content {
  position: relative;
  z-index: 1;
}

.card3d-shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: overlay;
  border-radius: 12px;
  z-index: 2;
}
</style>
