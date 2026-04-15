// src/sprites/renderer.ts

import { PALETTE } from './palette'
import { hexToRGB } from './types'
import type { PixelFrame } from './types'

const SIZE = 48

/** Pre-compute RGBA values from palette for fast rendering */
const PALETTE_RGBA: { r: number; g: number; b: number }[] = PALETTE.map(hex =>
  hex ? hexToRGB(hex) : { r: 0, g: 0, b: 0 }
)

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D
  private imageData: ImageData

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2d context')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
    this.imageData = ctx.createImageData(SIZE, SIZE)
  }

  /** Draw a decoded 48×48 pixel frame to the canvas */
  drawFrame(frame: PixelFrame): void {
    const data = this.imageData.data
    // Clear to fully transparent
    data.fill(0)

    for (let y = 0; y < SIZE; y++) {
      const row = frame[y]
      for (let x = 0; x < SIZE; x++) {
        const idx = row[x]
        if (idx === 0) continue // transparent
        const color = PALETTE_RGBA[idx]
        const i = (y * SIZE + x) * 4
        data[i] = color.r
        data[i + 1] = color.g
        data[i + 2] = color.b
        data[i + 3] = 255
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0)
  }

  /** Get the alpha value of a pixel at (x, y) from the current imageData */
  getPixelAlpha(x: number, y: number): number {
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return 0
    const i = (y * SIZE + x) * 4
    return this.imageData.data[i + 3]
  }

  /** Clear the canvas to fully transparent */
  clear(): void {
    this.ctx.clearRect(0, 0, SIZE, SIZE)
  }
}
