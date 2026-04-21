# Notepad Reminder Slide + Cursor Chase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现两个桌宠互动功能：(1) 指定时间备忘到点时，在桌面创建真实 `.txt` 并用系统记事本打开，然后把记事本窗口从屏幕外随机方向滑到中央；(2) 用户在 pet 身上快速来回抖动鼠标时，pet 追逐鼠标 5 秒，追上开心、没追上生气，并有 20% 概率触发「骗你的」彩蛋。

**Architecture:**
- 功能 1：Rust 端新增 3 个 Win32 命令（创建记事本 + 控制任意 HWND 位置/尺寸），前端新增 `useNotepadSlide` composable 调用它们做逐帧滑入动画。只接入 `useReminder` 的 `type === 'once'` 分支，间隔备忘保持原 shake。
- 功能 2：纯前端实现。`HamsterSprite` 的 `hit-layer` 新增 `mousemove` 检测；新增 `useMouseShakeDetector`（滑动窗口统计方向翻转+距离）和 `useChaseCursor`（追逐循环、判定、彩蛋）；与已有 `usePushAnimation` 通过互斥标志协调。
- 两个功能独立，可分别单测和发版。非 Windows 平台功能 1 优雅回退到原 shake。

**Tech Stack:** Tauri v2、Vue 3 Composition API、TypeScript、Rust（windows crate 0.58）、Vitest（组件逻辑单测）。

---

## File Structure

### Rust（功能 1）
- **Modify** `src-tauri/src/activity.rs`
  - 新增 `create_reminder_notepad_inner(text) -> Result<i64, String>` — 写桌面 txt、spawn notepad、轮询拿 HWND
  - 新增 `set_hwnd_position_inner(hwnd: i64, x, y) -> bool` — `SetWindowPos(NOSIZE|NOZORDER|NOACTIVATE)`
  - 新增 `get_hwnd_rect_inner(hwnd: i64) -> Option<WindowRect>` — `GetWindowRect`
  - 新增 `#[cfg(not(windows))]` stub 版本
- **Modify** `src-tauri/src/lib.rs`
  - 新增 `#[tauri::command]` 包装：`create_reminder_notepad`、`set_hwnd_position`、`get_hwnd_rect`
  - 注册到 `invoke_handler`
- **Modify** `src-tauri/Cargo.toml`
  - `windows` crate 增加 `Win32_System_ProcessStatus` 和 `Win32_UI_WindowsAndMessaging`（后者已有）features 所需子项（实际上 `EnumWindows`、`GetWindowThreadProcessId` 都在 `Win32_UI_WindowsAndMessaging` 下，无需新增 feature）

### 前端（功能 1）
- **Create** `src/composables/useNotepadSlide.ts` — 滑入动画 orchestrator
- **Modify** `src/App.vue` — 在 `reminderTimer` 里按 `r.type` 分支；once 走 `slideNotepadReminder`，间隔保持原逻辑

### 前端（功能 2）
- **Create** `src/composables/useMouseShakeDetector.ts` — 方向翻转 + 距离累加检测
- **Create** `src/composables/useChaseCursor.ts` — 追逐循环 + 判定 + 彩蛋
- **Modify** `src/data/hamsterPhrases.ts` — 新增 4 组台词常量
- **Modify** `src/components/HamsterSprite.vue` — `hit-layer` 新增 `@mousemove` 委托给外部；新增 `chase-wiggle` CSS keyframe
- **Modify** `src/App.vue` — 初始化 shake detector + chase，接入 HamsterSprite，管理与 push 的互斥

### 测试
- **Create** `src/composables/__tests__/useMouseShakeDetector.test.ts`
- **Create** `src/composables/__tests__/useChaseCursor.test.ts`（仅判定逻辑，不测 Tauri 调用）
- **Modify** `package.json` — 若无 vitest 则添加 `devDependencies` 与 `test` 脚本
- **Create** `vitest.config.ts`（若无）

---

## Task 1: 建立前端单元测试环境

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 检查是否已有 vitest**

Run: `cd /data/workspace/hamster-pet && cat package.json | grep -i vitest`
Expected: 如无输出则继续；如已存在跳到 Task 2。

- [ ] **Step 2: 安装 vitest 及 jsdom**

Run: `cd /data/workspace/hamster-pet && npm install -D vitest @vue/test-utils jsdom`
Expected: 写入 package.json 的 devDependencies。

- [ ] **Step 3: 添加 test 脚本到 package.json**

在 `package.json` 的 `"scripts"` 块加入：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 创建 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: 验证 vitest 可运行**

Run: `cd /data/workspace/hamster-pet && npx vitest run --reporter=verbose`
Expected: `No test files found` 或类似 — 没有测试文件但命令成功（exit 0 或非错误崩溃）。

- [ ] **Step 6: Commit**

```bash
cd /data/workspace/hamster-pet
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for composable unit tests"
```

---

## Task 2: `useMouseShakeDetector` — TDD 检测算法

