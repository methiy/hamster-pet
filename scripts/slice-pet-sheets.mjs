#!/usr/bin/env node
// 把 art/pet/*.png 里的 sprite sheet 按网格切成 128x128 单帧 PNG,
// 输出到 src/assets/sprites/{state}-{n}.png。
//
// 策略:
//   1. 对 detect 缩放图跑一次全图 alpha 连通块搜索(不受 cell 约束),
//      得到 N 个独立 blob —— 每只柯基自然一个 blob。
//   2. 按每个 blob 的中心点,归属到它落入的 cell;每个 cell 若有多个候选,
//      取像素数最大那个。
//   3. 找到 blob 后,映射到原图 bbox,在原图里只保留该 blob 在 detect 空间
//      对应的像素,相邻柯基泄露的像素被设为透明。
//   4. 等比缩到 heightPx 高度,放到 128x128 画布的水平中心 / 脚底基线 y=FOOT_Y。
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ART = path.join(__dirname, '..', 'art', 'pet')
const OUT = path.join(__dirname, '..', 'src', 'assets', 'sprites')

const CANVAS = 128
const CENTER_X = 64
const FOOT_Y = 110
const DETECT_W = 512

// pick: 在 "按阅读顺序排序后的 blob 数组" 里的索引序列。
// 例如 2×2 布局就是 [0,1,2,3] = 左上/右上/左下/右下。
// 3×3 只用四角就 pick [0,1,2,3] (因为只检测到 4 个 blob,自动按读序排成左上/右上/左下/右下)。
const JOBS = [
  // 8 个已在用的基础动作 ---------------------------------
  // Idle: 3×3 网格,柯基只在四角 -> 4 blob, pick 0..3
  { file: 'Idle.png', prefix: 'idle', pick: [0, 1, 2, 3], heightPx: 80, footY: 108 },
  // Running: 2×2, 4 blob
  { file: 'Running.png', prefix: 'running', pick: [0, 1, 2, 3], heightPx: 80, footY: 108 },
  // Eating: 实际是多行(见 debug),有 7 blob。保守取前 6 个(如果柯基数不同脚本自动跳过越界)
  { file: 'Eating.png', prefix: 'eating', pick: [0, 1, 2, 3, 4, 5], heightPx: 80, footY: 108 },
  // Happy: 2×2 + 额外 2 = 6 blob -> pick 6 帧
  { file: 'Happy.png', prefix: 'happy', pick: [0, 1, 2, 3, 4, 5], heightPx: 90, footY: 112 },
  // Sleeping: 2×3 但只有四角 4 blob
  { file: 'Sleeping.png', prefix: 'sleeping', pick: [0, 1, 2, 3], heightPx: 55, footY: 108 },
  // Hiding: 4 blob 都在下半,按 x 排成 4 帧
  { file: 'Hiding.png', prefix: 'hiding', pick: [0, 1, 2, 3], heightPx: 60, footY: 108 },
  // Adventure-out: 2×2 以上有 6 blob,全取
  { file: 'Adventure-out.png', prefix: 'adventure-out', pick: [0, 1, 2, 3, 4, 5], heightPx: 80, footY: 108 },
  // Adventure-back: 6 blob (上排 3 + 下排 3)
  { file: 'Adventure-back.png', prefix: 'adventure-back', pick: [0, 1, 2, 3, 4, 5], heightPx: 80, footY: 108 },

  // 10 个新动作,都是 2×2 = 4 blob ----------------------
  { file: 'Shy.png', prefix: 'shy', pick: [0, 1, 2, 3], heightPx: 85, footY: 110 },
  { file: 'Chase.png', prefix: 'chase', pick: [0, 1, 2, 3], heightPx: 85, footY: 110 },
  { file: 'Grabbed.png', prefix: 'grabbed', pick: [0, 1, 2, 3], heightPx: 95, footY: 100 },
  { file: 'Landed.png', prefix: 'landed', pick: [0, 1, 2, 3], heightPx: 75, footY: 112 },
  { file: 'Push-horizontal.png', prefix: 'push-horizontal', pick: [0, 1, 2, 3], heightPx: 90, footY: 110 },
  { file: 'Push-vertical.png', prefix: 'push-vertical', pick: [0, 1, 2, 3], heightPx: 90, footY: 110 },
  { file: 'Angry.png', prefix: 'angry', pick: [0, 1, 2, 3], heightPx: 85, footY: 110 },
  { file: 'Yawn.png', prefix: 'yawn', pick: [0, 1, 2, 3], heightPx: 85, footY: 110 },
  { file: 'Scratch.png', prefix: 'scratch', pick: [0, 1, 2, 3], heightPx: 90, footY: 110 },
  { file: 'Bark.png', prefix: 'bark', pick: [0, 1, 2, 3], heightPx: 85, footY: 110 },
]

