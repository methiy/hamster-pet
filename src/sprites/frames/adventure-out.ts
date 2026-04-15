import type { AnimationDef, RLEFrame, RLERow } from '../types'

/** Shift all non-transparent pixels right by N columns, clipping at column 48 */
function shiftRight(frame: RLEFrame, offset: number): RLEFrame {
  if (offset <= 0) return frame
  if (offset >= 48) return Array.from({ length: 48 }, () => [[48, 0]] as RLERow)
  return frame.map(row => {
    // Decode to flat pixels
    const pixels: number[] = []
    for (const [count, color] of row) {
      for (let i = 0; i < count; i++) pixels.push(color)
    }
    // Build shifted pixel array
    const shifted: number[] = new Array(48).fill(0)
    for (let i = 0; i < 48 - offset; i++) {
      shifted[i + offset] = pixels[i]
    }
    // Re-encode as RLE
    const rle: RLERow = []
    let runStart = 0
    for (let i = 1; i <= 48; i++) {
      if (i < 48 && shifted[i] === shifted[i - 1]) continue
      rle.push([i - runStart, shifted[runStart]])
      runStart = i
    }
    return rle
  })
}

// ── Side-view hamster facing right, walk pose A (legs together) ──────
// Palette: 0=transparent, 1=body gold, 2=belly light, 3=darker gold,
//          4=shadow, 5=blush, 6=outline brown, 7=nose, 8=white
const walkPoseA: RLEFrame = [
  // Rows 0-5: empty
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],

  // Row 6: ear tip
  [[18, 0], [2, 6], [28, 0]],
  // Row 7: ear pink
  [[17, 0], [1, 6], [2, 5], [1, 6], [27, 0]],
  // Row 8: ear base
  [[16, 0], [1, 6], [2, 5], [2, 1], [1, 6], [26, 0]],

  // Row 9: head top
  [[14, 0], [1, 6], [8, 1], [1, 6], [24, 0]],
  // Row 10: head
  [[13, 0], [1, 6], [10, 1], [1, 6], [23, 0]],
  // Row 11: head
  [[12, 0], [1, 6], [12, 1], [1, 6], [22, 0]],
  // Row 12: head widens for snout
  [[12, 0], [1, 6], [13, 1], [1, 6], [21, 0]],
  // Row 13: head
  [[12, 0], [1, 6], [13, 1], [1, 6], [21, 0]],
  // Row 14: above eye
  [[12, 0], [1, 6], [13, 1], [1, 6], [21, 0]],

  // Row 15: eye top (eye at col ~18-20)
  [[12, 0], [1, 6], [6, 1], [3, 6], [4, 1], [1, 6], [21, 0]],
  // Row 16: eye middle with highlight
  [[12, 0], [1, 6], [6, 1], [1, 6], [1, 8], [1, 6], [4, 1], [1, 6], [21, 0]],
  // Row 17: eye bottom + blush
  [[12, 0], [1, 6], [4, 1], [2, 5], [3, 6], [4, 1], [1, 6], [21, 0]],

  // Row 18: blush + nose
  [[12, 0], [1, 6], [4, 1], [2, 5], [5, 1], [2, 7], [1, 6], [21, 0]],
  // Row 19: mouth
  [[12, 0], [1, 6], [11, 1], [1, 6], [1, 1], [1, 6], [21, 0]],
  // Row 20: chin
  [[13, 0], [1, 6], [11, 1], [1, 6], [22, 0]],
  // Row 21: chin bottom with shadow
  [[13, 0], [1, 6], [10, 1], [1, 4], [1, 6], [22, 0]],

  // Row 22: neck
  [[12, 0], [1, 6], [11, 1], [1, 4], [1, 6], [22, 0]],
  // Row 23: body top with belly
  [[11, 0], [1, 6], [1, 3], [4, 1], [6, 2], [2, 1], [1, 4], [1, 6], [21, 0]],

  // Row 24-27: body + backpack (backpack = 3px darker gold on left)
  [[9, 0], [1, 6], [3, 3], [1, 6], [1, 3], [3, 1], [7, 2], [2, 1], [1, 4], [1, 6], [19, 0]],
  [[9, 0], [1, 6], [3, 3], [1, 6], [1, 3], [3, 1], [7, 2], [2, 1], [1, 4], [1, 6], [19, 0]],
  [[9, 0], [1, 6], [3, 3], [1, 6], [1, 3], [3, 1], [7, 2], [2, 1], [1, 4], [1, 6], [19, 0]],
  [[9, 0], [1, 6], [3, 3], [1, 6], [1, 3], [3, 1], [7, 2], [2, 1], [1, 4], [1, 6], [19, 0]],

  // Row 28: body + backpack, belly narrows
  [[9, 0], [1, 6], [3, 3], [1, 6], [1, 3], [3, 1], [6, 2], [3, 1], [1, 4], [1, 6], [19, 0]],
  // Row 29: backpack bottom outline
  [[10, 0], [4, 6], [1, 3], [4, 1], [5, 2], [3, 1], [1, 4], [1, 6], [19, 0]],
  // Row 30: body
  [[11, 0], [1, 6], [1, 3], [4, 1], [4, 2], [3, 1], [1, 4], [1, 6], [22, 0]],
  // Row 31: body narrows
  [[12, 0], [1, 6], [4, 1], [3, 2], [3, 1], [1, 4], [1, 6], [23, 0]],
  // Row 32: body bottom
  [[12, 0], [1, 6], [4, 1], [2, 2], [3, 1], [1, 4], [1, 6], [24, 0]],
  // Row 33: body outline bottom
  [[13, 0], [1, 6], [8, 1], [1, 4], [1, 6], [24, 0]],

  // Row 34: legs top (close together)
  [[13, 0], [1, 6], [2, 3], [1, 6], [3, 0], [1, 6], [2, 3], [1, 6], [24, 0]],
  // Row 35: legs
  [[12, 0], [1, 6], [3, 3], [1, 6], [3, 0], [1, 6], [3, 3], [1, 6], [23, 0]],
  // Row 36: legs
  [[12, 0], [1, 6], [3, 3], [1, 6], [3, 0], [1, 6], [3, 3], [1, 6], [23, 0]],
  // Row 37: paw outlines
  [[13, 0], [4, 6], [3, 0], [4, 6], [24, 0]],

  // Row 38: tail (extends left from back)
  [[9, 0], [1, 6], [2, 3], [1, 6], [35, 0]],
  // Row 39: tail tip
  [[10, 0], [2, 6], [36, 0]],

  // Rows 40-47: empty
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
  [[48, 0]],
]

