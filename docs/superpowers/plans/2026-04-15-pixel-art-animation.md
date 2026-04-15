# Pixel Art Frame Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline SVG + CSS animation hamster with a Canvas-based 48×48 pixel art frame animation system, keeping the same 8-state interface.

**Architecture:** New `src/sprites/` module contains palette, types, RLE decoder, Canvas renderer, and per-state frame data files. `HamsterSprite.vue` swaps its SVG template for a `<canvas>` element and uses `requestAnimationFrame` to drive frame playback. All other files remain untouched.

**Tech Stack:** Vue 3 + TypeScript, Canvas 2D API, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-15-pixel-art-animation-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/sprites/palette.ts` | Color palette array (~12 colors) |
| Create | `src/sprites/types.ts` | Type definitions + RLE decode function + hexToRGBA utility |
| Create | `src/sprites/renderer.ts` | `PixelRenderer` class — draws decoded frames to Canvas |
| Create | `src/sprites/frames/idle.ts` | idle animation: 8 RLE-encoded frames, fps=4, loop=true |
| Create | `src/sprites/frames/eating.ts` | eating animation: 10 frames, fps=8, loop=true |
| Create | `src/sprites/frames/sleeping.ts` | sleeping animation: 8 frames, fps=3, loop=true |
| Create | `src/sprites/frames/running.ts` | running animation: 8 frames, fps=10, loop=true |
| Create | `src/sprites/frames/happy.ts` | happy animation: 10 frames, fps=8, loop=true |
| Create | `src/sprites/frames/hiding.ts` | hiding animation: 8 frames, fps=6, loop=false |
| Create | `src/sprites/frames/adventure-out.ts` | adventure_out animation: 10 frames, fps=8, loop=false |
| Create | `src/sprites/frames/adventure-back.ts` | adventure_back animation: 10 frames, fps=8, loop=false |
| Modify | `src/components/HamsterSprite.vue` | Replace SVG+CSS with Canvas + rAF animation controller |

---

### Task 1: Palette and Type Foundations

**Files:**
- Create: `src/sprites/palette.ts`
- Create: `src/sprites/types.ts`

- [ ] **Step 1: Create `src/sprites/palette.ts`**

```ts
// src/sprites/palette.ts

/** Palette index 0 = transparent, 1..N = colors */
export const PALETTE: string[] = [
  '',        // 0: transparent (skipped during render)
  '#f0b866', // 1: body gold
  '#fce4b8', // 2: belly light
  '#e8a862', // 3: ears/paws darker gold
  '#d4943a', // 4: body shadow
  '#f8b4b4', // 5: blush pink
  '#4a3520', // 6: eyes/outline brown
  '#d4856a', // 7: nose
  '#ffffff', // 8: eye highlight / teeth
  '#7b9ec7', // 9: zzZ blue (sleeping)
  '#f5d76e', // 10: food yellow (eating)
  '#cccccc', // 11: wheel grey (running)
  '#e0d5c0', // 12: teeth outline
]
```

- [ ] **Step 2: Create `src/sprites/types.ts`**

```ts
// src/sprites/types.ts

/** A single row encoded as run-length pairs: [count, paletteIndex][] */
export type RLERow = [number, number][]

/** A full frame: 48 rows of RLE-encoded pixel data */
export type RLEFrame = RLERow[]

/** A decoded frame: 48×48 grid of palette indices */
export type PixelFrame = number[][]

/** Animation definition for one hamster state */
export interface AnimationDef {
  /** RLE-encoded frames */
  frames: RLEFrame[]
  /** Playback speed in frames per second */
  fps: number
  /** Whether the animation loops or stops on last frame */
  loop: boolean
}

/**
 * Decode an RLE-encoded frame into a 48×48 pixel grid.
 * Each cell is a palette index (0 = transparent).
 */
export function decodeFrame(rleFrame: RLEFrame): PixelFrame {
  return rleFrame.map(row => {
    const pixels: number[] = []
    for (const [count, color] of row) {
      for (let i = 0; i < count; i++) pixels.push(color)
    }
    return pixels
  })
}

