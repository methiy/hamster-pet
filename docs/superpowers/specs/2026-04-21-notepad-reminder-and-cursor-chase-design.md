# 功能设计：记事本提醒滑入 + 鼠标追逐

**日期**：2026-04-21
**作者**：brainstorming session

## 概述

在 hamster-pet 中加入两个互动功能：

1. **记事本提醒滑入**：到指定时间的备忘提醒触发时，在桌面创建一个真实的 `.txt` 文件（内含提醒内容），用系统 `notepad.exe` 打开，然后把记事本窗口从屏幕外滑到屏幕中央。
2. **鼠标追逐**：用户在 pet 窗口内快速来回执箦（抖动鼠标）时，pet 脱离原位置追逐鼠标，5 秒内追上则开心，追不上则生气，并有 20% 概率触发「骗你的」彩蛋。

两功能互相独立，可分别实现与测试。

---

## 功能 1：记事本提醒滑入

### 触发

**仅**用于 `useReminder` 中 `type === 'once'`（指定时间到点）的备忘提醒。番茄钟完成、间隔重复备忘（`type === 'interval'`）**不变**，仍使用现有的 `shakeWindow()` 震动逻辑。

### 行为序列

1. 提醒到点（`checkDueReminders` 返回项的 `type === 'once'`）
2. 前端调 Rust 命令 `create_reminder_notepad({ text, monitorInfo })`
   - Rust 端在**桌面**目录写 `reminder-<timestamp>.txt`，内容为提醒文本，UTF-8 带 BOM（保证 notepad 中文不乱码）
   - `Command::new("notepad.exe").arg(path).spawn()` 启动
   - 轮询 `EnumWindows` 匹配 `GetWindowThreadProcessId` 等于刚 spawn 出来的 PID，且窗口标题包含文件名，拿到 HWND
   - 轮询最多 2 秒，找不到就回退到 shake + toast
3. 前端随机选方向 `'left' | 'right' | 'top' | 'bottom'`
4. 计算起点（屏幕外）和终点（屏幕中央）：
   - 从 `currentMonitor()` 拿 monitor 尺寸
   - 通过新 Rust 命令 `get_window_rect(hwnd)` 拿 notepad 窗口尺寸
   - 起点 = 屏幕对应边 + notepad 宽高（完全在屏幕外）
   - 终点 = monitor center − notepad 半宽高
5. 前端 `requestAnimationFrame` 循环，每帧调 `set_hwnd_position(hwnd, x, y)`
   - 动画 duration 800ms，ease-out-cubic
6. 到达后停住。不自动关闭，用户手动叉掉 notepad。
7. pet 此时可以说一句话（如「主人，到时间啦！」）但**不触发震动**，以免与 notepad 的滑入动画相冲。

### Rust 端新命令

1. **`create_reminder_notepad(text: String) -> Result<i64, String>`**
   - 在桌面创建 `reminder-<ts>.txt`，UTF-8 BOM 写入 text
   - spawn `notepad.exe <path>`，拿 PID
   - 轮询 `EnumWindows` + `GetWindowThreadProcessId`，100ms 间隔、最多 20 次
   - 返回 HWND（以 `i64` 跨 Tauri 序列化）
   - 失败返回 `Err`

2. **`get_hwnd_rect(hwnd: i64) -> Option<{left, top, right, bottom}>`**
   - 包装 `GetWindowRect`

3. **`set_hwnd_position(hwnd: i64, x: i32, y: i32)`**
   - 包装 `SetWindowPos(HWND, HWND_TOP, x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE)`
   - 类似现有 `move_captured_window`，但接受任意 HWND 参数

4. **跨平台保护**：非 Windows 平台这些命令返回 `Err("unsupported platform")`；前端检测后回退到现有 shake 行为。

### 前端新 composable：`useNotepadSlide`

```ts
// src/composables/useNotepadSlide.ts
interface NotepadSlideResult {
  success: boolean
}

export function useNotepadSlide() {
  async function slideNotepadReminder(text: string): Promise<NotepadSlideResult> {
    // 1. 调 create_reminder_notepad → HWND
    // 2. 取 monitor + HWND rect
    // 3. 随机方向，计算起点/终点
    // 4. requestAnimationFrame 循环 set_hwnd_position
    // 5. 返回 success
  }
  return { slideNotepadReminder }
}
```

### 集成点

在 `App.vue` 的 `reminderTimer` 回调中：

