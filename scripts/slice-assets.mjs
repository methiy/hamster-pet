#!/usr/bin/env node
/**
 * slice-assets.mjs — v2
 *
 * Slices AI-generated 4096×4096 art sheets into individual PNGs.
 *
 * Key challenges solved:
 *   1. Images are RGB (no alpha) — gray checkerboard background baked in
 *   2. Sprite frames are variable-width, not on a uniform grid
 *   3. Must remove checkerboard and replace with transparency
 *
 * Strategy:
 *   - Use color saturation to distinguish content from gray checkerboard
 *   - Scan rows/columns to find content bounding boxes
 *   - Extract each sprite/icon, convert low-saturation pixels to transparent
 */

import sharp from 'sharp'
import path from 'path'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ART = path.join(ROOT, 'art')
const SPRITES = path.join(ROOT, 'src', 'assets', 'sprites')
const ICONS = path.join(ROOT, 'src', 'assets', 'icons')

await mkdir(SPRITES, { recursive: true })
await mkdir(ICONS, { recursive: true })

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function sat(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

/**
 * Load raw pixel data from an image file.
 */
async function loadRaw(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, channels: info.channels }
}

/**
 * Scan an image and find horizontal content bands (rows of sprites/items).
 * Returns array of { top, bottom } objects.
 */
function findContentBands(data, width, height, channels, satThresh = 0.08) {
  const rowContent = []
  for (let y = 0; y < height; y += 2) {
    let count = 0
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * channels
      if (sat(data[i], data[i + 1], data[i + 2]) > satThresh) count++
    }
    rowContent.push({ y, count })
  }

  const thresh = (width / 2) * 0.01
  const active = rowContent.filter(r => r.count > thresh)
  const bands = []
  if (active.length === 0) return bands

  let start = active[0].y, prev = start
  for (let i = 1; i < active.length; i++) {
    if (active[i].y - prev > 60) {
      bands.push({ top: start, bottom: prev })
      start = active[i].y
    }
    prev = active[i].y
  }
  bands.push({ top: start, bottom: active[active.length - 1].y })
  return bands
}

/**
 * Within a horizontal band, find individual items by scanning columns.
 * Returns array of { left, right } objects.
 */
function findItemsInBand(data, width, channels, top, bottom, satThresh = 0.08, gapThresh = 50) {
  const colContent = []
  for (let x = 0; x < width; x += 2) {
    let count = 0
    for (let y = top; y <= bottom; y += 2) {
      const i = (y * width + x) * channels
      if (sat(data[i], data[i + 1], data[i + 2]) > satThresh) count++
    }
    colContent.push({ x, count })
  }

  const bandH = bottom - top
  const thresh = (bandH / 2) * 0.01
  const active = colContent.filter(c => c.count > thresh)
  const items = []
  if (active.length === 0) return items

  let start = active[0].x, prev = start
  for (let i = 1; i < active.length; i++) {
    if (active[i].x - prev > gapThresh) {
      items.push({ left: start, right: prev })
      start = active[i].x
    }
    prev = active[i].x
  }
  items.push({ left: start, right: active[active.length - 1].x })
  return items
}

/**
 * Extract a region from raw data, remove checkerboard background (replace
 * low-saturation pixels with transparent), resize, and save as PNG with alpha.
 */
async function extractWithTransparency(
  srcFile, left, top, w, h, outPath, resizeW, resizeH, satThresh = 0.10
) {
  // Extract region first
  const { data, info } = await sharp(srcFile)
    .extract({ left: Math.round(left), top: Math.round(top), width: Math.round(w), height: Math.round(h) })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: rw, height: rh, channels } = info

  // Create RGBA buffer
  const rgba = Buffer.alloc(rw * rh * 4)
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const si = (y * rw + x) * channels
      const di = (y * rw + x) * 4
      const r = data[si], g = data[si + 1], b = data[si + 2]

      if (sat(r, g, b) < satThresh) {
        // Background — make transparent
        rgba[di] = 0; rgba[di + 1] = 0; rgba[di + 2] = 0; rgba[di + 3] = 0
      } else {
        rgba[di] = r; rgba[di + 1] = g; rgba[di + 2] = b; rgba[di + 3] = 255
      }
    }
  }

  await sharp(rgba, { raw: { width: rw, height: rh, channels: 4 } })
    .resize(resizeW, resizeH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath)

  console.log(`  ✓ ${path.basename(outPath)}`)
}

// ──────────────────────────────────────────────────────────
// 1. Pet Sprites
// ──────────────────────────────────────────────────────────

