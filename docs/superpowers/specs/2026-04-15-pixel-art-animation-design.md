# 像素风帧动画改造设计

将仓鼠宠物的渲染方式从内联 SVG + CSS 动画改为 Canvas 像素风帧动画。

## 目标

- 用 48×48 像素画替代 ~450 行 SVG，呈现复古游戏质感
- 纯代码绘制（Canvas 2D API + 像素数据数组），零外部图片依赖
- 每状态 8-12 帧丝滑动画
- 沿用现有暖色调，加入像素美术光影处理
- 对外接口不变，`App.vue` 和所有 composables 零改动

## 架构

### 文件结构

```
src/
├── sprites/
│   ├── palette.ts            ← 调色板定义（~12 色）
│   ├── types.ts              ← 帧数据类型定义 + RLE 解码函数
│   ├── renderer.ts           ← Canvas 渲染引擎
│   └── frames/
│       ├── idle.ts           ← idle 动画 8 帧
│       ├── eating.ts         ← eating 动画 10 帧
│       ├── sleeping.ts       ← sleeping 动画 8 帧
│       ├── running.ts        ← running 动画 8 帧
│       ├── happy.ts          ← happy 动画 10 帧
│       ├── hiding.ts         ← hiding 动画 8 帧
│       ├── adventure-out.ts  ← adventure_out 动画 10 帧
│       └── adventure-back.ts ← adventure_back 动画 10 帧
├── components/
│   └── HamsterSprite.vue     ← 改造：SVG → Canvas
```

### 渲染层变更

`HamsterSprite.vue` 从内联 SVG 改为 `<canvas>` 元素：
- `<template>`: `<svg>` 替换为 `<canvas ref="canvasRef">`
- `<style>`: 删除全部 CSS keyframes，保留容器样式 + `image-rendering: pixelated`
- `<script>`: watch `state` prop → 切换动画序列，启动 rAF 循环
- 对外接口完全不变：`props: { state: SpriteState }`

## 调色板

用索引号映射颜色，帧数据只存索引数字：

| 索引 | 颜色 | 用途 |
|------|------|------|
| 0 | transparent | 透明 |
| 1 | #f0b866 | 身体金色 |
| 2 | #fce4b8 | 肚子亮色 |
| 3 | #e8a862 | 耳朵/爪子深金 |
| 4 | #d4943a | 身体暗部（阴影） |
| 5 | #f8b4b4 | 腮红粉 |
| 6 | #4a3520 | 眼睛/轮廓棕 |
| 7 | #d4856a | 鼻子 |
| 8 | #ffffff | 眼睛高光/牙齿 |
| 9 | #7b9ec7 | zzZ 蓝（sleeping） |
| 10 | #f5d76e | 食物黄（eating） |
| 11 | #cccccc | 跑轮灰（running） |

可根据像素绘制需要补充 2-3 种过渡色。

## 帧数据格式

### 类型定义

```ts
type PixelFrame = number[][]  // 48 行 × 48 列，每个值是调色板索引

interface AnimationDef {
  frames: PixelFrame[]     // 8-12 帧
  fps: number              // 播放速率
  loop: boolean            // 是否循环
}
```

### RLE 压缩

原始帧数据用行级 RLE（Run-Length Encoding）压缩存储：

```ts
// 原始: [0,0,0,0,1,1,1,3,3,0,0,0,0,0]
// RLE:  [[4,0],[3,1],[2,3],[5,0]]  → [重复次数, 调色板索引]

type RLERow = [count: number, colorIndex: number][]
type RLEFrame = RLERow[]  // 48 行 RLE 数据
```

压缩率约 3-5 倍，预估总数据量从 ~220KB 压缩到 ~50-70KB。

### 解码函数

```ts
function decodeFrame(rleFrame: RLEFrame): PixelFrame {
  return rleFrame.map(row => {
    const pixels: number[] = []
    for (const [count, color] of row) {
      for (let i = 0; i < count; i++) pixels.push(color)
    }
    return pixels
  })
}
```

## 渲染引擎

