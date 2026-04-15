<template>
  <div class="hamster-sprite">
    <canvas ref="canvasRef"></canvas>
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

export type SpriteState = 'idle' | 'eating' | 'sleeping' | 'running' | 'hiding' | 'adventure_out' | 'adventure_back' | 'happy'

const props = defineProps<{
  state: SpriteState
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

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
}

.hamster-sprite canvas {
  width: 120px;
  height: 120px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
