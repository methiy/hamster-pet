<template>
  <div class="hamster-sprite" :class="{ 'hamster-lifted': isGrabbed }">
    <canvas ref="canvasRef" :class="animClass"></canvas>
    <div
      class="hit-layer"
      @mousedown="onMouseDown"
      @click="onClick"
      @mousemove="onHover"
      @mouseleave="onLeave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ImageRenderer } from '../sprites/image-renderer'
import type { ImageAnimationDef } from '../sprites/image-frames'
import {
  idleAnimation,
  eatingAnimation,
  sleepingAnimation,
  runningAnimation,
  happyAnimation,
  hidingAnimation,
  adventureOutAnimation,
  adventureBackAnimation,
} from '../sprites/image-frames'
import type { BodyRegion } from '../data/hamsterPhrases'

export type SpriteState = 'idle' | 'eating' | 'sleeping' | 'running' | 'hiding' | 'adventure_out' | 'adventure_back' | 'happy'

const CANVAS_SIZE = 128

const props = defineProps<{
  state: SpriteState
}>()

const emit = defineEmits<{
  'region-click': [region: BodyRegion]
  'region-hover': [region: BodyRegion | null]
  'miss-click': [e: MouseEvent]
  'grab-start': []
  'grab-move': [screenX: number, screenY: number]
  'grab-end': []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const animClass = ref('')
const isGrabbed = ref(false)

let renderer: ImageRenderer | null = null
let animationId: number | null = null
let lastFrameTime = 0
let currentFrameIndex = 0
let loadedImages: HTMLImageElement[] = []
let currentAnimation: ImageAnimationDef = idleAnimation

// --- Long press / grab detection ---
const LONG_PRESS_MS = 300
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let mouseDownOnHamster = false
let grabActive = false

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function onGlobalMouseMove(e: MouseEvent) {
  if (!grabActive) return
  emit('grab-move', e.screenX, e.screenY)
}

function onGlobalMouseUp() {
  if (grabActive) {
    grabActive = false
    isGrabbed.value = false
    emit('grab-end')

    // Apply drop bounce
    animClass.value = 'drop-bounce'
    setTimeout(() => { animClass.value = '' }, 500)
  }
  mouseDownOnHamster = false
  clearLongPress()
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)
}

/** Preload all frame images for an animation */
function preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = url
        })
    )
  )
}

/** Map state names to their ImageAnimationDef */
function getAnimation(state: SpriteState): ImageAnimationDef {
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

async function startAnimation(anim: ImageAnimationDef): Promise<void> {
  currentAnimation = anim
  currentFrameIndex = 0
  lastFrameTime = 0
  loadedImages = await preloadImages(anim.frames)

  // Draw first frame immediately
  if (renderer && loadedImages.length > 0) {
    renderer.drawFrame(loadedImages[0])
  }
}

function tick(timestamp: number): void {
  if (!renderer || loadedImages.length === 0) {
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
      currentFrameIndex = (currentFrameIndex + 1) % loadedImages.length
    } else {
      currentFrameIndex = Math.min(currentFrameIndex + 1, loadedImages.length - 1)
    }

    renderer.drawFrame(loadedImages[currentFrameIndex])
  }

  animationId = requestAnimationFrame(tick)
}

// ---- Hit detection ----
function getPixelCoords(e: MouseEvent): { x: number; y: number } | null {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * CANVAS_SIZE)
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * CANVAS_SIZE)
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return null
  return { x, y }
}

function isHamsterPixel(x: number, y: number): boolean {
  if (!renderer) return false
  return renderer.getPixelAlpha(x, y) > 0
}

// Region detection scaled from 48 → 128
function detectRegion(x: number, y: number): BodyRegion {
  if (y <= 27) return 'ear'
  if (y <= 64) return 'head'
  if (y <= 96 && x >= 37 && x <= 91) return 'belly'
  if (y >= 99) return 'paw'
  if (x <= 21 || x >= 107) return 'tail'
  return 'body'
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const coords = getPixelCoords(e)
  if (coords && isHamsterPixel(coords.x, coords.y)) {
    e.stopPropagation()
    mouseDownOnHamster = true

    // Start long-press timer
    clearLongPress()
    longPressTimer = setTimeout(() => {
      if (mouseDownOnHamster) {
        // Long press triggered → start grab
        grabActive = true
        isGrabbed.value = true
        emit('grab-start')
      }
    }, LONG_PRESS_MS)

    // Listen globally so we catch mouseup even outside the element
    window.addEventListener('mousemove', onGlobalMouseMove)
    window.addEventListener('mouseup', onGlobalMouseUp)
  }
}

function onClick(e: MouseEvent) {
  // If we were grabbing, don't fire click
  if (grabActive || isGrabbed.value) return

  const coords = getPixelCoords(e)
  if (!coords || !isHamsterPixel(coords.x, coords.y)) {
    emit('miss-click', e)
    return
  }
  e.stopPropagation()
  const region = detectRegion(coords.x, coords.y)
  emit('region-click', region)

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
    renderer = new ImageRenderer(canvasRef.value)
    startAnimation(getAnimation(props.state))
    animationId = requestAnimationFrame(tick)
  }
})

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  clearLongPress()
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)
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
  transition: transform 0.2s ease, filter 0.2s ease;
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

/* Lifted / grabbed state */
.hamster-lifted {
  transform: scale(1.15) translateY(-12px);
  filter: drop-shadow(0 8px 6px rgba(0, 0, 0, 0.25));
  cursor: grabbing !important;
}

.hamster-lifted .hit-layer {
  cursor: grabbing;
}

.hamster-lifted canvas {
  animation: wiggle 0.4s ease-in-out infinite alternate;
}

/* Drop bounce when released */
.drop-bounce canvas {
  animation: drop-land 0.5s ease-out;
}

/* Micro-animations */
.shake {
  animation: shake 0.3s ease-in-out;
}

.bounce {
  animation: bounce 0.4s ease-out;
}

@keyframes wiggle {
  0% { transform: rotate(-3deg); }
  100% { transform: rotate(3deg); }
}

@keyframes drop-land {
  0% { transform: translateY(-8px) scale(1.05); }
  40% { transform: translateY(4px) scale(0.92, 1.08); }
  60% { transform: translateY(-2px) scale(1.02); }
  80% { transform: translateY(1px) scale(0.98, 1.01); }
  100% { transform: translateY(0) scale(1); }
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