**Files:**
- Create: `src/composables/useMouseShakeDetector.ts`
- Create: `src/composables/__tests__/useMouseShakeDetector.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/composables/__tests__/useMouseShakeDetector.test.ts`：
```ts
import { describe, it, expect, vi } from 'vitest'
import { useMouseShakeDetector } from '../useMouseShakeDetector'

function mkEvent(x: number, y: number): MouseEvent {
  return { clientX: x, clientY: y } as unknown as MouseEvent
}

describe('useMouseShakeDetector', () => {
  it('does not trigger on straight-line movement', () => {
    const onShake = vi.fn()
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => 0,
    })
    // Linear motion: no direction reversals
    onMouseMove(mkEvent(0, 0))
    onMouseMove(mkEvent(50, 0))
    onMouseMove(mkEvent(100, 0))
    onMouseMove(mkEvent(150, 0))
    onMouseMove(mkEvent(200, 0))
    expect(onShake).not.toHaveBeenCalled()
  })

  it('triggers when reversals >= 4 and distance >= 300 within window', () => {
    const onShake = vi.fn()
    let t = 0
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => t,
    })
    // 5 reversals, 500 total px, all within 800ms
    const xs = [0, 100, 0, 100, 0, 100]
    for (const x of xs) {
      t += 100
      onMouseMove(mkEvent(x, 0))
    }
    expect(onShake).toHaveBeenCalledTimes(1)
  })

  it('does not re-trigger during cooldown', () => {
    const onShake = vi.fn()
    let t = 0
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => t,
      cooldownMs: 5000,
    })
    const shake = () => {
      const xs = [0, 100, 0, 100, 0, 100]
      for (const x of xs) {
        t += 100
        onMouseMove(mkEvent(x, 0))
      }
    }
    shake()
    expect(onShake).toHaveBeenCalledTimes(1)
    // Second shake within cooldown
    t += 1000
    shake()
    expect(onShake).toHaveBeenCalledTimes(1)
    // After cooldown
    t += 6000
    shake()
    expect(onShake).toHaveBeenCalledTimes(2)
  })

  it('prunes old events outside the window', () => {
    const onShake = vi.fn()
    let t = 0
    const { onMouseMove } = useMouseShakeDetector(onShake, {
      now: () => t,
      windowMs: 800,
    })
    // First 3 reversals very old
    onMouseMove(mkEvent(0, 0)); t += 100
    onMouseMove(mkEvent(100, 0)); t += 100
    onMouseMove(mkEvent(0, 0)); t += 1500 // way after window
    // After pruning, only the next events count
    onMouseMove(mkEvent(100, 0)); t += 100
    onMouseMove(mkEvent(0, 0)); t += 100
    expect(onShake).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试，验证失败**

Run: `cd /data/workspace/hamster-pet && npx vitest run src/composables/__tests__/useMouseShakeDetector.test.ts`
Expected: FAIL（module not found: `useMouseShakeDetector`）。

- [ ] **Step 3: 实现 `useMouseShakeDetector`**

创建 `src/composables/useMouseShakeDetector.ts`：
```ts
interface ShakeEvent {
  x: number
  y: number
  t: number
}

interface DetectorOptions {
  /** 统计窗口毫秒，默认 800 */
  windowMs?: number
  /** 最少方向翻转次数，默认 4 */
  minReversals?: number
  /** 最小累计像素距离，默认 300 */
  minDistance?: number
  /** 触发后冷却毫秒，默认 5000 */
  cooldownMs?: number
  /** 时间源，测试用 */
  now?: () => number
}

export function useMouseShakeDetector(
  onShake: () => void,
  opts: DetectorOptions = {},
) {
  const windowMs = opts.windowMs ?? 800
  const minReversals = opts.minReversals ?? 4
  const minDistance = opts.minDistance ?? 300
  const cooldownMs = opts.cooldownMs ?? 5000
  const now = opts.now ?? (() => performance.now())

  const events: ShakeEvent[] = []
  let lastTriggerAt = -Infinity

  function onMouseMove(e: MouseEvent) {
    const t = now()
    events.push({ x: e.clientX, y: e.clientY, t })

    // Prune events outside window
    const cutoff = t - windowMs
    while (events.length > 0 && events[0].t < cutoff) {
      events.shift()
    }

    // Cooldown check
    if (t - lastTriggerAt < cooldownMs) return

    if (events.length < 3) return

    // Compute reversals + distance
    let reversals = 0
    let distance = 0
    let prevDirX = 0
    let prevDirY = 0
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x
      const dy = events[i].y - events[i - 1].y
      distance += Math.sqrt(dx * dx + dy * dy)
      const dirX = Math.sign(dx)
      const dirY = Math.sign(dy)
      if (i > 1) {
        if ((dirX !== 0 && prevDirX !== 0 && dirX !== prevDirX) ||
            (dirY !== 0 && prevDirY !== 0 && dirY !== prevDirY)) {
          reversals++
        }
      }
      if (dirX !== 0) prevDirX = dirX
      if (dirY !== 0) prevDirY = dirY
    }

    if (reversals >= minReversals && distance >= minDistance) {
      lastTriggerAt = t
      events.length = 0
      onShake()
    }
  }

  function reset() {
    events.length = 0
    lastTriggerAt = -Infinity
  }

  return { onMouseMove, reset }
}
```

- [ ] **Step 4: 运行测试，验证通过**

Run: `cd /data/workspace/hamster-pet && npx vitest run src/composables/__tests__/useMouseShakeDetector.test.ts`
Expected: 4 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/composables/useMouseShakeDetector.ts src/composables/__tests__/useMouseShakeDetector.test.ts
git commit -m "feat: add useMouseShakeDetector composable with TDD"
```

---

## Task 3: `useChaseCursor` — 纯 TS 追逐判定逻辑 TDD

> 注意：Tauri 窗口移动无法在单测里测；本 task 只测**判定逻辑**（`evaluateCatch`、`shouldTriggerPrank` 等纯函数），动画接入放 Task 4。