/**
 * Parse a hex color string (#RRGGBB) into {r, g, b}.
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /data/workspace/hamster-pet && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No errors related to the new files (existing errors unrelated to our changes are OK).

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/palette.ts src/sprites/types.ts
git commit -m "feat(sprites): add palette and type foundations for pixel art system"
```

---

### Task 2: Canvas Renderer

**Files:**
- Create: `src/sprites/renderer.ts`

- [ ] **Step 1: Create `src/sprites/renderer.ts`**

```ts
// src/sprites/renderer.ts

import { PALETTE } from './palette'
import { hexToRGB } from './types'
import type { PixelFrame } from './types'

const SIZE = 48

/** Pre-compute RGBA values from palette for fast rendering */
const PALETTE_RGBA: { r: number; g: number; b: number }[] = PALETTE.map(hex =>
  hex ? hexToRGB(hex) : { r: 0, g: 0, b: 0 }
)

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D
  private imageData: ImageData

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2d context')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
    this.imageData = ctx.createImageData(SIZE, SIZE)
  }

  /** Draw a decoded 48×48 pixel frame to the canvas */
  drawFrame(frame: PixelFrame): void {
    const data = this.imageData.data
    // Clear to fully transparent
    data.fill(0)

    for (let y = 0; y < SIZE; y++) {
      const row = frame[y]
      for (let x = 0; x < SIZE; x++) {
        const idx = row[x]
        if (idx === 0) continue // transparent
        const color = PALETTE_RGBA[idx]
        const i = (y * SIZE + x) * 4
        data[i] = color.r
        data[i + 1] = color.g
        data[i + 2] = color.b
        data[i + 3] = 255
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0)
  }

  /** Clear the canvas to fully transparent */
  clear(): void {
    this.ctx.clearRect(0, 0, SIZE, SIZE)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /data/workspace/hamster-pet && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/renderer.ts
git commit -m "feat(sprites): add Canvas pixel renderer"
```

---

### Task 3: Idle Animation Frames

The largest and most important task — this establishes the base hamster design that all other states build on. The idle animation has 8 frames: a subtle breathing cycle (body scale 1→1.02→1 over 6 frames) with an eye blink on frames 6-7.

**Files:**
- Create: `src/sprites/frames/idle.ts`

- [ ] **Step 1: Create `src/sprites/frames/idle.ts`**

Create the file with the idle `AnimationDef`. The hamster is centered in the 48×48 grid, facing forward. Each frame is an `RLEFrame` (array of 48 `RLERow`s).

Design the hamster at 48×48 with these proportions:
- Rows 0-4: empty (transparent)
- Rows 5-9: ears (2 rounded ear shapes, gold outer #f0b866, pink inner #f8b4b4)
- Rows 10-24: head (round, with bean eyes at ~row 17-19, nose at ~row 21, mouth+teeth at ~row 22-23, blush circles at ~row 19-20)
- Rows 25-38: body (oval, belly lighter color in center, arms on sides)
- Rows 39-42: paws (2 small rounded feet)
- Rows 43-44: tail (small shape to one side)
- Rows 45-47: empty

Use the palette indices from `palette.ts`:
- Outline everything with index 6 (#4a3520 brown), 1px border
- Body fill: index 1 (#f0b866), with shadow index 4 (#d4943a) on lower-right
- Belly: index 2 (#fce4b8)
- Ears outer: index 1, inner: index 5 (#f8b4b4)
- Eyes: index 6 with 1px highlight index 8 (#ffffff)
- Nose: index 7 (#d4856a), 2×1 pixels
- Teeth: index 8, outline index 12

The 8 frames create a breathing loop:
- Frames 1-3: body at normal size
- Frames 4-5: body 1 row taller (belly expands 1px down)
- Frames 6-7: body back to normal, eyes closed (blink — eye rows replaced with horizontal line)
- Frame 8: same as frame 1

```ts
// src/sprites/frames/idle.ts

import type { AnimationDef } from '../types'

export const idleAnimation: AnimationDef = {
  fps: 4,
  loop: true,
  frames: [
    // Frame 1: base pose (eyes open)
    // ... 48 RLERows — the full hamster pixel art
    // Frame 2: identical to frame 1 (hold)
    // Frame 3: identical to frame 1 (hold)
    // Frame 4: body expanded — belly row 37 gets extra row, paws shift 1px down
    // Frame 5: same as frame 4 (hold expanded)
    // Frame 6: back to normal body, eyes blink (eye rows = solid line of index 6)
    // Frame 7: same as frame 6 (hold blink)
    // Frame 8: same as frame 1 (return to base)
  ],
}
```

Each frame MUST contain exactly 48 `RLERow`s, and each row MUST decode to exactly 48 pixels. The pixel art must be carefully designed — this is the canonical hamster appearance that all other states reference.

**Implementation guidance for the agentic worker:** You are drawing pixel art via code. Work row by row, thinking about the shape. Use a helper comment above each frame showing which rows differ from the base frame. For frames 2, 3, 8 that are identical to frame 1, reference frame 1's data directly:

```ts
const baseFrame: RLEFrame = [ /* ... 48 rows ... */ ]
const expandedFrame: RLEFrame = [ /* ... 48 rows, belly +1 row ... */ ]
const blinkFrame: RLEFrame = [ /* ... 48 rows, eyes closed ... */ ]

export const idleAnimation: AnimationDef = {
  fps: 4,
  loop: true,
  frames: [
    baseFrame,      // 1
    baseFrame,      // 2
    baseFrame,      // 3
    expandedFrame,  // 4
    expandedFrame,  // 5
    blinkFrame,     // 6
    blinkFrame,     // 7
    baseFrame,      // 8
  ],
}
```

- [ ] **Step 2: Validate frame data integrity**

Add a temporary validation script or do it inline: import the frames, decode each one, and verify every frame is 48 rows of 48 pixels. You can do this by adding a quick check in the browser console or a temporary test file.

Run: `cd /data/workspace/hamster-pet && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/idle.ts
git commit -m "feat(sprites): add idle animation pixel art (8 frames)"
```

---

### Task 4: HamsterSprite.vue — Canvas Rewrite

Replace the SVG component with Canvas rendering + rAF animation loop. This is the integration point.

**Files:**
- Modify: `src/components/HamsterSprite.vue` (full rewrite)

- [ ] **Step 1: Rewrite `HamsterSprite.vue`**

```vue
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

/** Map state names to their AnimationDef — more states added in later tasks */
function getAnimation(state: SpriteState): AnimationDef {
  // All states fall back to idle until their frame files are created
  switch (state) {
    case 'idle': return idleAnimation
    default: return idleAnimation
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
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hamster-sprite canvas {
  width: 200px;
  height: 200px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
```

- [ ] **Step 2: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -20`
Expected: Build succeeds. The hamster should now display as pixel art in the idle state. All other states will show idle as a fallback until their frames are added.

- [ ] **Step 3: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/components/HamsterSprite.vue
git commit -m "feat(sprites): rewrite HamsterSprite from SVG to Canvas pixel renderer

Idle state renders pixel art. Other states fall back to idle
until their frame data files are added in subsequent tasks."
```

---

### Task 5: Eating Animation Frames

**Files:**
- Create: `src/sprites/frames/eating.ts`
- Modify: `src/components/HamsterSprite.vue:1-5` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/eating.ts`**

10 frames at 8fps, loop=true. Based on the idle base frame with these differences:
- Arms raised upward (arms shift ~3px up, rotated inward toward mouth)
- A small food item (palette index 10, yellow circle ~3×3) held between paws near mouth
- Cheeks puffed out (head wider by ~2px on each side on alternating frames)
- Animation cycle: arms up → food to mouth → cheeks puff → chew → repeat

```ts
// src/sprites/frames/eating.ts

import type { AnimationDef } from '../types'

// Frame sequence concept:
// Frames 1-2: arms raised, food visible near mouth
// Frames 3-4: food at mouth, cheeks start puffing
// Frames 5-6: cheeks fully puffed, chewing (mouth rows change)
// Frames 7-8: cheeks deflating, chewing continues
// Frames 9-10: return to arms-raised position

export const eatingAnimation: AnimationDef = {
  fps: 8,
  loop: true,
  frames: [
    // ... 10 RLEFrames, each 48 rows × 48 cols
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add the import at the top of the `<script>` block:

```ts
import { eatingAnimation } from '../sprites/frames/eating'
```

Add the case in `getAnimation()`:

```ts
case 'eating': return eatingAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/eating.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add eating animation (10 frames)"
```

---

### Task 6: Sleeping Animation Frames

**Files:**
- Create: `src/sprites/frames/sleeping.ts`
- Modify: `src/components/HamsterSprite.vue` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/sleeping.ts`**

8 frames at 3fps, loop=true. Based on the idle base frame with these differences:
- Eyes closed (horizontal lines instead of round eyes, using palette index 6)
- Body slightly curled (squished horizontally ~1px wider, ~1px shorter vertically)
- Floating "z" letters above head using palette index 9 (#7b9ec7 blue):
  - Small "z" shape (~3×3 pixels) that rises upward across frames
  - Frames 1-4: z at position near head top-right, rising
  - Frames 5-8: z fades out (fewer pixels), new z appears at start position
- Gentle body breathing (similar to idle but slower, body height ±1px)

```ts
// src/sprites/frames/sleeping.ts

import type { AnimationDef } from '../types'

export const sleepingAnimation: AnimationDef = {
  fps: 3,
  loop: true,
  frames: [
    // ... 8 RLEFrames
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add import:
```ts
import { sleepingAnimation } from '../sprites/frames/sleeping'
```

Add case:
```ts
case 'sleeping': return sleepingAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/sleeping.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add sleeping animation (8 frames)"
```

---

### Task 7: Running Animation Frames

**Files:**
- Create: `src/sprites/frames/running.ts`
- Modify: `src/components/HamsterSprite.vue` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/running.ts`**

8 frames at 10fps, loop=true. The hamster runs on a wheel:
- A circular wheel outline (palette index 11, grey) behind the hamster, ~20px radius, centered below body
- Wheel has 4 spoke lines that rotate across frames (each frame rotates spokes ~45°)
- Hamster legs alternate rapidly: left-paw/right-paw shift ±2px horizontally on alternating frames
- Body tilts slightly forward (~1px shift right)
- Arms tucked in close to body (shorter arm shapes)

```ts
// src/sprites/frames/running.ts

import type { AnimationDef } from '../types'

export const runningAnimation: AnimationDef = {
  fps: 10,
  loop: true,
  frames: [
    // ... 8 RLEFrames
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add import:
```ts
import { runningAnimation } from '../sprites/frames/running'
```

Add case:
```ts
case 'running': return runningAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/running.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add running animation (8 frames)"
```

---

### Task 8: Happy Animation Frames

**Files:**
- Create: `src/sprites/frames/happy.ts`
- Modify: `src/components/HamsterSprite.vue` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/happy.ts`**

10 frames at 8fps, loop=true. The hamster bounces joyfully:
- Bounce cycle: whole hamster shifts upward 3-4px then back down, over ~4 frames
- Happy eyes: upward-curved arcs (U-shapes inverted) instead of round eyes, using index 6
- Arms raised outward in a celebratory pose
- Extra blush (index 5 pink areas slightly larger, +1px each side)
- Frames 1-2: normal position, happy eyes
- Frames 3-5: rising upward (entire sprite shifted up 2px, then 4px)
- Frames 6-7: at peak, arms widest
- Frames 8-10: descending back to base position

```ts
// src/sprites/frames/happy.ts

import type { AnimationDef } from '../types'

export const happyAnimation: AnimationDef = {
  fps: 8,
  loop: true,
  frames: [
    // ... 10 RLEFrames
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add import:
```ts
import { happyAnimation } from '../sprites/frames/happy'
```

Add case:
```ts
case 'happy': return happyAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/happy.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add happy animation (10 frames)"
```

---

### Task 9: Hiding Animation Frames

**Files:**
- Create: `src/sprites/frames/hiding.ts`
- Modify: `src/components/HamsterSprite.vue` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/hiding.ts`**

8 frames at 6fps, loop=false (plays once, stops on last frame). The hamster shrinks away:
- Frame 1: normal hamster
- Frames 2-3: hamster crouches slightly (head lowers 1-2px, body squishes wider)
- Frames 4-5: hamster shrinking (draw at ~75% size, more transparent area around edges)
- Frames 6-7: very small (draw at ~50% size, centered, lots of transparent space)
- Frame 8: tiny dot or nearly invisible (~30% size, faint — use fewer pixels, mostly outline)

To achieve the "shrinking" effect in pixel art: progressively draw fewer detail pixels, reduce the overall shape size, and increase the transparent border. Each frame is still 48×48, but the drawn area gets smaller.

```ts
// src/sprites/frames/hiding.ts

import type { AnimationDef } from '../types'

export const hidingAnimation: AnimationDef = {
  fps: 6,
  loop: false,
  frames: [
    // ... 8 RLEFrames
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add import:
```ts
import { hidingAnimation } from '../sprites/frames/hiding'
```

Add case:
```ts
case 'hiding': return hidingAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/hiding.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add hiding animation (8 frames, non-looping)"
```

---

### Task 10: Adventure Out Animation Frames

**Files:**
- Create: `src/sprites/frames/adventure-out.ts`
- Modify: `src/components/HamsterSprite.vue` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/adventure-out.ts`**

10 frames at 8fps, loop=false. The hamster walks off to the right with a backpack:
- Frame 1: hamster facing right (side view or 3/4 view), small backpack on back (index 3 darker gold, ~4×5px rectangle)
- Frames 2-4: walking animation — legs alternating, body shifting right ~3px per frame
- Frames 5-7: hamster mostly off-screen right (only left portion visible, rest transparent)
- Frames 8-9: almost fully off-screen (just a few pixels visible on left edge)
- Frame 10: fully transparent (empty 48×48 — all zeros)

To create the "walking right" pixel art: draw the hamster in a side-view or 3/4 view, and shift the drawn area rightward across frames. The walking cycle alternates leg positions.

```ts
// src/sprites/frames/adventure-out.ts

import type { AnimationDef } from '../types'

export const adventureOutAnimation: AnimationDef = {
  fps: 8,
  loop: false,
  frames: [
    // ... 10 RLEFrames
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add import:
```ts
import { adventureOutAnimation } from '../sprites/frames/adventure-out'
```

Add case:
```ts
case 'adventure_out': return adventureOutAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/adventure-out.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add adventure-out animation (10 frames, non-looping)"
```

---

### Task 11: Adventure Back Animation Frames

**Files:**
- Create: `src/sprites/frames/adventure-back.ts`
- Modify: `src/components/HamsterSprite.vue` (add import + case)

- [ ] **Step 1: Create `src/sprites/frames/adventure-back.ts`**

10 frames at 8fps, loop=false. The hamster returns from the left with souvenirs:
- Frame 1: fully transparent (empty)
- Frames 2-3: hamster entering from left edge (just a few pixels visible on right)
- Frames 4-6: walking in from left — legs alternating, body shifting right ~3px per frame, carrying a small bundle (index 10 yellow, ~3×3px)
- Frames 7-8: hamster nearly centered, still walking
- Frames 9-10: hamster at center, stops — transitions to front-facing idle pose. Frame 10 should be very close to the idle base frame so the state transition is smooth.

```ts
// src/sprites/frames/adventure-back.ts

import type { AnimationDef } from '../types'

export const adventureBackAnimation: AnimationDef = {
  fps: 8,
  loop: false,
  frames: [
    // ... 10 RLEFrames
  ],
}
```

- [ ] **Step 2: Wire into HamsterSprite.vue**

Add import:
```ts
import { adventureBackAnimation } from '../sprites/frames/adventure-back'
```

Add case:
```ts
case 'adventure_back': return adventureBackAnimation
```

- [ ] **Step 3: Build and verify**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/sprites/frames/adventure-back.ts src/components/HamsterSprite.vue
git commit -m "feat(sprites): add adventure-back animation (10 frames, non-looping)"
```

---

### Task 12: Final Build Verification and Cleanup

**Files:**
- Review: all files in `src/sprites/` and `src/components/HamsterSprite.vue`

- [ ] **Step 1: Full build check**

Run: `cd /data/workspace/hamster-pet && npm run build 2>&1`
Expected: Build succeeds with zero errors.

- [ ] **Step 2: Verify all 8 states are wired in HamsterSprite.vue**

Read `src/components/HamsterSprite.vue` and confirm the `getAnimation()` switch statement covers all 8 states with no `default: return idleAnimation` fallback remaining:

```ts
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
```

The return type is exhaustive over `SpriteState` — TypeScript will error if a case is missing, so no `default` is needed.

- [ ] **Step 3: Verify no old SVG code remains**

Search `HamsterSprite.vue` for any leftover `<svg`, `@keyframes`, or SVG-related CSS. There should be none.

- [ ] **Step 4: Final commit and push**

```bash
cd /data/workspace/hamster-pet
git add -A
git status
# If there are any uncommitted changes:
git commit -m "chore: final cleanup for pixel art animation system"
git push
```