```ts
const due = checkDueReminders()
for (const r of due) {
  if (r.opts.type === 'once') {
    // 新行为：滑入记事本
    slideNotepadReminder(r.text).then(result => {
      if (!result.success) {
        // 回退到老行为
        shakeWindow()
        showToast(...)
      }
    })
    // pet 说句话，但不 shake
    showSpeechText(`主人，到时间啦：${r.text.slice(0, 20)}`)
    playSound('notification')
  } else {
    // 间隔备忘：保持老行为
    showSpeechText(`📝 备忘提醒：${r.text}`)
    showToast(...)
    playSound('notification')
    shakeWindow()
  }
}
```

### 失败回退

任何一步失败（非 Windows、找不到 HWND、set_hwnd_position 报错）均回退到现有的 `shake + toast` 行为，不影响提醒本身送达。

---

## 功能 2：鼠标追逐

### 触发检测

在 `HamsterSprite.vue` 根元素新增 `@mousemove` 监听。

**检测算法**（新 composable `useMouseShakeDetector`）：
- 维护最近 800ms 的 `{x, y, t}` 事件队列（旧事件 shift 出队）
- 每次新事件到来，计算：
  - **方向翻转次数**：遍历队列，统计相邻两段 dx 符号不同 + dy 符号不同的次数
  - **累计距离**：相邻两事件的欧氏距离之和
- 触发条件：方向翻转 ≥ 4 次 **且** 累计距离 ≥ 300px（CSS px）
- 触发后立即清空队列并进入 5 秒冷却，避免连续触发

### 追逐序列

1. 触发瞬间：
   - 说一句 `CHASE_START_PHRASES` 里的话（例如「你干嘛～追上你！」）
   - `triggerReaction('running', 5500)`
   - 取消其他动画（如果 `usePushAnimation.isPushing.value` 为 true 则不触发追逐）
2. 调用新 composable `useChaseCursor().startChase()`
3. `startChase` 内部：
   - 记录 pet 起始位置 `startX, startY`（物理像素）
   - 启动 5 秒追逐，每帧：
     - 调 `get_cursor_position` 拿鼠标位置（按 DPI 缩放对齐到物理像素）
     - 目标 = 鼠标坐标 − pet 中心偏移（pet 窗口宽度 / 2 居中到鼠标）
     - pet 以 `WALK_SPEED`（可略快于现有的 0.15 px/ms，比如 0.25）向目标移动一小步
   - 每帧记录 pet 与鼠标距离
4. 5 秒到后或提前满足追上条件时判定：
   - **追上**：最近 500ms 内 pet 与鼠标距离持续 < 80px（CSS px * DPI） → happy 分支
   - **没追上**：否则 → angry 分支
5. **追上分支**：
   - `triggerReaction('happy', 3000)`
   - 说 `CHASE_CATCH_PHRASES` 里的话（例如「哈追到啦～」）
   - 播放 happy 音效
   - 2 秒后 pet 走回 `startX, startY`（复用 `animateHamsterMove`）
6. **没追上分支**：
   - 先说 `CHASE_FAIL_PHRASES`（例如「哼，再也不给主人玩了！」）
   - `triggerReaction('angry', 2000)`（需检查 `useHamster` 是否有 angry state，否则用 `sad` 或新建）
   - 等 1.5 秒
   - 以 20% 概率触发「骗你彩蛋」：
     - 瞬移（`setPosition` 直接跳）到鼠标附近
     - 说 `CHASE_PRANK_PHRASES`（例如「骗你的～追到咯！！！」）
     - `triggerReaction('happy', 3000)` + 播放 happy 音效
     - CSS 身体摇晃动画（新增 `chase-wiggle` keyframe）
     - 3 秒后走回 `startX, startY`
   - 80% 无彩蛋：pet 原地待 1 秒，走回 `startX, startY`

### 新增 composables

```ts
// src/composables/useMouseShakeDetector.ts
export function useMouseShakeDetector(
  onShakeDetected: () => void,
  opts?: { windowMs?: number; minReversals?: number; minDistance?: number; cooldownMs?: number }
) {
  function onMouseMove(e: MouseEvent) { /* ... */ }
  return { onMouseMove }
}

// src/composables/useChaseCursor.ts
export function useChaseCursor(callbacks: {
  showSpeech: (text: string) => void
  triggerReaction: (state: HamsterState, duration: number) => void
  playSound: (name: string) => void
}) {
  const isChasing = ref(false)
  async function startChase(): Promise<void> { /* ... */ }
  function cancel(): void { /* ... */ }
  return { isChasing, startChase, cancel }
}
```

### 集成点

