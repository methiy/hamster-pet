<template>
  <div class="overlay" @mousedown="onClick">
    <div
      v-for="s in snacks"
      :key="s.id"
      class="snack"
      :style="{ left: s.x + 'px', top: s.y + 'px', opacity: s.opacity }"
    >{{ s.emoji }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { emit, listen } from '@tauri-apps/api/event'

/**
 * A food item falling onto the screen. We track everything in pixels
 * relative to this overlay window — since the overlay is full-screen,
 * the overlay's (0,0) and the monitor's (0,0) coincide.
 */
interface Snack {
  id: number
  emoji: string
  /** Current top-left in CSS pixels (not physical). */
  x: number
  y: number
  /** Vertical velocity in px/frame for the free-fall integrator. */
  vy: number
  /** The ground y (top of taskbar / screen work-area bottom). */
  groundY: number
  /** Set by the pet-side listener once the pet has started eating. */
  eaten: boolean
  /** For fade-out. */
  opacity: number
}

const FOOD_EMOJIS = ['🌻', '🍞', '🍓', '🍎', '🧀', '🧁', '🥜', '🍱']
const GRAVITY = 0.8 // px/frame² — feels plausible at 60fps
const SNACK_SIZE = 48 // px, matches CSS font-size below
const LIFETIME_MS = 10_000 // snack lingers 10s before fading out if uneaten

/**
 * True while the user is inside feeding mode (since the last Ctrl+Shift+E
 * / tray menu entry, until they press Esc). While active, the overlay is
 * always on top and intercepts every mouse click as "drop a snack". While
 * inactive, the overlay is hidden entirely.
 */
const feedingActive = ref(false)
const snacks = ref<Snack[]>([])
let nextId = 1
let rafId: number | null = null
let unlistenSnackEaten: (() => void) | null = null
let unlistenReset: (() => void) | null = null

function pickEmoji(): string {
  return FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]!
}

function computeGroundY(): number {
  // window.screen.availHeight is the work-area height (monitor minus
  // taskbar / docked bars) in CSS pixels — we rest the snack on the
  // taskbar's top edge, not behind it.
  const workAreaCssH = Math.floor(window.screen.availHeight)
  const candidate = workAreaCssH - SNACK_SIZE - 4
  const fallback = window.innerHeight - SNACK_SIZE - 4
  return Math.min(candidate, fallback)
}

function onClick(e: MouseEvent) {
  if (!feedingActive.value) return
  // Every click while feeding mode is active spawns a new snack. The
  // overlay stays click-capturing and always-on-top for the whole
  // session — the only way out is Esc. This is deliberate: the user
  // asked for a mode where "feed, feed, feed" is frictionless.

  const snack: Snack = {
    id: nextId++,
    emoji: pickEmoji(),
    x: e.clientX - SNACK_SIZE / 2,
    y: e.clientY - SNACK_SIZE / 2,
    vy: 0,
    groundY: computeGroundY(),
    eaten: false,
    opacity: 1,
  }
  snacks.value.push(snack)
  ensureLoop()

  // Notify the pet side with physical screen coordinates so it can walk
  // over. devicePixelRatio handles HiDPI; on standard 100% scaling it's
  // just 1.
  const dpr = window.devicePixelRatio || 1
  const physX = Math.round((snack.x + SNACK_SIZE / 2) * dpr)
  const physY = Math.round((snack.groundY + SNACK_SIZE / 2) * dpr)
  emit('snack-dropped', { id: snack.id, physX, physY, emoji: snack.emoji }).catch(() => {})

  // Auto-expire after LIFETIME_MS if the pet never ate this particular
  // snack (pet may have been busy with a previous one, or full).
  setTimeout(() => {
    fadeOutAndRemove(snack.id)
  }, LIFETIME_MS + 2000)
}

function tick() {
  for (const s of snacks.value) {
    if (s.eaten) continue
    if (s.y < s.groundY) {
      s.vy += GRAVITY
      const newY = Math.min(s.y + s.vy, s.groundY)
      const justLanded = s.y < s.groundY && newY >= s.groundY
      s.y = newY
      if (justLanded) {
        // Tell the pet side the snack has settled. The pet may have
        // already reached the snack's anticipated ground position
        // (since it walks in parallel with the fall); if so, it was
        // waiting for this event to start eating.
        emit('snack-landed', { id: s.id }).catch(() => {})
      }
    }
  }
  if (snacks.value.length > 0) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = null
  }
}

function ensureLoop() {
  if (rafId === null && snacks.value.length > 0) {
    rafId = requestAnimationFrame(tick)
  }
}

function fadeOutAndRemove(id: number) {
  const s = snacks.value.find((x) => x.id === id)
  if (!s) return
  const fadeStart = performance.now()
  const FADE_MS = 600
  function step(now: number) {
    const t = (now - fadeStart) / FADE_MS
    if (!s) return
    s.opacity = Math.max(0, 1 - t)
    if (t >= 1) {
      snacks.value = snacks.value.filter((x) => x.id !== id)
      // Note: we do NOT hide the overlay or disable click capture here.
      // In "continuous feeding" mode the overlay stays armed until the
      // user presses Esc; otherwise they'd have to re-press the hotkey
      // between every snack.
    } else {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!feedingActive.value) return
  exitFeedingMode()
}

async function exitFeedingMode() {
  feedingActive.value = false
  // Fully tear down: make the overlay pass-through, disable topmost,
  // hide it so the user is back to a normal desktop. We intentionally
  // do NOT clear `snacks` — any snack still falling or pending eating
  // should keep playing out, but clicks won't spawn new ones.
  try { await getCurrentWindow().setIgnoreCursorEvents(true) } catch { /* ignore */ }
  try { await getCurrentWindow().setAlwaysOnTop(false) } catch { /* ignore */ }
  try { await getCurrentWindow().hide() } catch { /* ignore */ }
}

onMounted(async () => {
  // On first load the overlay is already visible (enter() showed it
  // right before we mounted). Make sure we're in a "clickable" state
  // and armed.
  feedingActive.value = true
  try { await getCurrentWindow().setIgnoreCursorEvents(false) } catch { /* ignore */ }

  unlistenSnackEaten = await listen<{ id: number }>('snack-eaten', (event) => {
    const s = snacks.value.find((x) => x.id === event.payload.id)
    if (!s) return
    s.eaten = true
    // Don't snap the snack to the ground — let it fade out from
    // wherever it currently is. Snapping looked jarring when the pet
    // reached the snack mid-fall (cat + snack appeared to teleport).
    fadeOutAndRemove(s.id)
  })

  // Every time the user (re-)enters feeding mode from the pet window
  // (Ctrl+Shift+E or tray item), re-arm this overlay: even if the
  // user previously Esc'd, we're back to capturing clicks.
  unlistenReset = await listen<null>('feeding:reset', async () => {
    feedingActive.value = true
    try { await getCurrentWindow().setIgnoreCursorEvents(false) } catch { /* ignore */ }
    try { await getCurrentWindow().setAlwaysOnTop(true) } catch { /* ignore */ }
  })

  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  unlistenSnackEaten?.()
  unlistenReset?.()
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  cursor: crosshair;
}
.snack {
  position: absolute;
  width: 48px;
  height: 48px;
  font-size: 40px;
  line-height: 48px;
  text-align: center;
  user-select: none;
  pointer-events: none;
  transition: opacity 0.1s linear;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
}
</style>
