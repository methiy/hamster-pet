// scripts/slice-spritesheet.mjs
// Slice the AI-generated pet.png sprite sheet into individual frames.
// The image is 4096x4096 with 8 rows × ~10 frames of hamster sprites
// on a light/white background (not transparent).
// Strategy: divide into 8 equal row bands, then detect frames per band.

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const FRAME_SIZE = 48

const PALETTE = [
  null,              // 0: transparent
  [240, 184, 102],   // 1: body gold #f0b866
  [252, 228, 184],   // 2: belly light #fce4b8
  [232, 168, 98],    // 3: ears/paws darker gold #e8a862
  [212, 148, 58],    // 4: body shadow #d4943a
  [248, 180, 180],   // 5: blush pink #f8b4b4
  [74, 53, 32],      // 6: eyes/outline brown #4a3520
  [212, 133, 106],   // 7: nose #d4856a
  [255, 255, 255],   // 8: white #ffffff
  [123, 158, 199],   // 9: zzZ blue #7b9ec7
  [245, 215, 110],   // 10: food yellow #f5d76e
  [204, 204, 204],   // 11: wheel grey #cccccc
  [224, 213, 192],   // 12: teeth outline #e0d5c0
  [180, 120, 60],    // 13: warm brown
  [140, 90, 45],     // 14: dark brown
  [255, 230, 200],   // 15: highlight cream
]

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
}

function isBackground(r, g, b, a) {
  // Consider near-white or very light pixels as background
  if (a < 128) return true
  if (r > 240 && g > 240 && b > 240) return true
  return false
}

function findClosestPalette(r, g, b, a) {
  if (isBackground(r, g, b, a)) return 0

  let bestIdx = 1
  let bestDist = Infinity
  for (let i = 1; i < PALETTE.length; i++) {
    const [pr, pg, pb] = PALETTE[i]
    const d = colorDistance(r, g, b, pr, pg, pb)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

function encodeRLE(row) {
  const rle = []
  let count = 1
  for (let i = 1; i <= row.length; i++) {
    if (i < row.length && row[i] === row[i-1]) {
      count++
    } else {
      rle.push([count, row[i-1]])
      count = 1
    }
  }
  return rle
}

async function detectFramesInBand(raw, width, bandTop, bandBottom, channels) {
  const bandHeight = bandBottom - bandTop

  // Find columns that have non-background content
  const colHasContent = new Array(width).fill(false)
  for (let x = 0; x < width; x++) {
    for (let y = bandTop; y < bandBottom; y++) {
      const idx = (y * width + x) * channels
      const r = raw[idx], g = raw[idx+1], b = raw[idx+2], a = raw[idx+3]
      if (!isBackground(r, g, b, a)) {
        colHasContent[x] = true
        break
      }
    }
  }

  // Find frame boundaries (contiguous content columns with gaps between)
  const frames = []
  let inFrame = false
  let frameStart = 0
  const minGap = Math.floor(width * 0.01) // min gap between frames

  // Smooth the column detection to handle small gaps within a frame
  for (let x = 0; x <= width; x++) {
    if (x < width && colHasContent[x]) {
      if (!inFrame) {
        frameStart = x
        inFrame = true
      }
    } else {
      if (inFrame) {
        // Check if this is a real gap or a small interruption
        let gapEnd = x
        while (gapEnd < width && !colHasContent[gapEnd] && (gapEnd - x) < minGap) {
          gapEnd++
        }
        if (gapEnd < width && colHasContent[gapEnd] && (gapEnd - x) < minGap) {
          // Small gap, continue the frame
          continue
        }
        frames.push({ left: frameStart, right: x - 1 })
        inFrame = false
      }
    }
  }

  // Now find vertical bounds per frame (tight crop)
  const result = []
  for (const frame of frames) {
    let top = bandBottom, bottom = bandTop
    for (let y = bandTop; y < bandBottom; y++) {
      for (let x = frame.left; x <= frame.right; x++) {
        const idx = (y * width + x) * channels
        const r = raw[idx], g = raw[idx+1], b = raw[idx+2], a = raw[idx+3]
        if (!isBackground(r, g, b, a)) {
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }
    if (top < bottom) {
      result.push({ left: frame.left, right: frame.right, top, bottom })
    }
  }

  return result
}

async function extractFrame(raw, frame, width, channels) {
  const frameW = frame.right - frame.left + 1
  const frameH = frame.bottom - frame.top + 1

  // Extract frame pixels as RGBA
  const framePixels = Buffer.alloc(frameW * frameH * 4)
  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const srcIdx = ((frame.top + y) * width + (frame.left + x)) * channels
      const dstIdx = (y * frameW + x) * 4
      framePixels[dstIdx] = raw[srcIdx]
      framePixels[dstIdx + 1] = raw[srcIdx + 1]
      framePixels[dstIdx + 2] = raw[srcIdx + 2]
      framePixels[dstIdx + 3] = channels === 4 ? raw[srcIdx + 3] : 255
    }
  }

  // Make background transparent before resize
  for (let i = 0; i < framePixels.length; i += 4) {
    if (isBackground(framePixels[i], framePixels[i+1], framePixels[i+2], framePixels[i+3])) {
      framePixels[i+3] = 0
    }
  }

  // Fit into square (use larger dimension), maintaining aspect ratio
  const maxDim = Math.max(frameW, frameH)
  const squarePixels = Buffer.alloc(maxDim * maxDim * 4, 0) // all transparent
  const offsetX = Math.floor((maxDim - frameW) / 2)
  const offsetY = Math.floor((maxDim - frameH) / 2)
  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const srcIdx = (y * frameW + x) * 4
      const dstIdx = ((offsetY + y) * maxDim + (offsetX + x)) * 4
      squarePixels[dstIdx] = framePixels[srcIdx]
      squarePixels[dstIdx + 1] = framePixels[srcIdx + 1]
      squarePixels[dstIdx + 2] = framePixels[srcIdx + 2]
      squarePixels[dstIdx + 3] = framePixels[srcIdx + 3]
    }
  }

  // Resize to 48x48
  const resized = await sharp(squarePixels, { raw: { width: maxDim, height: maxDim, channels: 4 } })
    .resize(FRAME_SIZE, FRAME_SIZE, { kernel: 'nearest' })
    .raw()
    .toBuffer()

  // Quantize to palette and encode as RLE
  const rleFrame = []
  for (let y = 0; y < FRAME_SIZE; y++) {
    const row = []
    for (let x = 0; x < FRAME_SIZE; x++) {
      const idx = (y * FRAME_SIZE + x) * 4
      const r = resized[idx], g = resized[idx+1], b = resized[idx+2], a = resized[idx+3]
      row.push(findClosestPalette(r, g, b, a))
    }
    rleFrame.push(encodeRLE(row))
  }

  return rleFrame
}