1. `HamsterSprite.vue` 根元素新增 `@mousemove="onMouseMove"`，从 props 里接受 `onShakeDetected` 回调（或通过 emit）。事件不能阻断已有的 grab/hover 逻辑。
2. `App.vue` 创建 `useMouseShakeDetector` 和 `useChaseCursor`，把 detector 的 `onMouseMove` 传给 `HamsterSprite`，shake 触发回调里调 `useChaseCursor().startChase()`。
3. 追逐期间忽略新的 shake 检测（通过 `isChasing` 标志）。
4. 追逐与 push 动画互斥：已有 push 时不触发 chase；chase 期间 push 也不触发（在 `useActivityReaction` 里加判断）。

### 新增台词 `src/data/hamsterPhrases.ts`

```ts
export const CHASE_START_PHRASES = [
  '你干嘛～追上你！',
  '哎呀！别动！',
  '站住！！',
  '欠揍的小主人～',
]
export const CHASE_CATCH_PHRASES = [
  '哈～追到啦！',
  '抓住你了！嘿嘿嘿～',
  '逃不掉了！',
]
export const CHASE_FAIL_PHRASES = [
  '哼！再也不给主人玩了！',
  '累死了…没追上…',
  '气死我了！！',
]
export const CHASE_PRANK_PHRASES = [
  '骗你的～追到咯！！！',
  '嘿嘿，装累的～',
  '其实我早就追上啦！',
]
```

### 数值参数（易调）

| 参数 | 默认值 | 说明 |
|---|---|---|
| shake window | 800ms | 统计窗口 |
| min reversals | 4 | 最少方向翻转次数 |
| min distance | 300px | 最小累计距离 |
| cooldown | 5000ms | 触发后冷却 |
| chase timeout | 5000ms | 追逐最长时间 |
| catch threshold | 80px | 追上判定距离 |
| catch hold ms | 500ms | 判定追上需保持多久 |
| prank chance | 0.2 | 彩蛋概率 |
| chase walk speed | 0.25 px/ms | 比普通 walk 略快 |

全部定义在 composable 顶部常量，方便调手感。

---

## 组件与数据流总览

```
App.vue
├── useReminder ──(due once)──► useNotepadSlide ──► invoke(create_reminder_notepad)
│                                                └► invoke(set_hwnd_position) per frame
│
├── HamsterSprite
│    └ @mousemove ──► useMouseShakeDetector ──(shake!)──► useChaseCursor.startChase()
│                                                          └► invoke(get_cursor_position) per poll
│                                                          └► win.setPosition() per frame
│
└── usePushAnimation  ◄─ 与 useChaseCursor 互斥（通过 isChasing / isPushing 标志）
```

## 测试策略

- 手动测试为主（桌宠、动画无法单测）
- 功能 1：
  1. 添加 `type: 'once'` 到 30 秒后的备忘 → 记事本应在桌面生成 + 从屏幕外滑入中央
  2. 测试四个随机方向
  3. 关闭 notepad → pet 应正常
  4. 连续两条 once 提醒同时到点 → 每条独立滑入（可容忍覆盖）
  5. 间隔备忘不变，仍是 shake
- 功能 2：
  1. 在 pet 身上快速来回执箦鼠标 → 应触发追逐
  2. 单向直线移动不触发
  3. 5 秒内追上 → happy 分支
  4. 避开 pet → 5 秒后 angry 分支
  5. 反复测试 10+ 次 → 至少出现 1-3 次彩蛋（验证 20% 概率）
  6. 追逐期间再次抖动 → 不重复触发
- 整体：`npm run build` 通过

## 风险与回退

| 风险 | 缓解 |
|---|---|
| Windows 11 的 Notepad 是 UWP，PID 可能与 spawn 的进程不同 | 优先 PID 匹配，失败时回退到按窗口标题匹配文件名，仍失败就回退到老 shake |
| 记事本找到但 `SetWindowPos` 失败 | 回退到老 shake |
| mousemove 事件频率过高拖慢 | 检测函数 O(n)，n ≤ 队列长度（80ms 间隔下 ~10 事件），忽略不计 |
| 追逐时 pet 窗口跑出屏幕 | 用已有 `clampPosition` |
| pet chase 与已有 push 冲突 | `isChasing` / `isPushing` 互斥标志 |
| 非 Windows 平台 | Rust 命令显式返回 `Err`，前端 fallback；功能 2 与平台无关 |

## 不做的事（YAGNI）

- 不做设置开关：先做出来看手感，有需要再加
- 不做 notepad 关闭时回滑动画：用户明确要「停住，手动关闭」
- 不做功能 1 在 macOS/Linux 的等价实现：先 Windows-only
- 不做 chase 期间阻止用户拖动：pet 窗口已是 draggable，不特殊处理
- 不做 .txt 文件自动清理：放桌面由用户自己删（符合用户「放桌面」的意图）
