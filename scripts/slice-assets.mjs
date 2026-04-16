#!/usr/bin/env node
/**
 * slice-assets.mjs
 * Slices AI-generated art sprite sheets into individual PNG frames / icons.
 * Requires: sharp (already in devDependencies)
 *
 * Usage: node scripts/slice-assets.mjs
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

// ─── Helper ──────────────────────────────────────────────
/**
 * Extract a region from a source image, resize to target size, save as PNG.
 */
async function extractAndSave(src, left, top, width, height, outPath, resizeW, resizeH) {
  await sharp(src)
    .extract({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) })
    .resize(resizeW, resizeH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath)
  console.log(`  ✓ ${path.basename(outPath)}`)
}

// ─── 1. Pet Sprites ──────────────────────────────────────
// Each source is 4096×4096, divided into 4 rows (1024px each).
// Each row has a known number of frames, evenly spaced across 4096px width.

const pet1Config = {
  src: path.join(ART, 'pet1.png'),
  rows: [
    { name: 'idle', frames: 4 },
    { name: 'eating', frames: 6 },
    { name: 'sleeping', frames: 4 },
    { name: 'running', frames: 4 },
  ],
}

const pet2Config = {
  src: path.join(ART, 'pet2.png'),
  rows: [
    { name: 'happy', frames: 6 },
    { name: 'hiding', frames: 4 },
    { name: 'adventure-out', frames: 6 },
    { name: 'adventure-back', frames: 6 },
  ],
}

async function slicePetSheet(config) {
  const imgW = 4096
  const rowH = 1024
  console.log(`\nSlicing ${path.basename(config.src)}...`)

  for (let rowIdx = 0; rowIdx < config.rows.length; rowIdx++) {
    const { name, frames } = config.rows[rowIdx]
    const frameW = imgW / frames
    const top = rowIdx * rowH

    for (let f = 0; f < frames; f++) {
      const left = f * frameW
      const outPath = path.join(SPRITES, `${name}-${f}.png`)
      await extractAndSave(config.src, left, top, frameW, rowH, outPath, 128, 128)
    }
  }
}

await slicePetSheet(pet1Config)
await slicePetSheet(pet2Config)

// ─── 2. Item Icons ───────────────────────────────────────
// Each source is 4096×4096, items are arranged in a single row in the middle area.
// Strategy: trim to content bounding box, then split evenly by count.

/**
 * For item sheets, we find the vertical content band, then split horizontally.
 */
async function sliceItemSheet(src, prefix, names, targetSize = 64) {
  console.log(`\nSlicing ${path.basename(src)} → ${names.length} icons...`)

  // Get image metadata and trim info to find content bounds
  const img = sharp(src)
  const meta = await img.metadata()
  const w = meta.width ?? 4096
  const h = meta.height ?? 4096

  // Trim to find the content bounding box
  const trimmed = sharp(src).trim()
  const trimInfo = await trimmed.metadata()

  // Use trimmed dimensions if available, otherwise use full image
  // We'll get the trim offset by comparing original vs trimmed
  let contentW, contentH, offsetX, offsetY
  try {
    // Sharp trim() returns info about the trim via toBuffer
    const { info } = await sharp(src).trim().toBuffer({ resolveWithObject: true })
    contentW = info.width
    contentH = info.height
    offsetX = info.trimOffsetLeft ? -info.trimOffsetLeft : 0
    offsetY = info.trimOffsetTop ? -info.trimOffsetTop : 0
  } catch {
    // Fallback: use full image
    contentW = w
    contentH = h
    offsetX = 0
    offsetY = 0
  }

  // Split the content area evenly by the number of items
  const itemW = contentW / names.length

  for (let i = 0; i < names.length; i++) {
    const left = offsetX + i * itemW
    const outPath = path.join(ICONS, `${prefix}-${names[i]}.png`)
    await extractAndSave(src, left, offsetY, itemW, contentH, outPath, targetSize, targetSize)
  }
}

// Food: 8 items
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

// Decorations: 6 items
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
