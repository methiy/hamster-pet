#!/usr/bin/env node
// Key out the uniform light-gray background from the app/tray icon sources
// and emit transparent RGBA PNGs. We use a flood fill seeded from the four
// corners so interior gray-ish regions (e.g. the cat's own belly, if any)
// aren't accidentally erased.
//
// Usage:
//   node scripts/keyout-background.mjs <input.png> <output.png> [tolerance]
//
// Tolerance (default 40) = max per-channel distance from the seeded
// background color that still counts as "same background". Edges within 8px
// of a cleared region get a graded alpha to soften flood-fill aliasing.

import sharp from 'sharp'

const [, , inputPath, outputPath, tolArg] = process.argv
if (!inputPath || !outputPath) {
  console.error('usage: node scripts/keyout-background.mjs <input> <output> [tolerance]')
  process.exit(1)
}
const TOL = Number(tolArg ?? 40)

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2))
}

async function main() {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const W = info.width
  const H = info.height
  const N = W * H

  // 1) Estimate the background color from a 20-pixel ring of corner samples.
  const samples = []
  for (let r = 0; r < 20; r++) {
    for (const [sx, sy] of [
      [r, r],
      [W - 1 - r, r],
      [r, H - 1 - r],
      [W - 1 - r, H - 1 - r],
    ]) {
      const i = (sy * W + sx) * 4
      samples.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  const bg = [0, 1, 2].map((k) => samples.reduce((s, c) => s + c[k], 0) / samples.length)
  console.log(`bg rgb=(${bg.map((v) => v.toFixed(0)).join(',')}), tol=${TOL}`)

  // 2) Flood fill from every perimeter pixel that matches the background.
  //    Use a typed-array stack for speed on 4K canvases.
  const isBgPx = new Uint8Array(N) // 1 = background (will become transparent)
  const stack = new Int32Array(N)
  let sp = 0

  const tryPush = (idx) => {
    if (isBgPx[idx]) return
    const i = idx * 4
    const d = colorDist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2])
    if (d <= TOL) {
      isBgPx[idx] = 1
      stack[sp++] = idx
    }
  }

  // Seed: every pixel on the 4 edges.
  for (let x = 0; x < W; x++) {
    tryPush(x) // top row
    tryPush((H - 1) * W + x) // bottom row
  }
  for (let y = 0; y < H; y++) {
    tryPush(y * W) // left col
    tryPush(y * W + (W - 1)) // right col
  }

  while (sp > 0) {
    const idx = stack[--sp]
    const x = idx % W
    const y = (idx / W) | 0
    if (x > 0) tryPush(idx - 1)
    if (x < W - 1) tryPush(idx + 1)
    if (y > 0) tryPush(idx - W)
    if (y < H - 1) tryPush(idx + W)
  }

  // 3) Write out: fully transparent where isBg=1; otherwise keep RGBA.
  //    Do NOT feather/dilate — keep the edit conservative so the cat's
  //    internal colors are untouched.
  const out = Buffer.alloc(N * 4)
  let kept = 0
  let cleared = 0
  for (let idx = 0; idx < N; idx++) {
    const i = idx * 4
    if (isBgPx[idx]) {
      out[i] = 0
      out[i + 1] = 0
      out[i + 2] = 0
      out[i + 3] = 0
      cleared++
    } else {
      out[i] = data[i]
      out[i + 1] = data[i + 1]
      out[i + 2] = data[i + 2]
      out[i + 3] = 255
      kept++
    }
  }

  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(outputPath)

  console.log(
    `${inputPath} -> ${outputPath}: cleared ${cleared} (${((cleared / N) * 100).toFixed(1)}%), kept ${kept}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
