// scripts/fix-running-band.mjs
// The running row has overlapping wheel graphics that connect frames.
// Force-split into 8 equal-width frames within the band.

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const FRAME_SIZE = 48

const PALETTE = [
  null,
  [240, 184, 102], [252, 228, 184], [232, 168, 98], [212, 148, 58],
  [248, 180, 180], [74, 53, 32], [212, 133, 106], [255, 255, 255],
  [123, 158, 199], [245, 215, 110], [204, 204, 204], [224, 213, 192],
  [180, 120, 60], [140, 90, 45], [255, 230, 200],
]

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
}

function isBackground(r, g, b, a) {
  if (a < 128) return true
  if (r > 240 && g > 240 && b > 240) return true
  return false
}

function findClosestPalette(r, g, b, a) {
  if (isBackground(r, g, b, a)) return 0
  let bestIdx = 1, bestDist = Infinity
  for (let i = 1; i < PALETTE.length; i++) {
    const [pr, pg, pb] = PALETTE[i]
    const d = colorDistance(r, g, b, pr, pg, pb)
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  return bestIdx
}

function encodeRLE(row) {
  const rle = []
  let count = 1
  for (let i = 1; i <= row.length; i++) {
    if (i < row.length && row[i] === row[i-1]) { count++ }
    else { rle.push([count, row[i-1]]); count = 1 }
  }
  return rle
}

async function main() {
  const metadata = await sharp('pet.png').metadata()
  const width = metadata.width, height = metadata.height
  const raw = await sharp('pet.png').ensureAlpha().raw().toBuffer()

  // Running band is row 4 (index 3): y=1536 to y=2048
  const bandTop = 1536, bandBottom = 2048
  const bandHeight = bandBottom - bandTop

  // Force-split into 8 equal columns
  const frameWidth = Math.floor(width / 8)
  const numFrames = 8

  console.log(`Running band: y=${bandTop}-${bandBottom}, splitting into ${numFrames} frames of ${frameWidth}px width`)

  const rleFrames = []
  for (let i = 0; i < numFrames; i++) {
    const left = i * frameWidth
    const right = (i + 1) * frameWidth - 1

    // Find tight vertical bounds
    let top = bandBottom, bottom = bandTop
    for (let y = bandTop; y < bandBottom; y++) {
      for (let x = left; x <= right; x++) {
        const idx = (y * width + x) * 4
        if (!isBackground(raw[idx], raw[idx+1], raw[idx+2], raw[idx+3])) {
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }

    const fW = right - left + 1
    const fH = bottom - top + 1
    console.log(`  Frame ${i+1}: ${left},${top} -> ${right},${bottom} (${fW}x${fH})`)

    // Extract and make background transparent
    const framePixels = Buffer.alloc(fW * fH * 4, 0)
    for (let y = 0; y < fH; y++) {
      for (let x = 0; x < fW; x++) {
        const srcIdx = ((top + y) * width + (left + x)) * 4
        const dstIdx = (y * fW + x) * 4
        const r = raw[srcIdx], g = raw[srcIdx+1], b = raw[srcIdx+2], a = raw[srcIdx+3]
        if (isBackground(r, g, b, a)) {
          framePixels[dstIdx+3] = 0
        } else {
          framePixels[dstIdx] = r; framePixels[dstIdx+1] = g
          framePixels[dstIdx+2] = b; framePixels[dstIdx+3] = 255
        }
      }
    }

    // Center in square and resize to 48x48
    const maxDim = Math.max(fW, fH)
    const sq = Buffer.alloc(maxDim * maxDim * 4, 0)
    const ox = Math.floor((maxDim - fW) / 2)
    const oy = Math.floor((maxDim - fH) / 2)
    for (let y = 0; y < fH; y++) {
      for (let x = 0; x < fW; x++) {
        const s = (y * fW + x) * 4
        const d = ((oy+y) * maxDim + (ox+x)) * 4
        sq[d]=framePixels[s]; sq[d+1]=framePixels[s+1]; sq[d+2]=framePixels[s+2]; sq[d+3]=framePixels[s+3]
      }
    }

    const resized = await sharp(sq, { raw: { width: maxDim, height: maxDim, channels: 4 } })
      .resize(FRAME_SIZE, FRAME_SIZE, { kernel: 'nearest' })
      .raw().toBuffer()

    const rleFrame = []
    for (let y = 0; y < FRAME_SIZE; y++) {
      const row = []
      for (let x = 0; x < FRAME_SIZE; x++) {
        const idx = (y * FRAME_SIZE + x) * 4
        row.push(findClosestPalette(resized[idx], resized[idx+1], resized[idx+2], resized[idx+3]))
      }
      rleFrame.push(encodeRLE(row))
    }
    rleFrames.push(rleFrame)
  }

  // Write file
  const framesStr = rleFrames.map((frame, i) => {
    const rowsStr = frame.map(row => '    ' + JSON.stringify(row)).join(',\n')
    return `  // Frame ${i + 1}\n  [\n${rowsStr}\n  ]`
  }).join(',\n')

  const content = `import type { AnimationDef } from '../types'

export const runningAnimation: AnimationDef = {
  fps: 10,
  loop: true,
  frames: [
${framesStr}
  ],
}
`
  fs.writeFileSync('src/sprites/frames/running.ts', content)
  console.log(`\nWrote running.ts with ${rleFrames.length} frames`)
}

main().catch(console.error)