```ts
class PixelRenderer {
  private ctx: CanvasRenderingContext2D
  private size: number = 48

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = 48
    canvas.height = 48
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
  }

  drawFrame(frame: PixelFrame, palette: string[]) {
    const imageData = this.ctx.createImageData(48, 48)
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const colorIdx = frame[y][x]
        if (colorIdx === 0) continue
        const rgba = hexToRGBA(palette[colorIdx])
        const i = (y * 48 + x) * 4
        imageData.data[i]     = rgba.r
        imageData.data[i + 1] = rgba.g
        imageData.data[i + 2] = rgba.b
        imageData.data[i + 3] = 255
      }
    }
    this.ctx.putImageData(imageData, 0, 0)
  }
}
```

## 动画控制

使用 `requestAnimationFrame` + 累计时间差控制帧率：

```ts
let lastTime = 0
let frameIndex = 0
const frameDuration = 1000 / animation.fps

function tick(timestamp: number) {
  const delta = timestamp - lastTime
  if (delta >= frameDuration) {
    lastTime = timestamp
    frameIndex = animation.loop
      ? (frameIndex + 1) % animation.frames.length
      : Math.min(frameIndex + 1, animation.frames.length - 1)
    renderer.drawFrame(decodedFrames[frameIndex], palette)
  }
  animationId = requestAnimationFrame(tick)
}
```

### 各状态参数

| 状态 | 帧数 | FPS | 循环 | 动画描述 |
|------|------|-----|------|----------|
| idle | 8 | 4 | 是 | 缓慢呼吸 + 偶尔眨眼 |
| eating | 10 | 8 | 是 | 双手抱食物啃咬 |
| sleeping | 8 | 3 | 是 | 身体微起伏 + zzZ 飘浮 |
| running | 8 | 10 | 是 | 跑轮上快速奔跑 |
| happy | 10 | 8 | 是 | 蹦跳 + 眯眼笑 |
| hiding | 8 | 6 | 否 | 缩小躲起来，停最后帧 |
| adventure_out | 10 | 8 | 否 | 背包出发，走出画面 |
| adventure_back | 10 | 8 | 否 | 带着战利品走回来 |

## 像素画设计规范

### 画布比例（48×48）

```
     ┌──────────── 48px ────────────┐
 ~6  │       ·  耳朵区域  ·         │
~12  │     头部（眼睛/鼻/嘴/牙）     │
~18  │     身体/肚子                │
 ~8  │     爪子                     │
 ~4  │     留空/阴影                │
     └──────────────────────────────┘
```

### 像素美术技法

- **轮廓线**：`#4a3520`（深棕）1px 外轮廓，突出像素感
- **光影**：身体左上方高光（`#fce4b8`），右下方暗部（`#d4943a`），模拟顶光源
- **抖动（Dithering）**：颜色过渡区域用棋盘格交错排列，产生渐变效果
- **次像素细节**：眼睛高光 1px 白点，鼻子 2×1 像素

## 状态间过渡

- `hiding`：播放完 → 停在最后帧（缩小状态）→ 等 useHamster 切换到下一状态
- `adventure_out`：播放完 → 停在最后帧（画面空）→ 仓鼠外出中
- `adventure_back`：播放完 → 停在最后帧（仓鼠已回到画面中心）→ 等 useHamster 状态机自动切换到 idle

所有非循环动画播完时均停在最后帧，状态切换统一由 `useHamster` 状态机控制，渲染器不主动切换状态。

## 性能

- **帧缓存**：RLE 解码后缓存，不重复解码
- **按需解码**：仅 state 变化时解码新状态帧集
- **rAF 生命周期**：`onUnmounted` 时 `cancelAnimationFrame`
- **预估内存**：8 状态 × ~10 帧 × 48×48 × 4 bytes ≈ ~740KB

## 不变的部分

以下文件零改动：
- `App.vue`（只传 state prop）
- `useHamster.ts`（状态机逻辑）
- `useInventory.ts`、`useAdventure.ts`、`useSave.ts`
- `ContextMenu.vue`、`ShopWindow.vue`、`FeedMenu.vue` 等全部 UI 组件
- Tauri 配置（`src-tauri/`）
