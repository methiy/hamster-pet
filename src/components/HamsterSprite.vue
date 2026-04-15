<template>
  <div class="hamster-sprite">
    <canvas ref="canvasRef" :class="animClass"></canvas>
    <div
      class="hit-layer"
      @click="onClick"
      @mousemove="onHover"
      @mouseleave="onLeave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { PixelRenderer } from '../sprites/renderer'
import { decodeFrame } from '../sprites/types'
import { idleAnimation } from '../sprites/frames/idle'
import { eatingAnimation } from '../sprites/frames/eating'
import { sleepingAnimation } from '../sprites/frames/sleeping'
import { runningAnimation } from '../sprites/frames/running'
import { happyAnimation } from '../sprites/frames/happy'
import { hidingAnimation } from '../sprites/frames/hiding'
import { adventureOutAnimation } from '../sprites/frames/adventure-out'
import { adventureBackAnimation } from '../sprites/frames/adventure-back'
import type { AnimationDef, PixelFrame } from '../sprites/types'
import type { BodyRegion } from '../data/hamsterPhrases'

export type SpriteState = 'idle' | 'eating' | 'sleeping' | 'running' | 'hiding' | 'adventure_out' | 'adventure_back' | 'happy'

const props = defineProps<{
  state: SpriteState
}>()

const emit = defineEmits<{
  'region-click': [region: BodyRegion]
  'region-hover': [region: BodyRegion | null]
  'miss-click': [e: MouseEvent]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const animClass = ref('')

let renderer: PixelRenderer | null = null
let animationId: number | null = null
let lastFrameTime = 0
let currentFrameIndex = 0
let decodedFrames: PixelFrame[] = []
let currentAnimation: AnimationDef = idleAnimation

/** Map state names to their AnimationDef */
function getAnimation(state: SpriteState): AnimationDef {
  switch (state) {
    case 'idle': return idleAnimation
    case 'eating': return eatingAnimation
    case 'sleeping': return sleepingAnimation
    case 'running': return runningAnimation
    case 'happy': return happyAnimation
    case 'hiding': return hidingAnimation
    case 'adventure_out': return adventureOutAnimation
    case 'adventure_back': return adventureBackAnimation
  }
}

function startAnimation(anim: AnimationDef): void {
  currentAnimation = anim
  currentFrameIndex = 0
  lastFrameTime = 0
  decodedFrames = anim.frames.map(decodeFrame)

  // Draw first frame immediately
  if (renderer && decodedFrames.length > 0) {
    renderer.drawFrame(decodedFrames[0])
  }
}

function tick(timestamp: number): void {
  if (!renderer || decodedFrames.length === 0) {
    animationId = requestAnimationFrame(tick)
    return
  }

  if (lastFrameTime === 0) {
    lastFrameTime = timestamp
  }

  const frameDuration = 1000 / currentAnimation.fps
  const delta = timestamp - lastFrameTime

  if (delta >= frameDuration) {
    lastFrameTime = timestamp - (delta % frameDuration)

    if (currentAnimation.loop) {
      currentFrameIndex = (currentFrameIndex + 1) % decodedFrames.length
    } else {
      currentFrameIndex = Math.min(currentFrameIndex + 1, decodedFrames.length - 1)
    }

    renderer.drawFrame(decodedFrames[currentFrameIndex])
  }

  animationId = requestAnimationFrame(tick)
}

// ---- Hit detection ----
function getPixelCoords(e: MouseEvent): { x: number; y: number } | null {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * 48)
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * 48)
  if (x < 0 || x >= 48 || y < 0 || y >= 48) return null
  return { x, y }
}

function isHamsterPixel(x: number, y: number): boolean {
  if (!renderer) return false
  return renderer.getPixelAlpha(x, y) > 0
}

function detectRegion(x: number, y: number): BodyRegion {
  if (y <= 10) return 'ear'
  if (y <= 24) return 'head'
  if (y <= 36 && x >= 14 && x <= 34) return 'belly'
  if (y >= 37) return 'paw'
  if (x <= 8 || x >= 40) return 'tail'
  return 'body'
}

function onClick(e: MouseEvent) {
  const coords = getPixelCoords(e)
  if (!coords || !isHamsterPixel(coords.x, coords.y)) {
    // Clicked transparent area — let it propagate for window drag
    emit('miss-click', e)
    return
  }
  // Hit the hamster — stop propagation so window drag doesn't trigger
  e.stopPropagation()
  const region = detectRegion(coords.x, coords.y)
  emit('region-click', region)

  // CSS micro-animation
  const reaction = region === 'belly' || region === 'paw' || region === 'body' ? 'bounce' : 'shake'
  animClass.value = reaction
  setTimeout(() => { animClass.value = '' }, 400)
}

function onHover(e: MouseEvent) {
  const coords = getPixelCoords(e)
  if (!coords || !isHamsterPixel(coords.x, coords.y)) {
    emit('region-hover', null)
    return
  }
  const region = detectRegion(coords.x, coords.y)
  emit('region-hover', region)
}

function onLeave() {
  emit('region-hover', null)
}

watch(() => props.state, (newState) => {
  const anim = getAnimation(newState)
  startAnimation(anim)
})

onMounted(() => {
  if (canvasRef.value) {
    renderer = new PixelRenderer(canvasRef.value)
    startAnimation(getAnimation(props.state))
    animationId = requestAnimationFrame(tick)
  }
})

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
})
</script>

<style scoped>
.hamster-sprite {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.hamster-sprite canvas {
  width: 120px;
  height: 120px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.hit-layer {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

/* Micro-animations */
.shake {
  animation: shake 0.3s ease-in-out;
}

.bounce {
  animation: bounce 0.4s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px) rotate(-2deg); }
  40% { transform: translateX(3px) rotate(2deg); }
  60% { transform: translateX(-2px) rotate(-1deg); }
  80% { transform: translateX(2px) rotate(1deg); }
}

@keyframes bounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.1); }
  50% { transform: scale(0.95); }
  70% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
</style>
