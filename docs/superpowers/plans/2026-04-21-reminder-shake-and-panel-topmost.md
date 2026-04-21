# Reminder Foreground Shake + Pet Alert + Panel Top-Most Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two v0.7.20 bugs — interval reminders now shake the foreground window and send the pet over with a speech bubble; right-click panels reliably open on top.

**Architecture:** Add a `speedMultiplier` option to the existing `startSummonWalk` (pet-walk primitive already lives in `usePushAnimation.ts`; no separate composable). Add two new composables: `useWindowShake` (shake any HWND, or the pet's own window when hwnd is null) and `useAlertUser` (compose: sound → foreground shake → pet fast-walk → speech bubble). Fix the panel z-order via an `alwaysOnTop` false→true toggle after `show()`.

**Tech Stack:** Vue 3 composables, Tauri v2 JS API (`@tauri-apps/api/window`, `invoke`), vitest + jsdom. Windows-only HWND primitives already exist in Rust (`capture_foreground_hwnd`, `get_hwnd_rect`, `set_hwnd_position`).

---

## File Structure

**Create:**
- `src/composables/useWindowShake.ts` — `shakeWindowByHwnd(hwnd | null, opts?)` primitive
- `src/composables/useAlertUser.ts` — `alertUserWithPet(text, opts?)` composition
- `src/composables/__tests__/useWindowShake.test.ts` — shake offset sequence
- `src/composables/__tests__/useAlertUser.test.ts` — fallback path

**Modify:**
- `src/composables/usePushAnimation.ts` — `startSummonWalk` accepts `opts?: { speedMultiplier?: number }`
- `src/App.vue` — swap `shakeWindow()` to use new primitive; interval-reminder branch calls `alertUserWithPet`; remove duplicate inline shake
- `src/composables/usePanelWindow.ts` — add `alwaysOnTop` toggle in `openPanel()`

---

## Task 1: Extend `startSummonWalk` with speed option

**Files:**
- Modify: `src/composables/usePushAnimation.ts:618-660`

- [ ] **Step 1: Inspect current signature and caller**

Read the current implementation:

```bash
sed -n '614,660p' src/composables/usePushAnimation.ts
```

Expected: `async function startSummonWalk(targetPhysX, targetPhysY)` using `walkDuration = Math.max(walkDist / WALK_SPEED, 800)`.

Also inspect the caller at `src/App.vue:1020`:

```bash
sed -n '1018,1025p' src/App.vue
```

Expected: `await startSummonWalk(targetX, targetY)`.

- [ ] **Step 2: Change `startSummonWalk` to accept a speed multiplier**

Replace the function signature and duration calc in `src/composables/usePushAnimation.ts`:

```typescript
  /**
   * Summon walk: pet walks from current position to a target position (physical pixels),
   * shows a happy reaction and speech on arrival.
   *
   * opts.speedMultiplier: >1 makes the pet faster (shorter walkDuration),
   * <1 makes it slower. Default 1. Minimum floor of 250ms still applies
   * so very short distances don't teleport awkwardly fast.
   */
  async function startSummonWalk(
    targetPhysX: number,
    targetPhysY: number,
    opts: { speedMultiplier?: number } = {}
  ) {
    if (isPushing.value) return
    cancelled = false
    isPushing.value = true

    try {
      const appWindow = getCurrentWindow()
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      // Clamp target to screen bounds
      const clamped = await clampPosition(targetPhysX, targetPhysY)
      targetPhysX = clamped.x
      targetPhysY = clamped.y

      const dx = targetPhysX - startX
      const dy = targetPhysY - startY
      const walkDist = Math.sqrt(dx * dx + dy * dy)

      // If already very close, just teleport
      if (walkDist < 50) {
        await appWindow.setPosition(new PhysicalPosition(Math.round(targetPhysX), Math.round(targetPhysY)))
        return
      }

      const speedMul = Math.max(opts.speedMultiplier ?? 1, 0.1)
      const baseDuration = Math.max(walkDist / WALK_SPEED, 800)
      const walkDuration = Math.max(baseDuration / speedMul, 250)

      isWalking.value = true
      pushDirection.value = dx > 0 ? 'right' : 'left'
      callbacks.triggerReaction('running', walkDuration + 500)
      await animateHamsterMove(startX, startY, targetPhysX, targetPhysY, walkDuration)

      isWalking.value = false
    } catch {
      // Not in Tauri or animation failed
    } finally {
      isPushing.value = false
      isWalking.value = false
      isWalkingBack.value = false
      callbacks.onComplete()
    }
  }
```

- [ ] **Step 3: Verify frontend still builds**

```bash
npm run build
```

Expected: build succeeds with no TS errors (existing caller `startSummonWalk(targetX, targetY)` still works because `opts` is optional).

- [ ] **Step 4: Commit**

```bash
git add src/composables/usePushAnimation.ts
git commit -m "feat(walk): add speedMultiplier option to startSummonWalk"
```

---

## Task 2: Add `useWindowShake` composable with test

**Files:**
- Create: `src/composables/useWindowShake.ts`
- Create: `src/composables/__tests__/useWindowShake.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useWindowShake.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Tauri modules before importing the composable
const invokeMock = vi.fn()
const setPositionMock = vi.fn()
const outerPositionMock = vi.fn(async () => ({ x: 100, y: 200 }))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}))

vi.mock('@tauri-apps/api/window', () => ({
  PhysicalPosition: class {
    constructor(public x: number, public y: number) {}
  },
  getCurrentWindow: () => ({
    setPosition: setPositionMock,
    outerPosition: outerPositionMock,
  }),
}))

import { useWindowShake } from '../useWindowShake'

describe('useWindowShake', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    setPositionMock.mockReset()
    outerPositionMock.mockClear()
    invokeMock.mockResolvedValue(null)
    setPositionMock.mockResolvedValue(undefined)
  })

  it('shakes a specific hwnd via set_hwnd_position when hwnd is provided', async () => {
    // get_hwnd_rect returns a rect so we know the origin
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_hwnd_rect') return Promise.resolve({ x: 500, y: 600, width: 400, height: 300 })
      return Promise.resolve(null)
    })

    const { shakeWindowByHwnd } = useWindowShake()
    await shakeWindowByHwnd(12345, { stepDuration: 0 })

    // First call is get_hwnd_rect, subsequent calls are set_hwnd_position (one per offset step)
    const setPosCalls = invokeMock.mock.calls.filter((c: any[]) => c[0] === 'set_hwnd_position')
    expect(setPosCalls.length).toBe(11) // 11 offsets in the sequence
    // First offset is [6, 0] → x+6, y+0
    expect(setPosCalls[0][1]).toEqual({ hwnd: 12345, x: 506, y: 600 })
    // Last offset is [0, 0] → back to origin
    expect(setPosCalls[10][1]).toEqual({ hwnd: 12345, x: 500, y: 600 })
  })

  it('shakes the pet window when hwnd is null', async () => {
    const { shakeWindowByHwnd } = useWindowShake()
    await shakeWindowByHwnd(null, { stepDuration: 0 })

    // 11 setPosition calls on the current window (not via invoke)
    expect(setPositionMock).toHaveBeenCalledTimes(11)
    const setHwndCalls = invokeMock.mock.calls.filter((c: any[]) => c[0] === 'set_hwnd_position')
    expect(setHwndCalls.length).toBe(0)
  })

  it('scales offsets by intensity parameter', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_hwnd_rect') return Promise.resolve({ x: 0, y: 0, width: 100, height: 100 })
      return Promise.resolve(null)
    })

    const { shakeWindowByHwnd } = useWindowShake()
    await shakeWindowByHwnd(9999, { stepDuration: 0, intensity: 12 })

    const setPosCalls = invokeMock.mock.calls.filter((c: any[]) => c[0] === 'set_hwnd_position')
    // intensity 12 = 2x the default 6 → first step [12, 0]
    expect(setPosCalls[0][1]).toEqual({ hwnd: 9999, x: 12, y: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/composables/__tests__/useWindowShake.test.ts
```

Expected: FAIL (module `../useWindowShake` not found).

- [ ] **Step 3: Implement `useWindowShake`**

Create `src/composables/useWindowShake.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'

/**
 * Base shake offset sequence, designed for a base intensity of 6 pixels.
 * 11 steps that deflect in cardinal directions with decaying magnitude,
 * ending exactly at origin.
 */
const BASE_OFFSETS: Array<[number, number]> = [
  [6, 0], [-6, 0], [0, 6], [0, -6],
  [4, 0], [-4, 0], [0, 4], [0, -4],
  [2, 0], [-2, 0], [0, 0],
]

interface HwndRect {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowShakeOptions {
  /** Peak deflection in pixels. Default 6. Offsets scale as intensity/6. */
  intensity?: number
  /** Milliseconds between offset steps. Default 40. */
  stepDuration?: number
}

/**
 * Wobble a window by nudging its position through a fixed cardinal offset
 * sequence. `hwnd = null` shakes the pet's own window (cross-platform via
 * Tauri's `getCurrentWindow().setPosition`). `hwnd = <number>` shakes an
 * arbitrary Windows HWND via the `set_hwnd_position` Rust command — call
 * `capture_foreground_hwnd` + `get_hwnd_rect` to obtain one.
 */
export function useWindowShake() {
  async function shakeWindowByHwnd(
    hwnd: number | null,
    opts: WindowShakeOptions = {}
  ): Promise<void> {
    const intensity = opts.intensity ?? 6
    const stepDuration = opts.stepDuration ?? 40
    const scale = intensity / 6

    try {
      if (hwnd === null) {
        const win = getCurrentWindow()
        const pos = await win.outerPosition()
        const origX = pos.x
        const origY = pos.y
        for (const [dx, dy] of BASE_OFFSETS) {
          await win.setPosition(new PhysicalPosition(
            origX + Math.round(dx * scale),
            origY + Math.round(dy * scale),
          ))
          if (stepDuration > 0) await new Promise(r => setTimeout(r, stepDuration))
        }
      } else {
        const rect = await invoke<HwndRect | null>('get_hwnd_rect', { hwnd })
        if (!rect) return
        const origX = rect.x
        const origY = rect.y
        for (const [dx, dy] of BASE_OFFSETS) {
          await invoke('set_hwnd_position', {
            hwnd,
            x: origX + Math.round(dx * scale),
            y: origY + Math.round(dy * scale),
          })
          if (stepDuration > 0) await new Promise(r => setTimeout(r, stepDuration))
        }
      }
    } catch {
      // Not in Tauri, or the target window disappeared mid-shake; silent.
    }
  }

  return { shakeWindowByHwnd }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/composables/__tests__/useWindowShake.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useWindowShake.ts src/composables/__tests__/useWindowShake.test.ts
git commit -m "feat(shake): add useWindowShake composable for pet and foreground windows"
```

---

## Task 3: Replace inline `shakeWindow()` in `App.vue` with new primitive

**Files:**
- Modify: `src/App.vue:779-795`

- [ ] **Step 1: Locate current `shakeWindow()` definition**

```bash
sed -n '779,795p' src/App.vue
```

Expected: the existing `async function shakeWindow()` using `getCurrentWindow().setPosition(...)` in a loop.

- [ ] **Step 2: Import and use `useWindowShake`; make `shakeWindow` a one-line wrapper**

In `src/App.vue`, find the imports section for composables (search for `useNotepadSlide` or similar) and add:

```typescript
import { useWindowShake } from './composables/useWindowShake'
```

Then inside `<script setup>` body (same level where other composables are instantiated, e.g. near `const { slideNotepadReminder } = useNotepadSlide()`), add:

```typescript
const { shakeWindowByHwnd } = useWindowShake()
```

Replace the body of `shakeWindow` (lines 779-795) with:

```typescript
async function shakeWindow() {
  await shakeWindowByHwnd(null)
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "refactor(shake): route shakeWindow through useWindowShake"
```

---

## Task 4: Add `useAlertUser` composable with test

**Files:**
- Create: `src/composables/useAlertUser.ts`
- Create: `src/composables/__tests__/useAlertUser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useAlertUser.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}))

// Mock useWindowShake so we can assert how it's called
const shakeMock = vi.fn(async () => {})
vi.mock('../useWindowShake', () => ({
  useWindowShake: () => ({ shakeWindowByHwnd: shakeMock }),
}))

import { useAlertUser } from '../useAlertUser'

describe('useAlertUser', () => {
  let playSound: ReturnType<typeof vi.fn>
  let walkTo: ReturnType<typeof vi.fn>
  let showSpeech: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invokeMock.mockReset()
    shakeMock.mockClear()
    playSound = vi.fn()
    walkTo = vi.fn(async () => {})
    showSpeech = vi.fn()
  })

  it('fallback path: shakes pet window when capture_foreground_hwnd returns false', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd') return Promise.resolve(false)
      return Promise.resolve(null)
    })

    const { alertUserWithPet } = useAlertUser({ playSound, walkTo, showSpeech })
    await alertUserWithPet('hello')

    expect(playSound).toHaveBeenCalledWith('notification')
    expect(shakeMock).toHaveBeenCalledWith(null) // pet window
    expect(walkTo).not.toHaveBeenCalled()
    expect(showSpeech).toHaveBeenCalledWith('hello')
  })

  it('happy path: captures hwnd, shakes it, walks pet fast, shows speech', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'capture_foreground_hwnd') return Promise.resolve(true)
      if (cmd === 'get_captured_hwnd') return Promise.resolve(99999)
      if (cmd === 'get_hwnd_rect') return Promise.resolve({ x: 200, y: 300, width: 800, height: 600 })
      return Promise.resolve(null)
    })

    const { alertUserWithPet } = useAlertUser({ playSound, walkTo, showSpeech })
    await alertUserWithPet('reminder text')

    expect(playSound).toHaveBeenCalledWith('notification')
    expect(shakeMock).toHaveBeenCalledWith(99999)
    expect(walkTo).toHaveBeenCalledTimes(1)
    // walkTo called with fast speed
    expect(walkTo.mock.calls[0][1]).toEqual({ speedMultiplier: 3 })
    // Anchor is top-edge-center of the rect
    const [x, y] = walkTo.mock.calls[0][0]
    expect(x).toBe(200 + 800 / 2)
    expect(y).toBe(300)
    expect(showSpeech).toHaveBeenCalledWith('reminder text')
  })

  it('accepts custom sound', async () => {
    invokeMock.mockImplementation(() => Promise.resolve(false))
    const { alertUserWithPet } = useAlertUser({ playSound, walkTo, showSpeech })
    await alertUserWithPet('x', { sound: 'summon' })
    expect(playSound).toHaveBeenCalledWith('summon')
  })
})
```

This test assumes a `get_captured_hwnd` Rust command that returns the last captured HWND as a number. **We need to add that** — see Task 5.

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/composables/__tests__/useAlertUser.test.ts
```

Expected: FAIL (module `../useAlertUser` not found).

- [ ] **Step 3: Implement `useAlertUser`**

Create `src/composables/useAlertUser.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'
import { useWindowShake } from './useWindowShake'

interface HwndRect {
  x: number
  y: number
  width: number
  height: number
}

export interface AlertUserDeps {
  /** Plays a sound effect by name. Pass through from the app's audio layer. */
  playSound: (name: string) => void
  /** Walks the pet to a target position (physical px). speedMultiplier applied. */
  walkTo: (
    target: [number, number],
    opts: { speedMultiplier?: number }
  ) => Promise<void>
  /** Shows the pet's speech bubble with the given text. */
  showSpeech: (text: string) => void
}

export interface AlertUserOptions {
  /** Sound name passed to playSound. Default 'notification'. */
  sound?: string
  /** Pet speed multiplier during the walk step. Default 3 (fast). */
  petSpeed?: number
}

/**
 * High-intensity "hey look here" alert. Plays a sound, shakes the
 * foreground window, runs the pet there, and shows a speech bubble.
 *
 * On platforms where foreground-window capture is unavailable (non-Windows,
 * or the capture call returned false), falls back to shaking the pet's
 * own window and still shows the speech bubble.
 */
export function useAlertUser(deps: AlertUserDeps) {
  const { shakeWindowByHwnd } = useWindowShake()

  async function alertUserWithPet(
    text: string,
    opts: AlertUserOptions = {}
  ): Promise<void> {
    const sound = opts.sound ?? 'notification'
    const speedMul = opts.petSpeed ?? 3

    deps.playSound(sound)

    let hwnd: number | null = null
    try {
      const captured = await invoke<boolean>('capture_foreground_hwnd')
      if (captured) {
        hwnd = await invoke<number | null>('get_captured_hwnd')
      }
    } catch {
      hwnd = null
    }

    if (hwnd === null) {
      await shakeWindowByHwnd(null)
      deps.showSpeech(text)
      return
    }

    // Fire shake and walk in parallel so the pet starts moving while the
    // foreground window is still wobbling.
    const shakePromise = shakeWindowByHwnd(hwnd)

    let rect: HwndRect | null = null
    try {
      rect = await invoke<HwndRect | null>('get_hwnd_rect', { hwnd })
    } catch { rect = null }

    if (rect) {
      const anchorX = rect.x + rect.width / 2
      const anchorY = rect.y // top-edge center
      await deps.walkTo([anchorX, anchorY], { speedMultiplier: speedMul })
    }

    await shakePromise
    deps.showSpeech(text)
  }

  return { alertUserWithPet }
}
```

- [ ] **Step 4: Run test — it should still fail because `get_captured_hwnd` is mocked but doesn't exist in Rust yet**

```bash
npm test -- src/composables/__tests__/useAlertUser.test.ts
```

Expected: PASS (the mocked invoke handler returns the value directly; actual Rust command isn't called during unit test).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useAlertUser.ts src/composables/__tests__/useAlertUser.test.ts
git commit -m "feat(alert): add useAlertUser composable composing shake + walk + speech"
```

---

## Task 5: Add `get_captured_hwnd` Rust command

The existing Rust code stores the captured HWND internally when
`capture_foreground_hwnd` is called, but currently exposes no way to read
that value back to JS. We need it so `useAlertUser` can pass the HWND to
`shakeWindowByHwnd` and `get_hwnd_rect`.

**Files:**
- Modify: `src-tauri/src/activity/platform/windows.rs` (or the file containing the HWND storage — inspect first)
- Modify: `src-tauri/src/lib.rs` — register the new command

- [ ] **Step 1: Find where the captured HWND is stored**

```bash
grep -rn 'capture_foreground_hwnd\|CAPTURED_HWND\|captured_hwnd' src-tauri/src/
```

Expected: the implementation of `capture_foreground_hwnd` stores a HWND in some static/mutex. Note the module path and identifier.

- [ ] **Step 2: Add a `get_captured_hwnd` accessor in the same module**

In the module where the captured HWND lives (likely `src-tauri/src/activity/platform/windows.rs` or similar), add a function that returns the stored HWND as `i64` (or `Option<i64>` if none captured yet):

```rust
/// Returns the HWND previously stored by `capture_foreground_hwnd`,
/// or None if no window has been captured yet. i64 to match the
/// numeric type used elsewhere (e.g. set_hwnd_position).
pub fn get_captured_hwnd() -> Option<i64> {
    // Replace CAPTURED_HWND with the actual static/lazy_static name found in step 1.
    let guard = CAPTURED_HWND.lock().ok()?;
    let h = *guard;
    if h == 0 { None } else { Some(h as i64) }
}
```

Adjust the locking and conversion to match the exact storage type found in step 1 (e.g. if stored as `HWND`, convert its `.0` field to `i64`).

- [ ] **Step 3: Expose the command in `src-tauri/src/lib.rs`**

Add a `#[tauri::command]` wrapper near the other similar commands (right after `capture_foreground_hwnd`):

```rust
#[tauri::command]
fn get_captured_hwnd() -> Option<i64> {
    activity::platform::get_captured_hwnd()
}
```

Then add `get_captured_hwnd` to the `tauri::generate_handler![...]` list in `run()`.

- [ ] **Step 4: Verify Rust compiles**

```bash
(cd src-tauri && cargo check)
```

Expected: clean build, no warnings about the new command.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/
git commit -m "feat(rust): expose get_captured_hwnd command to JS"
```

---

## Task 6: Wire the interval-reminder path to `alertUserWithPet`

**Files:**
- Modify: `src/App.vue:942-948` (the `else` branch of the reminder handler)

- [ ] **Step 1: Add a `walkTo` adapter and instantiate `useAlertUser`**

In `src/App.vue`, add the import:

```typescript
import { useAlertUser } from './composables/useAlertUser'
```

After the existing `const { startSummonWalk, ... } = usePushAnimation(...)` line, add:

```typescript
const { alertUserWithPet } = useAlertUser({
  playSound,
  walkTo: async ([x, y], opts) => {
    await startSummonWalk(x, y, { speedMultiplier: opts.speedMultiplier })
  },
  showSpeech: showSpeechText,
})
```

(If `showSpeechText` is defined after this point in the file, move the `useAlertUser(...)` instantiation below its definition — the goal is that it's in scope by the time the reminder timer fires.)

- [ ] **Step 2: Replace the interval-reminder `else` branch**

At `src/App.vue:942-948`, replace:

```typescript
      } else {
        // Interval reminder: keep original shake behavior
        showSpeechText(`📝 备忘提醒：${r.text}`)
        showToast({ type: 'info', icon: '📝', title: '备忘提醒！', message: r.text.slice(0, 50) })
        playSound('notification')
        shakeWindow()
      }
