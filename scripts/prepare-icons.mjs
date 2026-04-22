#!/usr/bin/env node
// Prepare icon source images for Tauri.
//
// Inputs:
//   art/icon.png  — 4096×4096 RGB, already squared with the cat centered.
//                   Just needs an alpha channel added. Used as the app icon
//                   (feeds into `npx tauri icon`).
//   art/icon1.png — 1024×1024 RGB, cat is off-center (down-right). We
//                   recenter the cat by placing it on a larger same-color
//                   square canvas, then shrink back to a square that keeps
//                   the cat fully within the frame with equal margins on
//                   all four sides.
//
// Outputs:
//   .tmp-icons/app-icon-src.png  — normalized squared PNG for `tauri icon`
//   .tmp-icons/tray-icon-src.png — normalized squared PNG for tray generation
//
// Nothing is committed from .tmp-icons — it's a scratch staging dir.

import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const TMP = path.join(ROOT, '.tmp-icons')

async function ensureAlpha(inputPath, outputPath) {
  await sharp(inputPath).ensureAlpha().png().toFile(outputPath)
  console.log(`[ensureAlpha] ${inputPath} -> ${outputPath}`)
}

async function findContentBBox(inputPath, tol) {
  // Estimate the canvas background from a 20-pixel-wide ring of corners,
  // then find the tight bbox of pixels whose color differs from that
  // background by more than `tol` in any channel.
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const W = info.width
  const H = info.height
  const sample = (x, y) => {
    const i = (y * W + x) * 4
    return [data[i], data[i + 1], data[i + 2]]
  }
  const samples = []
  for (let r = 0; r < 20; r++) {
    samples.push(sample(r, r), sample(W - 1 - r, r), sample(r, H - 1 - r), sample(W - 1 - r, H - 1 - r))
  }
  const avg = [0, 1, 2].map((k) => samples.reduce((s, c) => s + c[k], 0) / samples.length)

  let minX = W
  let minY = H
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const d = Math.max(
        Math.abs(data[i] - avg[0]),
        Math.abs(data[i + 1] - avg[1]),
        Math.abs(data[i + 2] - avg[2]),
      )
      if (d > tol) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  return { W, H, bg: avg.map((v) => Math.round(v)), minX, minY, maxX, maxY }
}

async function recenterOnSquare(inputPath, outputPath, tol = 50, pad = 0.1) {
  // Place the content (as located by findContentBBox) centered on a new
  // square canvas whose side = content longer-side * (1 + 2*pad), filled
  // with the detected background color (same color = invisible seam).
  const bb = await findContentBBox(inputPath, tol)
  const contentW = bb.maxX - bb.minX + 1
  const contentH = bb.maxY - bb.minY + 1
  const side = Math.round(Math.max(contentW, contentH) * (1 + 2 * pad))

  console.log(
    `[recenter] ${inputPath}: canvas ${bb.W}x${bb.H}, bg rgb(${bb.bg.join(',')}), content ${contentW}x${contentH} at (${bb.minX},${bb.minY}) -> ${side}x${side} square`,
  )

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .extract({ left: bb.minX, top: bb.minY, width: contentW, height: contentH })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bg = { r: bb.bg[0], g: bb.bg[1], b: bb.bg[2], alpha: 1 }
  await sharp({
    create: { width: side, height: side, channels: 4, background: bg },
  })
    .composite([
      {
        input: data,
        raw: { width: info.width, height: info.height, channels: info.channels },
        top: Math.round((side - contentH) / 2),
        left: Math.round((side - contentW) / 2),
      },
    ])
    .png()
    .toFile(outputPath)

  console.log(`[recenter] -> ${outputPath}`)
}

async function main() {
  await fs.mkdir(TMP, { recursive: true })

  // App icon: already centered, just needs an alpha channel.
  await ensureAlpha(path.join(ROOT, 'art/icon.png'), path.join(TMP, 'app-icon-src.png'))

  // Tray icon: cat is off-center on the original canvas, recenter first.
  await recenterOnSquare(path.join(ROOT, 'art/icon1.png'), path.join(TMP, 'tray-icon-src.png'), 50, 0.1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