/**
 * AI 出图的 PNG 里棋盘格是假透明(实际 alpha=255,颜色是浅/深灰)。
 * 判断一个像素是否为背景棋盘格: RGB 接近灰色 + 灰度在 150-230 之间。
 */
function isCheckerBg(r, g, b) {
  if (Math.abs(r - g) > 12 || Math.abs(g - b) > 12 || Math.abs(r - b) > 12) return false
  const gray = (r + g + b) / 3
  return gray >= 150 && gray <= 230
}

/**
 * 按行列聚类把 blobs 排成人类阅读顺序(上到下、左到右):
 *   1. 按 cy 排序,相邻两个 cy 差距超过阈值 (blob 平均高度 / 2) 就新开一行
 *   2. 每行内按 cx 排序
 *   3. 返回一个 blob 数组,顺序即 "左上第 1 只、右上第 2 只、..."
 */
function sortBlobsReadingOrder(blobs) {
  if (blobs.length === 0) return []
  const avgH = blobs.reduce((s, b) => s + (b.maxY - b.minY), 0) / blobs.length
  const byY = [...blobs].sort((a, b) => a.cy - b.cy)
  const rows = []
  let current = []
  let lastCy = byY[0].cy
  for (const b of byY) {
    if (b.cy - lastCy > avgH * 0.5 && current.length > 0) {
      rows.push(current)
      current = []
    }
    current.push(b)
    lastCy = b.cy
  }
  if (current.length) rows.push(current)
  const sorted = []
  for (const row of rows) {
    row.sort((a, b) => a.cx - b.cx)
    sorted.push(...row)
  }
  return sorted
}
function findAllBlobs(data, width, height, threshold = 8) {
  const visited = new Uint8Array(width * height)
  const isFg = (x, y) => {
    const i = (y * width + x) * 4
    const a = data[i + 3]
    if (a <= threshold) return false
    return !isCheckerBg(data[i], data[i + 1], data[i + 2])
  }
  const blobs = []
  const stack = []
  for (let sy = 0; sy < height; sy++) {
    for (let sx = 0; sx < width; sx++) {
      const sidx = sy * width + sx
      if (visited[sidx]) continue
      if (!isFg(sx, sy)) { visited[sidx] = 1; continue }
      stack.length = 0
      stack.push(sx, sy)
      const pixels = new Set()
      let bMinX = sx, bMinY = sy, bMaxX = sx, bMaxY = sy
      while (stack.length > 0) {
        const y = stack.pop()
        const x = stack.pop()
        const idx = y * width + x
        if (visited[idx]) continue
        visited[idx] = 1
        if (!isFg(x, y)) continue
        pixels.add(idx)
        if (x < bMinX) bMinX = x
        if (x > bMaxX) bMaxX = x
        if (y < bMinY) bMinY = y
        if (y > bMaxY) bMaxY = y
        if (x + 1 < width)  stack.push(x + 1, y)
        if (x - 1 >= 0)     stack.push(x - 1, y)
        if (y + 1 < height) stack.push(x, y + 1)
        if (y - 1 >= 0)     stack.push(x, y - 1)
      }
      if (pixels.size < 400) continue
      blobs.push({
        pixels,
        minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY,
        size: pixels.size,
        cx: (bMinX + bMaxX) / 2,
        cy: (bMinY + bMaxY) / 2,
      })
    }
  }
  return blobs
}