```

with:

```typescript
      } else {
        // Interval reminder: shake the user's foreground window and have the pet run over
        alertUserWithPet(`📝 备忘提醒：${r.text}`)
      }
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat(reminder): interval reminders shake foreground window and summon pet"
```

---

## Task 7: Fix panel top-most on re-open

**Files:**
- Modify: `src/composables/usePanelWindow.ts:128-143` (the `openPanel` function)

- [ ] **Step 1: Review current open logic**

```bash
sed -n '128,143p' src/composables/usePanelWindow.ts
```

Expected: the sequence `currentOpenPanel.value = panel; emitTo(...); win.center(); win.show(); win.setFocus()`.

- [ ] **Step 2: Insert an `alwaysOnTop` false→true toggle after `show()`**

Replace the function body at lines 128-143 with:

```typescript
  async function openPanel(panel: string, data: Record<string, any> = {}) {
    try {
      const win = await ensurePanelWindow()

      // Wait for panel JS to be ready before sending events
      await waitForPanelReady()

      currentOpenPanel.value = panel
      await emitTo('panel', 'panel:open', { panel, data })
      await win.center()
      await win.show()
      // Force Windows to re-insert the window at the top of the topmost
      // z-order. alwaysOnTop: true alone only keeps a window above
      // non-topmost peers; toggling false→true after show() pushes it
      // above other topmost windows too. Cheap and idempotent on macOS.
      await win.setAlwaysOnTop(false)
      await win.setAlwaysOnTop(true)
      await win.setFocus()
    } catch (e) {
      console.error('Failed to open panel:', e)
    }
  }
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/composables/usePanelWindow.ts
git commit -m "fix(panel): force topmost z-order via alwaysOnTop toggle on open"
```

---

## Task 8: Full test suite + final build

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: all tests pass, including the pre-existing `useMouseShakeDetector` tests and the two new test files.

- [ ] **Step 2: Run the frontend build**

```bash
npm run build
```

Expected: vue-tsc + vite build both succeed.

- [ ] **Step 3: (Optional, Windows only) Smoke test locally**

If on a Windows dev machine:

```bash
cargo tauri dev
```

Manual checks:
1. Create an interval reminder with a 1-minute interval via the Reminder panel.
2. Focus Notepad (or any window).
3. Wait ≤ 90 seconds. Observe:
   - Notification sound plays
   - Notepad visibly shakes (~500ms)
   - Pet rapidly walks over to the top-center of Notepad
   - Speech bubble appears with the reminder text
4. Right-click the pet → "状态". Close the panel.
5. Open a topmost app (e.g., QQ screenshot tool, or another Tauri app with alwaysOnTop).
6. Right-click → "状态" again. Confirm the panel sits above the topmost app.
7. Press `Ctrl+Shift+P` — pet summon should still walk at normal (not fast) speed — regression check for Task 1.

---

## Task 9: Version bump, commit, tag, ship

Following the Release SOP captured in `CLAUDE.md`:

- [ ] **Step 1: Bump version in all three files**

Update to `0.7.21`:
- `package.json` line 4
- `src-tauri/Cargo.toml` line 3
- `src-tauri/tauri.conf.json` line 3

- [ ] **Step 2: Run final build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Commit version bump**

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.7.21"
```