function generateFrameFile(exportName, frames, fps, loop) {
  const framesStr = frames.map((frame, i) => {
    const rowsStr = frame.map(row => '    ' + JSON.stringify(row)).join(',\n')
    return `  // Frame ${i + 1}\n  [\n${rowsStr}\n  ]`
  }).join(',\n')

  return `import type { AnimationDef } from '../types'

export const ${exportName}: AnimationDef = {
  fps: ${fps},
  loop: ${loop},
  frames: [
${framesStr}
  ],
}
`
}

const STATE_CONFIG = [
  { name: 'idle', exportName: 'idleAnimation', file: 'idle.ts', fps: 4, loop: true },
  { name: 'eating', exportName: 'eatingAnimation', file: 'eating.ts', fps: 8, loop: true },
  { name: 'sleeping', exportName: 'sleepingAnimation', file: 'sleeping.ts', fps: 3, loop: true },
  { name: 'running', exportName: 'runningAnimation', file: 'running.ts', fps: 10, loop: true },
  { name: 'happy', exportName: 'happyAnimation', file: 'happy.ts', fps: 8, loop: true },
  { name: 'hiding', exportName: 'hidingAnimation', file: 'hiding.ts', fps: 6, loop: false },
  { name: 'adventure_out', exportName: 'adventureOutAnimation', file: 'adventure-out.ts', fps: 8, loop: false },
  { name: 'adventure_back', exportName: 'adventureBackAnimation', file: 'adventure-back.ts', fps: 8, loop: false },
]

async function main() {
  const inputPath = path.resolve('pet.png')
  console.log(`Reading ${inputPath}...`)

  const metadata = await sharp(inputPath).metadata()
  const width = metadata.width
  const height = metadata.height
  console.log(`Image: ${width}x${height}`)

  // Get raw pixel data
  const raw = await sharp(inputPath).ensureAlpha().raw().toBuffer()
  const channels = 4

  // Divide image into 8 equal horizontal bands
  const bandHeight = Math.floor(height / 8)
  console.log(`Band height: ${bandHeight}px\n`)

  const framesDir = path.resolve('src/sprites/frames')

  for (let bandIdx = 0; bandIdx < 8; bandIdx++) {
    const config = STATE_CONFIG[bandIdx]
    const bandTop = bandIdx * bandHeight
    const bandBottom = (bandIdx + 1) * bandHeight

    console.log(`[${config.name}] Band ${bandIdx+1}: y=${bandTop}-${bandBottom}`)

    // Detect individual frames in this band
    const frameBounds = await detectFramesInBand(raw, width, bandTop, bandBottom, channels)
    console.log(`  Found ${frameBounds.length} frames`)

    if (frameBounds.length === 0) {
      console.log(`  WARNING: No frames found, skipping`)
      continue
    }

    // Extract and quantize each frame
    const rleFrames = []
    for (let i = 0; i < frameBounds.length; i++) {
      const f = frameBounds[i]
      console.log(`  Frame ${i+1}: ${f.left},${f.top} -> ${f.right},${f.bottom} (${f.right-f.left+1}x${f.bottom-f.top+1})`)
      const rle = await extractFrame(raw, f, width, channels)
      rleFrames.push(rle)
    }

    // Generate and write the TypeScript file
    const content = generateFrameFile(config.exportName, rleFrames, config.fps, config.loop)
    const outPath = path.join(framesDir, config.file)
    fs.writeFileSync(outPath, content)
    console.log(`  -> Wrote ${outPath} (${rleFrames.length} frames)\n`)
  }

  console.log('Done! All frame files updated from AI-generated sprite sheet.')
}

main().catch(console.error)