async function processJob(job) {
  const inPath = path.join(ART, job.file)
  const srcMeta = await sharp(inPath).metadata()
  const srcW = srcMeta.width, srcH = srcMeta.height
  const detScale = DETECT_W / srcW
  const detH = Math.round(srcH * detScale)

  const { data: detData } = await sharp(inPath)
    .ensureAlpha()
    .resize(DETECT_W, detH, { kernel: 'nearest' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info

  const threshold = job.trimAlpha ?? 8
  const allBlobs = findAllBlobs(detData, DETECT_W, detH, threshold)
  // 按阅读顺序排列 blobs,pick 里用的是 "从左上到右下第几只柯基" 的序号。
  const sortedBlobs = sortBlobsReadingOrder(allBlobs)

  const outFrames = []
  const heightPx = job.heightPx ?? 85
  const footY = job.footY ?? FOOT_Y

  for (let i = 0; i < job.pick.length; i++) {
    const blobIdx = job.pick[i]
    const blob = sortedBlobs[blobIdx]
    if (!blob) {
      console.warn(`  [skip] ${job.file} blob#${blobIdx}: out of range (have ${sortedBlobs.length})`)
      continue
    }

    // 映射 detect bbox 到原图 bbox (+ padding)
    const PAD = 2
    const scaleBack = srcW / DETECT_W
    const bx = Math.max(0, Math.floor(blob.minX * scaleBack) - PAD)
    const by = Math.max(0, Math.floor(blob.minY * scaleBack) - PAD)
    const bx2 = Math.min(width, Math.ceil((blob.maxX + 1) * scaleBack) + PAD)
    const by2 = Math.min(height, Math.ceil((blob.maxY + 1) * scaleBack) + PAD)
    const bw = bx2 - bx
    const bh = by2 - by

    // 只保留属于该 blob 的像素(按 detect 坐标查询),其余设透明。
    // 双重判据: detect 空间属于 blob,且 src 像素本身不是棋盘格背景色。
    const bboxBuf = Buffer.alloc(bw * bh * 4)
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const gx = bx + x
        const gy = by + y
        const dx = Math.floor(gx * detScale)
        const dy = Math.floor(gy * detScale)
        const dst = (y * bw + x) * 4
        const src = (gy * width + gx) * 4
        const r = data[src], g = data[src + 1], b = data[src + 2]
        const inBlob = dx >= 0 && dx < DETECT_W && dy >= 0 && dy < detH && blob.pixels.has(dy * DETECT_W + dx)
        if (inBlob && !isCheckerBg(r, g, b)) {
          bboxBuf[dst] = r
          bboxBuf[dst + 1] = g
          bboxBuf[dst + 2] = b
          bboxBuf[dst + 3] = data[src + 3]
        } else {
          bboxBuf[dst + 3] = 0
        }
      }
    }

    // 等比缩放到目标高度 heightPx,再约束宽度 <= CANVAS-4 避免放不下
    let scale = heightPx / bh
    let newH = heightPx
    let newW = Math.max(1, Math.round(bw * scale))
    const MAX_W = CANVAS - 4
    if (newW > MAX_W) {
      scale = MAX_W / bw
      newW = MAX_W
      newH = Math.max(1, Math.round(bh * scale))
    }

    const scaled = await sharp(bboxBuf, { raw: { width: bw, height: bh, channels: 4 } })
      .resize(newW, newH, { kernel: 'nearest' })
      .png()
      .toBuffer()

    const left = Math.round(CENTER_X - newW / 2)
    const top = Math.round(footY - newH)

    const outBuf = await sharp({
      create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: scaled, left, top }])
      .png()
      .toBuffer()

    const outName = `${job.prefix}-${i}.png`
    await fs.writeFile(path.join(OUT, outName), outBuf)
    outFrames.push(outName)
  }
  console.log(`  ${job.file} (${allBlobs.length} blobs) -> ${outFrames.length} frames`)
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  for (const job of JOBS) {
    try {
      await processJob(job)
    } catch (e) {
      console.error(`  [fail] ${job.file}:`, e.message)
    }
  }
  console.log('done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