**Files:**
- Create: `src/composables/useChaseCursor.ts`
- Create: `src/composables/__tests__/useChaseCursor.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect, vi } from 'vitest'
import { evaluateCatch, shouldTriggerPrank, type DistanceSample } from '../useChaseCursor'

describe('evaluateCatch', () => {
  it('returns true when last 500ms distances all < threshold', () => {
    const samples: DistanceSample[] = [
      { t: 0,    dist: 200 },
      { t: 4500, dist: 70 },
      { t: 4700, dist: 60 },
      { t: 4900, dist: 50 },
      { t: 5000, dist: 40 },
    ]
    expect(evaluateCatch(samples, 5000, { threshold: 80, holdMs: 500 })).toBe(true)
  })

  it('returns false when last sample within threshold but window not filled', () => {
    const samples: DistanceSample[] = [
      { t: 0,    dist: 200 },
      { t: 4900, dist: 70 },
      { t: 5000, dist: 60 },
    ]
    expect(evaluateCatch(samples, 5000, { threshold: 80, holdMs: 500 })).toBe(false)
  })

  it('returns false when any sample in the hold window exceeds threshold', () => {
    const samples: DistanceSample[] = [
      { t: 4500, dist: 70 },
      { t: 4700, dist: 150 }, // too far in window
      { t: 4900, dist: 50 },
      { t: 5000, dist: 40 },
    ]
    expect(evaluateCatch(samples, 5000, { threshold: 80, holdMs: 500 })).toBe(false)
  })
})

describe('shouldTriggerPrank', () => {
  it('triggers when random < prankChance', () => {
    expect(shouldTriggerPrank(0.1, 0.2)).toBe(true)
  })
  it('does not trigger when random >= prankChance', () => {
    expect(shouldTriggerPrank(0.5, 0.2)).toBe(false)
    expect(shouldTriggerPrank(0.2, 0.2)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，验证失败**

Run: `cd /data/workspace/hamster-pet && npx vitest run src/composables/__tests__/useChaseCursor.test.ts`
Expected: FAIL（module/export 不存在）。

- [ ] **Step 3: 实现纯判定函数 + composable stub**

创建 `src/composables/useChaseCursor.ts`：
```ts
import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { invoke } from '@tauri-apps/api/core'
import type { HamsterState } from './useHamster'
import {
  CHASE_START_PHRASES,
  CHASE_CATCH_PHRASES,
  CHASE_FAIL_PHRASES,
  CHASE_PRANK_PHRASES,
} from '../data/hamsterPhrases'

export interface DistanceSample {
  t: number
  dist: number
}

export interface CatchOptions {
  threshold: number
  holdMs: number
}

/** 判定是否追上：最近 holdMs 内所有采样点距离都 < threshold */
export function evaluateCatch(
  samples: DistanceSample[],
  nowT: number,
  opts: CatchOptions,
): boolean {
  const cutoff = nowT - opts.holdMs
  const recent = samples.filter(s => s.t >= cutoff)
  if (recent.length === 0) return false
  // 需要窗口确实被填满——第一条采样必须早于等于 cutoff 前的紧邻采样
  const earliest = recent[0].t
  if (earliest > cutoff + 50) return false // 窗口还没填够
  return recent.every(s => s.dist < opts.threshold)
}

/** 彩蛋概率判定（可测） */
export function shouldTriggerPrank(roll: number, prankChance: number): boolean {
  return roll < prankChance
}

interface ChaseCallbacks {
  showSpeech: (text: string) => void
  triggerReaction: (state: HamsterState, duration: number) => void
  playSound: (name: string) => void
}