// ── Walk pose B: legs spread (front leg forward, back leg backward) ──
const walkPoseB: RLEFrame = [
  // Rows 0-33: same as pose A
  ...walkPoseA.slice(0, 34),
  // Row 34: legs spread wider
  [[12, 0], [1, 6], [2, 3], [1, 6], [5, 0], [1, 6], [2, 3], [1, 6], [23, 0]],
  // Row 35: legs spread
  [[11, 0], [1, 6], [3, 3], [1, 6], [5, 0], [1, 6], [3, 3], [1, 6], [22, 0]],
  // Row 36: legs spread
  [[11, 0], [1, 6], [3, 3], [1, 6], [5, 0], [1, 6], [3, 3], [1, 6], [22, 0]],
  // Row 37: paw outlines spread
  [[12, 0], [4, 6], [5, 0], [4, 6], [23, 0]],
  // Rows 38-47: tail + empty (same as pose A)
  ...walkPoseA.slice(38),
]

// ── Fully transparent frame ─────────────────────────────────────────
const emptyFrame: RLEFrame = Array.from({ length: 48 }, () => [[48, 0]] as [number, number][])

// ── Adventure Out: hamster walks off-screen to the right ────────────
// 10 frames at 8fps, plays once then stops on last (empty) frame
export const adventureOutAnimation: AnimationDef = {
  fps: 8,
  loop: false,
  frames: [
    walkPoseA,                    // Frame 1: standing with backpack, facing right
    shiftRight(walkPoseB, 5),     // Frame 2: walking, legs spread
    shiftRight(walkPoseA, 10),    // Frame 3: walking
    shiftRight(walkPoseB, 16),    // Frame 4: walking, partially off-screen
    shiftRight(walkPoseA, 22),    // Frame 5: mostly off-screen right
    shiftRight(walkPoseB, 28),    // Frame 6: mostly off-screen
    shiftRight(walkPoseA, 34),    // Frame 7: almost off
    shiftRight(walkPoseB, 39),    // Frame 8: barely visible
    shiftRight(walkPoseA, 44),    // Frame 9: just a sliver
    emptyFrame,                   // Frame 10: fully gone
  ],
}