async function slicePetSheet(srcFile, rows) {
  console.log(`\nSlicing ${path.basename(srcFile)}...`)
  const raw = await loadRaw(srcFile)
  const bands = findContentBands(raw.data, raw.width, raw.height, raw.channels)

  if (bands.length !== rows.length) {
    console.warn(`  WARNING: found ${bands.length} bands, expected ${rows.length}`)
  }

  for (let ri = 0; ri < Math.min(bands.length, rows.length); ri++) {
    const band = bands[ri]
    const { name, frames: expectedFrames } = rows[ri]
    const detectedItems = findItemsInBand(
      raw.data, raw.width, raw.channels, band.top, band.bottom, 0.08, 80
    )

    // If detected count matches expected, use detected bboxes.
    // Otherwise, equal-divide the full band width by expected frame count.
    let frameBoxes
    if (detectedItems.length === expectedFrames) {
      frameBoxes = detectedItems
    } else if (detectedItems.length > 0) {
      // Use the overall extent of detected items, divide equally
      const overallLeft = detectedItems[0].left
      const overallRight = detectedItems[detectedItems.length - 1].right
      const totalW = overallRight - overallLeft
      const frameW = totalW / expectedFrames
      frameBoxes = []
      for (let f = 0; f < expectedFrames; f++) {
        frameBoxes.push({
          left: overallLeft + f * frameW,
          right: overallLeft + (f + 1) * frameW,
        })
      }
    } else {
      // Fallback: divide full width
      const frameW = raw.width / expectedFrames
      frameBoxes = []
      for (let f = 0; f < expectedFrames; f++) {
        frameBoxes.push({ left: f * frameW, right: (f + 1) * frameW })
      }
    }

    const bandTop = Math.max(0, band.top - 10)  // small padding
    const bandBot = Math.min(raw.height, band.bottom + 10)
    const bandH = bandBot - bandTop

    for (let f = 0; f < expectedFrames; f++) {
      const box = frameBoxes[f]
      const left = Math.max(0, box.left - 10)
      const right = Math.min(raw.width, box.right + 10)
      const w = right - left

      const outPath = path.join(SPRITES, `${name}-${f}.png`)
      await extractWithTransparency(srcFile, left, bandTop, w, bandH, outPath, 128, 128)
    }
  }
}

await slicePetSheet(path.join(ART, 'pet1.png'), [
  { name: 'idle', frames: 4 },
  { name: 'eating', frames: 6 },
  { name: 'sleeping', frames: 4 },
  { name: 'running', frames: 4 },
])

await slicePetSheet(path.join(ART, 'pet2.png'), [
  { name: 'happy', frames: 6 },
  { name: 'hiding', frames: 4 },
  { name: 'adventure-out', frames: 6 },
  { name: 'adventure-back', frames: 6 },
])

// ──────────────────────────────────────────────────────────
// 2. Item Icons
// ──────────────────────────────────────────────────────────

async function sliceItemSheet(srcFile, prefix, names, targetSize = 64) {
  console.log(`\nSlicing ${path.basename(srcFile)} → ${names.length} icons...`)
  const raw = await loadRaw(srcFile)
  const bands = findContentBands(raw.data, raw.width, raw.height, raw.channels)

  if (bands.length === 0) {
    console.error(`  ERROR: no content bands found!`)
    return
  }

  const band = bands[0]
  const detectedItems = findItemsInBand(
    raw.data, raw.width, raw.channels, band.top, band.bottom, 0.08, 40
  )

  let itemBoxes
  if (detectedItems.length === names.length) {
    // Perfect match — use detected boxes
    itemBoxes = detectedItems
  } else {
    // Equal-divide the content area
    console.log(`  Detected ${detectedItems.length} items, expected ${names.length} — equal dividing`)
    const overallLeft = detectedItems.length > 0 ? detectedItems[0].left : 0
    const overallRight = detectedItems.length > 0 ? detectedItems[detectedItems.length - 1].right : raw.width
    const totalW = overallRight - overallLeft
    const itemW = totalW / names.length
    itemBoxes = []
    for (let i = 0; i < names.length; i++) {
      itemBoxes.push({
        left: overallLeft + i * itemW,
        right: overallLeft + (i + 1) * itemW,
      })
    }
  }

  const bandTop = Math.max(0, band.top - 5)
  const bandBot = Math.min(raw.height, band.bottom + 5)
  const bandH = bandBot - bandTop

  for (let i = 0; i < names.length; i++) {
    const box = itemBoxes[i]
    const left = Math.max(0, box.left - 5)
    const right = Math.min(raw.width, box.right + 5)
    const w = right - left

    const outPath = path.join(ICONS, `${prefix}-${names[i]}.png`)
    await extractWithTransparency(srcFile, left, bandTop, w, bandH, outPath, targetSize, targetSize)
  }
}

// Food: 8 items — single row, items close together
await sliceItemSheet(
  path.join(ART, 'food.png'),
  'food',
  ['sunflower', 'bread', 'strawberry', 'apple', 'cheese', 'cupcake', 'nuts', 'deluxe_meal']
)

// Equipment / Gear: 5 items
await sliceItemSheet(
  path.join(ART, 'equipment.png'),
  'gear',
  ['tent', 'scarf', 'treasure_map', 'boat_ticket', 'telescope']
)

// Decorations: 6 items (has grid borders)
await sliceItemSheet(
  path.join(ART, '装饰品.png'),
  'deco',
  ['crown', 'sunglasses', 'bow', 'bell', 'backpack', 'wreath']
)

// Furniture: 5 items
await sliceItemSheet(
  path.join(ART, '家具.png'),
  'furn',
  ['wheel', 'nest', 'swing', 'sunflower_pot', 'treasure_chest']
)

console.log('\n✅ All assets sliced successfully!')