// Tunables
const CHASE_TIMEOUT_MS = 5000
const CATCH_THRESHOLD_PX = 80
const CATCH_HOLD_MS = 500
const PRANK_CHANCE = 0.2
const CHASE_WALK_SPEED = 0.25 // px per ms

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function useChaseCursor(callbacks: ChaseCallbacks) {
  const isChasing = ref(false)
  let cancelled = false
  let animationFrame: number | null = null

  async function startChase(): Promise<void> {
    if (isChasing.value) return
    isChasing.value = true
    cancelled = false

    try {
      const appWindow = getCurrentWindow()
      const startPos = await appWindow.outerPosition()
      const startX = startPos.x
      const startY = startPos.y

      let scale = 1.0
      try { scale = await appWindow.scaleFactor() } catch { /* fallback */ }

      const win = await appWindow.outerSize()
      const petHalfW = win.width / 2
      const petHalfH = win.height / 2

      callbacks.showSpeech(pickRandom(CHASE_START_PHRASES))
      callbacks.triggerReaction('running', CHASE_TIMEOUT_MS + 500)

      const chaseStart = performance.now()
      const samples: DistanceSample[] = []
      let petX = startX
      let petY = startY

      // Chase loop
      await new Promise<void>((resolve) => {
        function step(now: number) {
          if (cancelled) { resolve(); return }
          const elapsed = now - chaseStart
          if (elapsed >= CHASE_TIMEOUT_MS) { resolve(); return }

          // Poll cursor (fire and forget — we use last known in closure via invoke-and-update)
          invoke<{ x: number; y: number } | null>('get_cursor_position').then(cur => {
            if (!cur) return
            const targetX = cur.x - petHalfW
            const targetY = cur.y - petHalfH

            const dx = targetX - petX
            const dy = targetY - petY
            const dist = Math.sqrt(dx * dx + dy * dy)

            samples.push({ t: elapsed, dist })
            // Prune old samples
            const cutoff = elapsed - CATCH_HOLD_MS - 100
            while (samples.length > 0 && samples[0].t < cutoff) {
              samples.shift()
            }

            const frameMs = 16.67
            const moveThis = CHASE_WALK_SPEED * frameMs
            const ratio = dist > 0 ? Math.min(moveThis / dist, 1) : 0
            petX += dx * ratio
            petY += dy * ratio

            appWindow.setPosition(new PhysicalPosition(Math.round(petX), Math.round(petY)))
              .catch(() => {})
          }).catch(() => {})

          animationFrame = requestAnimationFrame(step)
        }
        animationFrame = requestAnimationFrame(step)
      })
      if (cancelled) return

      // Evaluate catch
      const caught = evaluateCatch(samples, CHASE_TIMEOUT_MS, {
        threshold: CATCH_THRESHOLD_PX * scale,
        holdMs: CATCH_HOLD_MS,
      })

      if (caught) {
        callbacks.triggerReaction('happy', 3000)
        callbacks.showSpeech(pickRandom(CHASE_CATCH_PHRASES))
        callbacks.playSound('happy')
        await sleep(2000)
      } else {
        callbacks.showSpeech(pickRandom(CHASE_FAIL_PHRASES))
        callbacks.triggerReaction('hiding', 2000)
        await sleep(1500)

        if (shouldTriggerPrank(Math.random(), PRANK_CHANCE)) {
          // Teleport to cursor
          try {
            const cur = await invoke<{ x: number; y: number } | null>('get_cursor_position')
            if (cur) {
              await appWindow.setPosition(
                new PhysicalPosition(Math.round(cur.x - petHalfW), Math.round(cur.y - petHalfH)),
              )
            }
          } catch { /* ignore */ }
          callbacks.showSpeech(pickRandom(CHASE_PRANK_PHRASES))
          callbacks.triggerReaction('happy', 3000)
          callbacks.playSound('happy')
          // Wiggle is applied via state class in App.vue
          await sleep(3000)
        } else {
          await sleep(1000)
        }
      }

      // Walk back to start
      await walkBack(startX, startY)
    } catch {
      /* not in tauri or aborted */
    } finally {
      isChasing.value = false
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    }
  }

  async function walkBack(targetX: number, targetY: number): Promise<void> {
    const appWindow = getCurrentWindow()
    const cur = await appWindow.outerPosition()
    const dx = targetX - cur.x
    const dy = targetY - cur.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 3) return
    const duration = Math.max(dist / CHASE_WALK_SPEED, 600)
    const startT = performance.now()
    const startX = cur.x
    const startY = cur.y
    await new Promise<void>((resolve) => {
      function step(now: number) {
        if (cancelled) { resolve(); return }
        const p = Math.min((now - startT) / duration, 1)
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        const x = startX + dx * eased
        const y = startY + dy * eased
        appWindow.setPosition(new PhysicalPosition(Math.round(x), Math.round(y))).catch(() => {})
        if (p < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function cancel() {
    cancelled = true
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    isChasing.value = false
  }

  return { isChasing, startChase, cancel }
}
```

- [ ] **Step 4: 运行测试，验证通过**

Run: `cd /data/workspace/hamster-pet && npx vitest run src/composables/__tests__/useChaseCursor.test.ts`
Expected: 5 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/composables/useChaseCursor.ts src/composables/__tests__/useChaseCursor.test.ts
git commit -m "feat: add useChaseCursor with catch evaluation TDD"
```

---

## Task 4: 新增追逐台词到 `hamsterPhrases.ts`

**Files:**
- Modify: `src/data/hamsterPhrases.ts`

- [ ] **Step 1: 编辑文件尾部追加 4 组常量**

在文件末尾追加：
```ts

/** 鼠标追逐：开始时的台词 */
export const CHASE_START_PHRASES: string[] = [
  '你干嘛～追上你！',
  '哎呀！别动！',
  '站住！！',
  '欠揍的小主人～',
  '看我抓到你！',
]

/** 5 秒内追上时的台词 */
export const CHASE_CATCH_PHRASES: string[] = [
  '哈～追到啦！',
  '抓住你了！嘿嘿嘿～',
  '逃不掉了！',
  '就知道追得上！',
]

/** 5 秒内没追上时的台词 */
export const CHASE_FAIL_PHRASES: string[] = [
  '哼！再也不给主人玩了！',
  '累死了…没追上…',
  '气死我了！！',
  '主人坏坏！',
]

/** 没追上后触发的「骗你的」彩蛋台词 */
export const CHASE_PRANK_PHRASES: string[] = [
  '骗你的～追到咯！！！',
  '嘿嘿，装累的～',
  '其实我早就追上啦！',
  '哼哼，惊喜吧～',
]
```

- [ ] **Step 2: 验证 TS 编译**

Run: `cd /data/workspace/hamster-pet && npx vue-tsc --noEmit`
Expected: 无错误（或仅已有错误，不新增）。

- [ ] **Step 3: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/data/hamsterPhrases.ts
git commit -m "feat: add chase phrase sets for cursor chase feature"
```

---

## Task 5: `HamsterSprite` 暴露 mousemove 事件

**Files:**
- Modify: `src/components/HamsterSprite.vue`

- [ ] **Step 1: 修改 emits 定义**

找到 `defineEmits`，添加 `'hit-mousemove': [e: MouseEvent]` 到 emits union：
```ts
const emit = defineEmits<{
  'region-click': [region: BodyRegion]
  'region-hover': [region: BodyRegion | null]
  'miss-click': [e: MouseEvent]
  'grab-start': []
  'grab-move': [screenX: number, screenY: number]
  'grab-end': []
  'hit-mousemove': [e: MouseEvent]
}>()
```

- [ ] **Step 2: 在 hit-layer 增加事件代理**

找到现有 `onHover` 函数定义，改写它让它同时 emit hit-mousemove：
```ts
function onHover(e: MouseEvent) {
  emit('hit-mousemove', e)
  // Existing hover-region computation below (保留原有逻辑不动)
  // ...existing code...
}
```
（注意：**不要**动模板里的 `@mousemove="onHover"`，原流程保留。只是在 `onHover` 函数内第一行加 `emit('hit-mousemove', e)`。）

- [ ] **Step 3: 新增 `chase-wiggle` CSS keyframe**

在 `<style scoped>` 里追加：
```css
@keyframes chase-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-8deg); }
  75%      { transform: rotate(8deg); }
}
.hamster-sprite.chase-wiggle {
  animation: chase-wiggle 0.3s ease-in-out 6;
}
```

- [ ] **Step 4: 在根 div 绑定可选的 wiggle class**

修改模板根 div：
```vue
<div class="hamster-sprite" :class="{ 'hamster-lifted': isGrabbed, 'chase-wiggle': wiggle }">
```

并在 props 加入：
```ts
const props = defineProps<{
  state: SpriteState
  wiggle?: boolean
}>()
```

- [ ] **Step 5: 验证 TS 编译**

Run: `cd /data/workspace/hamster-pet && npx vue-tsc --noEmit`
Expected: 无新增错误。

- [ ] **Step 6: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/components/HamsterSprite.vue
git commit -m "feat: expose hit-mousemove event and wiggle class on HamsterSprite"
```

---

## Task 6: 在 `App.vue` 接入 chase 功能

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 添加 import**

在 import 区追加：
```ts
import { useMouseShakeDetector } from './composables/useMouseShakeDetector'
import { useChaseCursor } from './composables/useChaseCursor'
```

- [ ] **Step 2: 初始化 chase + detector**

在 `const { isPushing, ... } = usePushAnimation(...)` 之后新增：
```ts
// --- Cursor chase feature ---
const chaseWiggle = ref(false)
const { isChasing, startChase } = useChaseCursor({
  showSpeech: showSpeechText,
  triggerReaction,
  playSound,
})

const { onMouseMove: onShakeMouseMove } = useMouseShakeDetector(() => {
  // Don't start chase while other animations are active
  if (isChasing.value) return
  if (isPushing.value || isWalking.value || isWalkingBack.value) return
  if (isGrabbing.value) return
  // Show wiggle during prank phase — simplest hook: watch chase completion? we just
  // flip wiggle briefly when chase completes. See Step 3.
  startChase()
})
```

- [ ] **Step 3: 模板绑定 + wiggle 触发**

找到 `<HamsterSprite` 标签，添加一个 prop 和一个事件：
```vue
<HamsterSprite
  :state="displayState"
  :wiggle="chaseWiggle"
  @region-click="onRegionClick"
  @region-hover="onRegionHover"
  @miss-click="onMissClick"
  @grab-start="onGrabStart"
  @grab-move="onGrabMove"
  @grab-end="onGrabEnd"
  @hit-mousemove="onShakeMouseMove"
/>
```

- [ ] **Step 4: 追逐彩蛋播放时短暂开启 wiggle**

在 `useChaseCursor` 的 callbacks 里不能直接控制 App.vue 的 ref — 改为：**在 App.vue 里 watch `isChasing`**，并在 chase 结束后如果最近一次是 prank 分支就把 wiggle 开 2 秒。

简化方案：直接扩展 `useChaseCursor` 的回调接口，新增 `onPrank: () => void` 回调，在 App.vue 里用它开 wiggle。先改 composable：

编辑 `src/composables/useChaseCursor.ts`，在 `ChaseCallbacks` 接口加入：
```ts
interface ChaseCallbacks {
  showSpeech: (text: string) => void
  triggerReaction: (state: HamsterState, duration: number) => void
  playSound: (name: string) => void
  onPrank?: () => void
}
```

并在彩蛋分支触发处（瞬移后、showSpeech 之前）调用：
```ts
callbacks.onPrank?.()
```

- [ ] **Step 5: App.vue 里传入 onPrank**

```ts
const { isChasing, startChase } = useChaseCursor({
  showSpeech: showSpeechText,
  triggerReaction,
  playSound,
  onPrank: () => {
    chaseWiggle.value = true
    setTimeout(() => { chaseWiggle.value = false }, 1800)
  },
})
```

- [ ] **Step 6: activity reaction 与 chase 互斥**

找到 `useActivityReaction(...)` 调用——其 `startPush` 会触发 push。添加守卫：
```ts
startPush: (activity: ActivityType) => {
  if (isChasing.value) return
  startPush(activity, windowInfo.value?.rect ?? null, windowInfo.value?.process_name)
},
startVideoPause: () => {
  if (isChasing.value) return
  startVideoPause(windowInfo.value?.rect ?? null, windowInfo.value?.process_name)
},
```

- [ ] **Step 7: 运行 `npm run build` 确认前端构建通过**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build 成功，dist/ 生成。

- [ ] **Step 8: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/App.vue src/composables/useChaseCursor.ts
git commit -m "feat: wire cursor chase feature into App with push mutex"
```

---

## Task 7: Rust — `get_hwnd_rect` + `set_hwnd_position`

**Files:**
- Modify: `src-tauri/src/activity.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 修改 `activity.rs`，在 `#[cfg(target_os = "windows")] pub mod platform` 中新增**

在 `get_cursor_position` 之后添加：
```rust
pub fn set_hwnd_position(hwnd_raw: i64, x: i32, y: i32) -> bool {
    if hwnd_raw == 0 {
        return false;
    }
    unsafe {
        let hwnd = HWND(hwnd_raw as *mut _);
        SetWindowPos(
            hwnd,
            None,
            x,
            y,
            0,
            0,
            SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
        ).is_ok()
    }
}

pub fn get_hwnd_rect(hwnd_raw: i64) -> Option<WindowRect> {
    if hwnd_raw == 0 {
        return None;
    }
    unsafe {
        let hwnd = HWND(hwnd_raw as *mut _);
        let mut rect = RECT::default();
        if WinGetWindowRect(hwnd, &mut rect).is_ok() {
            Some(WindowRect {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
            })
        } else {
            None
        }
    }
}
```

- [ ] **Step 2: 在 `#[cfg(not(target_os = "windows"))] pub mod platform` 中新增 stub**

```rust
pub fn set_hwnd_position(_hwnd_raw: i64, _x: i32, _y: i32) -> bool {
    false
}

pub fn get_hwnd_rect(_hwnd_raw: i64) -> Option<WindowRect> {
    None
}
```

- [ ] **Step 3: 在 `lib.rs` 暴露 Tauri 命令**

在现有命令块添加：
```rust
#[tauri::command]
fn set_hwnd_position(hwnd: i64, x: i32, y: i32) -> bool {
    activity::platform::set_hwnd_position(hwnd, x, y)
}

#[tauri::command]
fn get_hwnd_rect(hwnd: i64) -> Option<activity::WindowRect> {
    activity::platform::get_hwnd_rect(hwnd)
}
```

并把这两个命令加入 `invoke_handler![...]`：
```rust
.invoke_handler(tauri::generate_handler![
    get_active_window, get_idle_time, move_foreground_window,
    capture_foreground_hwnd, move_captured_window, send_space_to_window,
    get_cursor_position, set_window_bounds, show_context_menu,
    set_hwnd_position, get_hwnd_rect,
])
```

- [ ] **Step 4: 编译 Rust**

Run: `cd /data/workspace/hamster-pet/src-tauri && cargo build`
Expected: `Compiling hamster-pet ... Finished dev` 无错误。

- [ ] **Step 5: Commit**

```bash
cd /data/workspace/hamster-pet
git add src-tauri/src/activity.rs src-tauri/src/lib.rs
git commit -m "feat(rust): add set_hwnd_position and get_hwnd_rect commands"
```

---

## Task 8: Rust — `create_reminder_notepad` 命令

**Files:**
- Modify: `src-tauri/src/activity.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: 检查 `windows` crate 需要的 feature**

本 task 需要 `EnumWindows`、`IsWindowVisible`、`GetWindowThreadProcessId`。这些都已在 `Win32_UI_WindowsAndMessaging` feature 下，Cargo.toml 已开。无需改 Cargo.toml。

确认：Run `cd /data/workspace/hamster-pet/src-tauri && grep 'Win32_UI_WindowsAndMessaging' Cargo.toml`
Expected: 输出该 feature 所在的行。

- [ ] **Step 2: 在 `activity.rs` 顶部 Windows 模块添加 use**

在 `use windows::Win32::UI::WindowsAndMessaging::{...}` 块中追加 `EnumWindows, IsWindowVisible`：
```rust
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    GetWindowRect as WinGetWindowRect,
    SetWindowPos, SWP_NOSIZE, SWP_NOZORDER, SWP_NOACTIVATE,
    GetCursorPos,
    EnumWindows, IsWindowVisible,
};
use windows::Win32::Foundation::LPARAM;
use windows::Win32::Foundation::BOOL;
```

- [ ] **Step 3: 实现 `create_reminder_notepad`**

在 `get_hwnd_rect` 后追加：
```rust
use std::process::Command;
use std::path::PathBuf;

