<template>
  <div class="hamster-sprite">
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
  typingAnimation,
} from '../sprites/image-frames'
import type { BodyRegion } from '../data/hamsterPhrases'

export type SpriteState = 'idle' | 'eating' | 'sleeping' | 'running' | 'hiding' | 'adventure_out' | 'adventure_back' | 'happy' | 'typing'

const CANVAS_SIZE = 128

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

let renderer: ImageRenderer | null = null
let animationId: number | null = null
let lastFrameTime = 0
let currentFrameIndex = 0
let loadedImages: HTMLImageElement[] = []
let currentAnimation: ImageAnimationDef = idleAnimation

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
    case 'typing': return typingAnimation
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
// Coordinates now map to 128×128 canvas instead of 48×48
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

// Region detection scaled from 48 → 128 (factor ≈ 2.667)
function detectRegion(x: number, y: number): BodyRegion {
  if (y <= 27) return 'ear'        // was 10 @ 48px → 27 @ 128px
  if (y <= 64) return 'head'       // was 24 → 64
  if (y <= 96 && x >= 37 && x <= 91) return 'belly' // was 36, 14-34 → 96, 37-91
  if (y >= 99) return 'paw'        // was 37 → 99
  if (x <= 21 || x >= 107) return 'tail'  // was 8, 40 → 21, 107
  return 'body'
}

function onMouseDown(e: MouseEvent) {
  const coords = getPixelCoords(e)
  if (coords && isHamsterPixel(coords.x, coords.y)) {
    e.stopPropagation()
  }
}

function onClick(e: MouseEvent) {
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
