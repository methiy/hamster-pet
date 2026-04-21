# Design: Reminder Foreground Shake + Pet Alert + Panel Top-Most Fix

Date: 2026-04-21

## Problem

Two user-reported bugs in current release (v0.7.20):

1. **Interval reminder does not alert the window the user is working in.**
   Currently `shakeWindow()` shakes the pet's own window, which is easy to
   miss — the user is looking at Chrome / VSCode / whatever, not at the pet.
2. **Right-click panel fails to come to the front on re-open.**
   After the panel has been opened once, closed, and then re-opened, it
   sometimes ends up behind other top-most windows. `alwaysOnTop: true`
   only guarantees the window floats above non-topmost windows; it does
   not re-assert z-order on `show()`.

## Goals

- When an interval reminder fires, shake the window the user is actively
  using, then have the pet run quickly to that window and show a speech
  bubble with the reminder text.
- When any right-click panel (Status / Settings / About / etc.) is opened,
  it is reliably on top of every other window, regardless of prior state.
- Unify duplicated "walk the pet to X" and "shake a window" logic so
  future callers reuse the same primitives with an explicit speed option.

## Non-Goals

- Changing once-mode reminder behaviour (the notepad slide-in stays).
- Changing the summon-pet flow.
- Cross-platform parity: shaking a foreground window is Windows-only
  (uses `set_hwnd_position`). macOS/Linux fall back to shaking the pet's
  own window as today.

## Architecture

### New / refactored units

```
usePetWalk.ts              (new)   walkTo(target, { speed, onArrive })
useWindowShake.ts          (new)   shakeWindowByHwnd(hwnd | null, { intensity, stepDuration })
useAlertUser.ts            (new)   alertUserWithPet(text, { sound?, petSpeed? })
usePanelWindow.ts          (edit)  toggle alwaysOnTop in openPanel()
App.vue                    (edit)  interval-reminder branch calls alertUserWithPet
```

No new Rust commands required — `capture_foreground_hwnd`, `get_hwnd_rect`,
and `set_hwnd_position` already exist.

### Unit responsibilities

**`usePetWalk.ts`** — "walk the pet window to an absolute screen point"
- Signature: `walkTo(target: { x: number; y: number }, opts?: { speed?: 'normal' | 'fast' | number; onArrive?: () => void }): Promise<void>`
- `speed`: `'normal'` = current step cadence; `'fast'` ≈ 3× faster; number
  = explicit ms-per-step
- Internal: DPI scaling, facing-direction flip, cancellation if another
  walk starts
- Replaces the inline walk logic inside the `summon-pet` listener in
  `App.vue` (that listener calls `walkTo` instead)

**`useWindowShake.ts`** — "shake any window by HWND"
- Signature: `shakeWindowByHwnd(hwnd: number | null, opts?: { intensity?: number; stepDuration?: number }): Promise<void>`
- `hwnd = null` → shake the pet's own window (via `getCurrentWindow()`)
- `hwnd = number` → shake that HWND via `invoke('set_hwnd_position', ...)`
- Offset sequence identical to current `shakeWindow()`:
  `[6,0][-6,0][0,6][0,-6][4,0][-4,0][0,4][0,-4][2,0][-2,0][0,0]`
  scaled by `intensity / 6`
- Existing `App.vue :: shakeWindow()` becomes a one-liner wrapper:
  `shakeWindowByHwnd(null)`

**`useAlertUser.ts`** — "high-intensity 'hey look here' alert"
- Signature: `alertUserWithPet(text: string, opts?: { sound?: SoundName; petSpeed?: 'fast' | 'normal' | number }): Promise<void>`
- Sequence:
  1. `playSound(opts.sound ?? 'notification')` (fires immediately)
  2. `capture_foreground_hwnd()` → if success, `shakeWindowByHwnd(hwnd)`;
     else fall back to `shakeWindowByHwnd(null)`
  3. `get_hwnd_rect(hwnd)` → compute anchor = top-edge-center minus
     pet-window half-width/height offsets
  4. `walkTo(anchor, { speed: opts.petSpeed ?? 'fast' })`
  5. `showSpeechText(text)` on arrival
- Non-Windows / capture failure path: play sound + `shakeWindowByHwnd(null)`
  + `showSpeechText(text)` (matches today's interval behaviour plus sound)
- Returns when speech bubble has been set (caller doesn't wait for it to fade)

### Data flow for interval reminder

```
reminderTimer (every 30s)
  → checkDueReminders() returns interval-type due list
  → for each r:
      alertUserWithPet(`📝 备忘提醒：${r.text}`)
      (removed: separate showToast + shakeWindow calls)
```

The existing `showToast(...)` call in the interval branch is dropped —
the speech bubble + pet arrival is the notification; a toast is
redundant and adds visual noise.

### Panel top-most fix

In `usePanelWindow.ts :: openPanel()`:

```ts
await win.show()
await win.setAlwaysOnTop(false)
await win.setAlwaysOnTop(true)
await win.setFocus()
```

The false→true toggle forces Windows to re-insert the window at the top
of the topmost z-order. This is a standard Win32 idiom and is reliable
on Windows 10/11.

## Error Handling

- **`capture_foreground_hwnd` returns false** → log nothing, fall back
  to pet-window shake path (no foreground-window shake, still pet + bubble)
- **`get_hwnd_rect` returns null** → fall back to pet-window shake path
- **Pet walk cancelled mid-flight** (e.g., user summons pet or chase
  fires) → speech bubble still appears where the pet ends up; no crash
- **Non-Windows** (macOS/Linux) → the fallback path runs on every alert;
  no feature-detection branching in `App.vue`

## Testing

### Manual (primary)
1. Create an interval reminder with 1-minute interval; focus Notepad.
   Within 1 min: hear sound → Notepad shakes → pet runs over → bubble appears.
2. Open right-click menu → "状态" → close → open QQ or any topmost app →
   right-click → "状态" again → confirm panel is above the other topmost.
3. Verify summon-pet shortcut (`Ctrl+Shift+P`) still works (regression — it
   now goes through `walkTo`).

### Unit (vitest)
- `useWindowShake` offset sequence: mock invoke, assert correct
  sequence of `set_hwnd_position` calls for `hwnd = 12345`
- `usePetWalk` speed mapping: `'fast'` → ms-per-step < `'normal'` ms-per-step
- `useAlertUser` fallback: when `capture_foreground_hwnd` resolves false,
  `shakeWindowByHwnd` is called with `null`

## Scope Limits

- No Rust changes.
- No changes to once-mode reminder, notepad slide, chase cursor, or push
  animation.
- `usePushAnimation.ts` keeps its own walk logic (it's a more complex
  physics-driven push, not a simple walkTo). Not refactoring it into
  `walkTo` is intentional — different use case.