/// Create a txt file on the Desktop with the given text, open it with notepad,
/// and poll for the resulting HWND. Returns HWND as i64 on success.
pub fn create_reminder_notepad(text: &str) -> Result<i64, String> {
    // 1. Compute desktop path
    let desktop = get_desktop_dir().ok_or_else(|| "cannot resolve desktop".to_string())?;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let filename = format!("reminder-{}.txt", ts);
    let full_path = desktop.join(&filename);

    // 2. Write UTF-8 BOM + text so notepad shows Chinese correctly
    let mut bytes: Vec<u8> = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice(text.as_bytes());
    std::fs::write(&full_path, &bytes).map_err(|e| format!("write txt: {}", e))?;

    // 3. Spawn notepad
    let child = Command::new("notepad.exe")
        .arg(&full_path)
        .spawn()
        .map_err(|e| format!("spawn notepad: {}", e))?;
    let target_pid = child.id();

    // 4. Poll for HWND whose process PID matches
    for _ in 0..20 {
        std::thread::sleep(std::time::Duration::from_millis(100));
        if let Some(hwnd) = find_hwnd_by_pid(target_pid) {
            return Ok(hwnd);
        }
    }
    Err(format!("hwnd not found for pid {}", target_pid))
}

fn get_desktop_dir() -> Option<PathBuf> {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let p = PathBuf::from(profile).join("Desktop");
        if p.exists() { return Some(p); }
        // OneDrive redirect fallback
        let one = PathBuf::from(&std::env::var("USERPROFILE").ok()?)
            .join("OneDrive").join("Desktop");
        if one.exists() { return Some(one); }
        return Some(p); // return original even if it doesn't exist
    }
    None
}

