// src/sprites/types.ts

/** A single row encoded as run-length pairs: [count, paletteIndex][] */
export type RLERow = [number, number][]

/** A full frame: 48 rows of RLE-encoded pixel data */
export type RLEFrame = RLERow[]

/** A decoded frame: 48×48 grid of palette indices */
export type PixelFrame = number[][]

/** Animation definition for one hamster state */
export interface AnimationDef {
  /** RLE-encoded frames */
  frames: RLEFrame[]
  /** Playback speed in frames per second */
  fps: number
  /** Whether the animation loops or stops on last frame */
  loop: boolean
}

/**
 * Decode an RLE-encoded frame into a 48×48 pixel grid.
 * Each cell is a palette index (0 = transparent).
 */
export function decodeFrame(rleFrame: RLEFrame): PixelFrame {
  return rleFrame.map(row => {
    const pixels: number[] = []
    for (const [count, color] of row) {
      for (let i = 0; i < count; i++) pixels.push(color)
    }
    return pixels
  })
}

/**
 * Parse a hex color string (#RRGGBB) into {r, g, b}.
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}