- [ ] **Step 4: Push master**

```bash
git push origin master
```

- [ ] **Step 5: Tag and push tag**

```bash
git tag v0.7.21
git push origin v0.7.21
```

- [ ] **Step 6: Watch CI**

```bash
gh run watch --exit-status
```

Expected: Build Windows Release job succeeds in ~8 minutes.

- [ ] **Step 7: Verify release assets (5 files: 2 installers + 2 .sig + latest.json)**

```bash
gh release view v0.7.21 --json assets --jq '.assets[].name'
```

Expected:
```
Hamster.Pet_0.7.21_x64-setup.exe
Hamster.Pet_0.7.21_x64-setup.exe.sig
Hamster.Pet_0.7.21_x64_en-US.msi
Hamster.Pet_0.7.21_x64_en-US.msi.sig
latest.json
```

- [ ] **Step 8: Sanity check `latest.json`**

```bash
curl -sL https://github.com/methiy/hamster-pet/releases/latest/download/latest.json
```

Expected: JSON with `"version": "0.7.21"` and three platform entries, each with a non-empty `signature`.

---

## Notes for the implementing engineer

- **No Rust changes beyond Task 5.** Don't touch `activity.rs`, `tray.rs`, or any other module.
- **Preserve existing behavior for once-mode reminders.** Only the `else` branch in the reminder handler changes.
- **Don't refactor `usePushAnimation.ts` further.** The `push` animations (user drags pet, pet pushes foreground window) are intentionally kept separate from the simpler `startSummonWalk`.
- **If `get_captured_hwnd` turns out to require a different storage pattern** (e.g. the HWND is stored in thread-local, per-window state, or isn't persisted between calls at all), escalate — do not invent a new capture mechanism. Options then are: (a) change `capture_foreground_hwnd` to return the HWND directly as `Option<i64>`, updating existing callers; or (b) read the foreground HWND fresh at the start of `alertUserWithPet` with a new `get_foreground_hwnd` command. Discuss before choosing.