struct EnumState {
    target_pid: u32,
    found: isize,
}

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let state_ptr = lparam.0 as *mut EnumState;
    let state = &mut *state_ptr;
    if !IsWindowVisible(hwnd).as_bool() {
        return BOOL(1);
    }
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if pid == state.target_pid {
        state.found = hwnd.0 as isize;
        return BOOL(0); // stop
    }
    BOOL(1) // continue
}

fn find_hwnd_by_pid(pid: u32) -> Option<i64> {
    let mut state = EnumState { target_pid: pid, found: 0 };
    unsafe {
        let _ = EnumWindows(Some(enum_proc), LPARAM(&mut state as *mut _ as isize));
    }
    if state.found != 0 { Some(state.found as i64) } else { None }
}
```

- [ ] **Step 4: 添加非 Windows stub**

在 `#[cfg(not(target_os = "windows"))] pub mod platform` 末尾追加：
```rust
pub fn create_reminder_notepad(_text: &str) -> Result<i64, String> {
    Err("unsupported platform".to_string())
}
```

- [ ] **Step 5: 在 `lib.rs` 暴露命令**

```rust
#[tauri::command]
fn create_reminder_notepad(text: String) -> Result<i64, String> {
    activity::platform::create_reminder_notepad(&text)
}
```

并加入 `invoke_handler![...]` 列表末尾：`create_reminder_notepad`。

- [ ] **Step 6: 编译**

