<template>
  <div class="overlay" :class="{ 'waiting-click': waitingClick }" @mousedown="onClick">
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

const waitingClick = ref(true)
const snacks = ref<Snack[]>([])
let nextId = 1
let rafId: number | null = null
let unlistenSnackEaten: (() => void) | null = null
let unlistenReset: (() => void) | null = null

function pickEmoji(): string {
  return FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]!
}

function computeGroundY(): number {
  // We want the snack to rest on what the user perceives as "the bottom
  // of the screen" — which on Windows is the top edge of the taskbar,
  // NOT the absolute bottom pixel. Our overlay window is sized to the
  // full monitor (so we can capture clicks over the taskbar too), so
  // innerHeight here is the full screen height and would place the
  // snack hidden *behind* the taskbar.
  //
  // window.screen.availHeight is the work-area height (monitor height
  // minus taskbar and other docked bars) in CSS pixels — exactly what
  // we want.
  const dpr = window.devicePixelRatio || 1
  // availHeight is in CSS pixels at the system scale; convert to the
  // overlay's CSS pixels. In single-monitor setups these are equal.
  const workAreaCssH = Math.floor(window.screen.availHeight)
  // Clamp: if the API misreports, fall back to innerHeight so we at
  // least stay on-screen.
  const candidate = workAreaCssH - SNACK_SIZE - 4
  const fallback = window.innerHeight - SNACK_SIZE - 4
  return Math.min(candidate, fallback)
  void dpr
}

function onClick(e: MouseEvent) {
  if (!waitingClick.value) return
  // We consumed the click; from now on pointer events should pass
  // through so the user can keep working while the snack is falling.
  // Also drop always-on-top so the pet window (which is also
  // alwaysOnTop) renders *above* the snack overlay — otherwise the
  // pet walking over to eat would be hidden behind this full-screen
  // window.
  waitingClick.value = false
  try {
    getCurrentWindow().setIgnoreCursorEvents(true)
  } catch { /* non-Tauri or API missing */ }
  try {
    getCurrentWindow().setAlwaysOnTop(false)
  } catch { /* ignore */ }

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

  // Notify the pet side with physical screen coordinates so the pet can
  // decide whether to walk over. We translate the overlay's local y to
  // a physical monitor y using devicePixelRatio — in practice these are
  // equal for most single-monitor setups, but we handle HiDPI just in
  // case.
  const dpr = window.devicePixelRatio || 1
  const physX = Math.round((snack.x + SNACK_SIZE / 2) * dpr)
  const physY = Math.round((snack.groundY + SNACK_SIZE / 2) * dpr)
  emit('snack-dropped', { id: snack.id, physX, physY, emoji: snack.emoji }).catch(() => {})

  // Schedule an auto-expire: if the pet never comes, fade and remove
  // the snack after LIFETIME_MS (measured from landing, approximately).
  setTimeout(() => {
    fadeOutAndRemove(snack.id)
  }, LIFETIME_MS + 2000) // +2s rough estimate of falling time
}

function tick() {
  let anyMoving = false
  for (const s of snacks.value) {
    if (s.eaten) continue
    if (s.y < s.groundY) {
      s.vy += GRAVITY
      s.y = Math.min(s.y + s.vy, s.groundY)
      anyMoving = true
    }
  }
  // Keep the loop running while anything is falling OR while there are
  // snacks at all (opacity transitions also need frames). Using a
  // coarse "always loop while snacks exist" rule is fine — it's one
  // empty frame per tick, negligible cost.
  if (snacks.value.length > 0) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = null
  }
  void anyMoving // (kept for possible future use, e.g. pause when idle)
}

function ensureLoop() {
  if (rafId === null && snacks.value.length > 0) {
    rafId = requestAnimationFrame(tick)
  }
}

function fadeOutAndRemove(id: number) {
  const s = snacks.value.find((x) => x.id === id)
  if (!s) return
  // Simple CSS-driven-by-data fade: step opacity down each frame.
  const fadeStart = performance.now()
  const FADE_MS = 600
  function step(now: number) {
    const t = (now - fadeStart) / FADE_MS
    if (!s) return
    s.opacity = Math.max(0, 1 - t)
    if (t >= 1) {
      snacks.value = snacks.value.filter((x) => x.id !== id)
      // If no snacks remain, hide the overlay. We do NOT reset
      // waitingClick or cursor-events here — that's the job of the
      // next enter() on the pet side, which emits feeding:reset.
      // Otherwise a stale, hidden overlay would silently grab the
      // user's clicks and keep dropping snacks forever.
      if (snacks.value.length === 0) {
        try { getCurrentWindow().hide() } catch { /* ignore */ }
      }
    } else {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}

onMounted(async () => {
  // Start waiting for click: overlay must capture mouse events.
  try {
    await getCurrentWindow().setIgnoreCursorEvents(false)
  } catch { /* ignore */ }

  // Listen for pet confirming it's about to eat snack N — mark it
  // eaten so the fall animation (if still running) pins it to the
  // ground, then fade it out after a short delay to let the pet's
  // eating state play out.
  unlistenSnackEaten = await listen<{ id: number }>('snack-eaten', (event) => {
    const s = snacks.value.find((x) => x.id === event.payload.id)
    if (!s) return
    s.eaten = true
    // Ensure snack is visually on the ground before the pet arrives.
    s.y = s.groundY
    // Let the pet play eating for ~3s, then fade the snack out.
    setTimeout(() => fadeOutAndRemove(s.id), 3000)
  })

  // The pet side's useFeedingOverlay.enter() emits feeding:reset each
  // time the user re-enters feeding mode. That's the only place where
  // we're allowed to re-arm the click capture: doing it automatically
  // after a snack finishes would let the now-hidden overlay keep
  // eating the user's clicks indefinitely (the "unlimited feeding"
  // bug from 0.7.31).
  unlistenReset = await listen<null>('feeding:reset', async () => {
    waitingClick.value = true
    try { await getCurrentWindow().setIgnoreCursorEvents(false) } catch { /* ignore */ }
    try { await getCurrentWindow().setAlwaysOnTop(true) } catch { /* ignore */ }
  })

  // Esc cancels the mode while we're still waiting for a click. After a
  // snack has already been dropped we let the fall+fade finish normally
  // — there's nothing to cancel at that point and pressing Esc in
  // another app shouldn't accidentally yank the snack away.
  window.addEventListener('keydown', onKey)

  ensureLoop()
})

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!waitingClick.value) return
  // Cancel: hide the overlay and reset for the next enter.
  try {
    getCurrentWindow().hide()
  } catch { /* ignore */ }
  waitingClick.value = true
}

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
  /* Transparent so the desktop beneath shows through. */
  background: transparent;
  /* Never show a cursor here while waiting — Tauri can't change the
     system cursor easily, but we can at least cue the user via CSS. */
  cursor: crosshair;
}
.overlay:not(.waiting-click) {
  cursor: default;
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
  /* A soft drop shadow so the emoji reads on any desktop color. */
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
}
</style>