Run: `cd /data/workspace/hamster-pet/src-tauri && cargo build`
Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
cd /data/workspace/hamster-pet
git add src-tauri/src/activity.rs src-tauri/src/lib.rs
git commit -m "feat(rust): add create_reminder_notepad command"
```

---

## Task 9: `useNotepadSlide` composable

**Files:**
- Create: `src/composables/useNotepadSlide.ts`

- [ ] **Step 1: 创建文件**

```ts
import { invoke } from '@tauri-apps/api/core'
import { currentMonitor } from '@tauri-apps/api/window'

interface Rect { left: number; top: number; right: number; bottom: number }

type Direction = 'left' | 'right' | 'top' | 'bottom'

const SLIDE_DURATION_MS = 800

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function pickDir(): Direction {
  const dirs: Direction[] = ['left', 'right', 'top', 'bottom']
  return dirs[Math.floor(Math.random() * dirs.length)]
}

export function useNotepadSlide() {
  /**
   * Creates a desktop reminder .txt, opens it with notepad, and slides the
   * notepad window from off-screen to screen center. Returns true on success.
   * On any failure returns false so caller can fall back to old behavior.
   */
  async function slideNotepadReminder(text: string): Promise<boolean> {
    let hwnd: number
    try {
      hwnd = await invoke<number>('create_reminder_notepad', { text })
    } catch {
      return false
    }
    if (!hwnd) return false

    try {
      const monitor = await currentMonitor()
      if (!monitor) return false
      const mPos = monitor.position // physical px
      const mSize = monitor.size    // physical px

      // Wait one frame so notepad has resized its window
      await new Promise(r => setTimeout(r, 120))
      const rect = await invoke<Rect | null>('get_hwnd_rect', { hwnd })
      if (!rect) return false
      const w = rect.right - rect.left
      const h = rect.bottom - rect.top

      const centerX = Math.round(mPos.x + (mSize.width - w) / 2)
      const centerY = Math.round(mPos.y + (mSize.height - h) / 2)

      const dir = pickDir()
      let startX = centerX, startY = centerY
      switch (dir) {
        case 'left':   startX = mPos.x - w - 20; startY = centerY; break
        case 'right':  startX = mPos.x + mSize.width + 20; startY = centerY; break
        case 'top':    startX = centerX; startY = mPos.y - h - 20; break
        case 'bottom': startX = centerX; startY = mPos.y + mSize.height + 20; break
      }

      // Place at off-screen start, then animate
      await invoke('set_hwnd_position', { hwnd, x: startX, y: startY })

      await new Promise<void>((resolve) => {
        const t0 = performance.now()
        function step(now: number) {
          const p = Math.min((now - t0) / SLIDE_DURATION_MS, 1)
          const e = easeOutCubic(p)
          const x = Math.round(startX + (centerX - startX) * e)
          const y = Math.round(startY + (centerY - startY) * e)
          invoke('set_hwnd_position', { hwnd, x, y }).catch(() => {})
          if (p < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })

      return true
    } catch {
      return false
    }
  }

  return { slideNotepadReminder }
}
```

- [ ] **Step 2: 验证 TS 编译**

Run: `cd /data/workspace/hamster-pet && npx vue-tsc --noEmit`
Expected: 无新增错误。

- [ ] **Step 3: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/composables/useNotepadSlide.ts
git commit -m "feat: add useNotepadSlide composable"
```

---

## Task 10: 接入 once 提醒分支到 `App.vue`

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 添加 import**

```ts
import { useNotepadSlide } from './composables/useNotepadSlide'
```

- [ ] **Step 2: 初始化**

在其他 composable 初始化附近（比如 `const { playSound } = useAudio(...)` 之后）：
```ts
const { slideNotepadReminder } = useNotepadSlide()
```

- [ ] **Step 3: 修改 `reminderTimer` 回调**

找到这段（约 L893-901）：
```ts
reminderTimer = setInterval(() => {
  const due = checkDueReminders()
  for (const r of due) {
    showSpeechText(`📝 备忘提醒：${r.text}`)
    showToast({ type: 'info', icon: '📝', title: '备忘提醒！', message: r.text.slice(0, 50) })
    playSound('notification')
    shakeWindow()
  }
}, 30000)
```

改为：
```ts
reminderTimer = setInterval(() => {
  const due = checkDueReminders()
  for (const r of due) {
    if (r.type === 'once') {
      // Specific-time reminder: slide notepad in from off-screen
      showSpeechText(`主人，到时间啦：${r.text.slice(0, 20)}`)
      playSound('notification')
      slideNotepadReminder(r.text).then((ok) => {
        if (!ok) {
          // Fallback to original behavior
          showToast({ type: 'info', icon: '📝', title: '备忘提醒！', message: r.text.slice(0, 50) })
          shakeWindow()
        }
      })
    } else {
      // Interval reminder: keep original shake behavior
      showSpeechText(`📝 备忘提醒：${r.text}`)
      showToast({ type: 'info', icon: '📝', title: '备忘提醒！', message: r.text.slice(0, 50) })
      playSound('notification')
      shakeWindow()
    }
  }
}, 30000)
```

- [ ] **Step 4: 运行 `npm run build`**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: 构建成功。

- [ ] **Step 5: Commit**

```bash
cd /data/workspace/hamster-pet
git add src/App.vue
git commit -m "feat: wire notepad-slide for once reminders; keep shake for interval"
```

---

## Task 11: 集成手动测试

**Files:** 无代码改动，纯测试记录。

- [ ] **Step 1: 启动应用**

Run: `cd /data/workspace/hamster-pet && cargo tauri dev`
Expected: 宠物窗口出现。

- [ ] **Step 2: 测试功能 2 — 不触发**

操作：鼠标直线从左到右穿过 pet，反复 3 次。
Expected: pet 保持原有 hover 反应，**不**触发追逐。

- [ ] **Step 3: 测试功能 2 — 触发追上**

操作：在 pet 身上快速左右来回抖动鼠标（约 1 秒内 ≥ 5 次方向切换、总移动距离目测超 300px）。
Expected:
1. pet 立即说 CHASE_START 台词
2. pet 开始向鼠标方向移动
3. 故意把鼠标停在某处不动 → 5 秒内 pet 应追上 → 触发 happy 反应 + CHASE_CATCH 台词
4. 2 秒后 pet 走回原处

- [ ] **Step 4: 测试功能 2 — 没追上**

操作：触发追逐后快速把鼠标移到屏幕另一端，持续快速移动不停。
Expected: 5 秒后 pet 停下、hiding 反应、CHASE_FAIL 台词；之后要么原地停 1 秒要么触发彩蛋（约 20% 概率）。

- [ ] **Step 5: 测试功能 2 — 彩蛋**

重复 Step 4 约 10 次，记录彩蛋触发次数。
Expected: 10 次中约 1-3 次触发；触发时 pet 瞬移到鼠标附近 + CHASE_PRANK 台词 + 身体摇晃动画。

- [ ] **Step 6: 测试功能 2 — 冷却**

触发一次追逐，立即（< 5 秒）再次抖动 pet。
Expected: 不重复触发；追逐进行中第二次抖动也不 overlap。

- [ ] **Step 7: 测试功能 1 — once 提醒**

操作：通过备忘面板添加一条 30 秒后的 once 提醒，文本写「测试提醒」。等待。
Expected:
1. 30 秒后桌面出现 `reminder-<timestamp>.txt` 文件
2. 记事本自动弹出，内容是「测试提醒」且中文正常
3. 记事本窗口从屏幕某一边滑入屏幕中央
4. 滑入完停住，用户手动关闭

- [ ] **Step 8: 测试功能 1 — 四个方向**

多次添加 30 秒后 once 提醒，观察 4 次以上。
Expected: 四个方向（左右上下）都出现过。

- [ ] **Step 9: 测试功能 1 — 间隔提醒不变**

添加一条 interval 提醒，间隔 1 分钟。等待触发。
Expected: 仍是震动窗口 + toast，**不**弹记事本。

- [ ] **Step 10: 确认一切正常后 Commit（若有测试记录文件则加上）**

无代码改动则跳过。若修复了任何测试中发现的问题，分开 commit 修复。

---

## Task 12: 最终构建验证 + 发版

**Files:** 无代码改动。

- [ ] **Step 1: 前端构建**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: PASS，dist/ 生成。

- [ ] **Step 2: Rust 构建（release 检查）**

Run: `cd /data/workspace/hamster-pet/src-tauri && cargo build --release`
Expected: PASS。（可选：若本地 release 构建慢或无法完整产出，可跳过，交给 CI）

- [ ] **Step 3: 单元测试全部通过**

Run: `cd /data/workspace/hamster-pet && npx vitest run`
Expected: 所有测试通过。

- [ ] **Step 4: 打 tag 推送触发 CI**

先确认当前版本号，递增最后一位。查 `src-tauri/Cargo.toml` 的 `version = "0.7.17"` → 下一版 `0.7.18`。
更新版本号：
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json` 的 version 字段
- `package.json` 的 version 字段

- [ ] **Step 5: 最终 commit + tag**

```bash
cd /data/workspace/hamster-pet
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json package.json src-tauri/Cargo.lock
git commit -m "chore: bump version to 0.7.18"
git tag v0.7.18
git push origin master
git push origin v0.7.18
```

Expected: CI 开始构建。

---

## Self-Review

**Spec coverage:**

| Spec 项 | 对应 Task |
|---|---|
| 功能 1：once 提醒触发 | Task 10 |
| 功能 1：桌面 .txt + UTF-8 BOM | Task 8 |
| 功能 1：spawn notepad + PID 匹配 HWND | Task 8 |
| 功能 1：随机方向 + 滑入中央 + ease-out-cubic 800ms | Task 9 |
| 功能 1：失败回退到 shake | Task 10 |
| 功能 1：跨平台 stub | Task 7, Task 8 |
| 功能 1：间隔提醒保持原 shake | Task 10 |
| 功能 2：mousemove 检测（800ms/4 翻转/300px/5s 冷却） | Task 2 |
| 功能 2：追逐 5 秒、追上 80px/500ms 判定 | Task 3 |
| 功能 2：追上 happy / 没追上 angry(hiding) / 20% 彩蛋瞬移 | Task 3 |
| 功能 2：身体摇晃动画 | Task 5 (CSS), Task 6 (prop 绑定) |
| 功能 2：与 push 互斥 | Task 6 (step 6) |
| 4 组台词 | Task 4 |

**Placeholder scan:** 无 TBD / TODO / "implement later"。Task 11 是手动测试 spec（允许纯描述）。

**Type consistency:**
- `useChaseCursor` 导出 `DistanceSample`、`evaluateCatch`、`shouldTriggerPrank`、`useChaseCursor`、`ChaseCallbacks.onPrank` — 测试和 App.vue 都用同一组名字 ✓
- `useMouseShakeDetector` 返回 `{ onMouseMove, reset }` — HamsterSprite/App 消费 `onMouseMove` ✓
- Rust 命令名前后一致：`create_reminder_notepad`、`set_hwnd_position`、`get_hwnd_rect` ✓
- `Rect` TS 与 Rust `WindowRect { left, top, right, bottom }` 字段一致 ✓
- `hwnd` 在 TS 作 `number`，在 Rust 作 `i64` — JSON 序列化可行（JS number 安全到 2^53，HWND 在 64 位 Windows 上通常 < 2^32，安全）。
