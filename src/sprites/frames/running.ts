import type { AnimationDef, RLEFrame, RLERow } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────

function decodeRLE(row: RLERow): number[] {
  const p: number[] = []
  for (const [c, v] of row) for (let i = 0; i < c; i++) p.push(v)
  return p
}

function encodeRLE(pixels: number[]): RLERow {
  const r: RLERow = []
  let i = 0
  while (i < pixels.length) {
    const v = pixels[i]; let n = 1
    while (i + n < pixels.length && pixels[i + n] === v) n++
    r.push([n, v]); i += n
  }
  return r
}

// ── Wheel (circle + hub + 4 spokes) on a 48×48 grid ─────────────────

const WCX = 18, WCY = 34, WR = 11 // centre-x, centre-y, radius

function makeWheelGrid(spokeAngleDeg: number): number[][] {
  const g: number[][] = Array.from({ length: 48 }, () => new Array(48).fill(0))
  const set = (x: number, y: number) => {
    if (x >= 0 && x < 48 && y >= 0 && y < 48) g[y][x] = 11
  }
  // Circle outline
  for (let a = 0; a < 360; a++) {
    const r = (a * Math.PI) / 180
    set(Math.round(WCX + WR * Math.cos(r)), Math.round(WCY + WR * Math.sin(r)))
  }
  // Hub dot
  set(WCX, WCY)
  // 4 spokes rotating by spokeAngleDeg
  for (let s = 0; s < 4; s++) {
    const a = ((s * 90 + spokeAngleDeg) * Math.PI) / 180
    for (let d = 2; d < WR - 1; d++) {
      set(Math.round(WCX + d * Math.cos(a)), Math.round(WCY + d * Math.sin(a)))
    }
  }
  return g
}

// ── Hamster body RLE rows at IDLE positions (rows 0-38) ──────────────
// Based on idle baseFrame with arms tucked (palette 3 → 1 in body rows)

const bodyRows: RLERow[] = [
  // Row 0-4: empty
  [[48, 0]], [[48, 0]], [[48, 0]], [[48, 0]], [[48, 0]],
  // Row 5-9: ears
  [[10, 0], [2, 6], [4, 0], [2, 6], [6, 0], [2, 6], [4, 0], [2, 6], [16, 0]],
  [[9, 0], [1, 6], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 6], [4, 0], [1, 6], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 6], [19, 0]],
  [[9, 0], [1, 6], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 6], [4, 0], [1, 6], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 6], [19, 0]],
  [[8, 0], [1, 6], [2, 5], [1, 1], [2, 0], [1, 1], [2, 5], [1, 6], [2, 0], [1, 6], [2, 5], [1, 1], [2, 0], [1, 1], [2, 5], [1, 6], [18, 0]],
  [[8, 0], [1, 6], [1, 5], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 5], [1, 6], [18, 0]],
  // Row 10-16: head
  [[9, 0], [1, 6], [2, 1], [1, 6], [2, 1], [2, 6], [2, 1], [1, 6], [2, 1], [1, 6], [25, 0]],
  [[8, 0], [1, 6], [14, 1], [1, 6], [24, 0]],
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  [[6, 0], [1, 6], [18, 1], [1, 6], [22, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  // Row 17-20: eyes + blush
  [[5, 0], [1, 6], [4, 1], [3, 6], [6, 1], [3, 6], [4, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [4, 1], [1, 6], [1, 8], [1, 6], [6, 1], [1, 6], [1, 8], [1, 6], [4, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [2, 1], [2, 5], [3, 6], [6, 1], [3, 6], [2, 5], [2, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [2, 1], [2, 5], [3, 1], [6, 1], [3, 1], [2, 5], [2, 1], [1, 6], [21, 0]],
  // Row 21-24: nose / mouth / teeth / chin
  [[5, 0], [1, 6], [8, 1], [2, 7], [2, 1], [2, 7], [6, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [8, 1], [1, 6], [4, 1], [1, 6], [6, 1], [1, 6], [21, 0]],
  [[6, 0], [1, 6], [7, 1], [1, 12], [2, 8], [1, 12], [6, 1], [1, 6], [23, 0]],
  [[7, 0], [1, 6], [14, 1], [2, 4], [1, 6], [23, 0]],
  // Row 25: neck
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  // Row 26: body widens
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [1, 4], [1, 6], [21, 0]],
  // Row 27-32: body (arms tucked — [1,3] removed, extra [1] merged into body)
  [[5, 0], [1, 6], [6, 1], [10, 2], [4, 1], [1, 4], [1, 6], [20, 0]],
  [[5, 0], [1, 6], [6, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [6, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [6, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [6, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [6, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  // Row 33: belly narrows (tucked)
  [[5, 0], [1, 6], [6, 1], [8, 2], [6, 1], [2, 4], [1, 6], [19, 0]],
  // Row 34-38: lower body
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [2, 4], [1, 6], [20, 0]],
  [[6, 0], [1, 6], [6, 1], [6, 2], [5, 1], [2, 4], [1, 6], [21, 0]],
  [[7, 0], [1, 6], [5, 1], [4, 2], [5, 1], [2, 4], [1, 6], [23, 0]],
  [[7, 0], [1, 6], [5, 1], [2, 2], [5, 1], [2, 4], [1, 6], [25, 0]],
  [[8, 0], [1, 6], [10, 1], [2, 4], [1, 6], [26, 0]],
]

// ── Paw variants (at idle x-positions, shift applied later) ──────────
// Spread: paws move ±1px apart (running stride extended)
const pawsSpread: RLERow[] = [
  [[7, 0], [1, 6], [3, 3], [1, 6], [6, 0], [1, 6], [3, 3], [1, 6], [25, 0]],
  [[6, 0], [1, 6], [4, 3], [1, 6], [6, 0], [1, 6], [4, 3], [1, 6], [24, 0]],
  [[6, 0], [1, 6], [4, 3], [1, 6], [6, 0], [1, 6], [4, 3], [1, 6], [24, 0]],
  [[7, 0], [5, 6], [6, 0], [5, 6], [25, 0]],
]

// Compressed: paws move ±1px closer (stride retracted)
const pawsCompressed: RLERow[] = [
  [[9, 0], [1, 6], [3, 3], [1, 6], [2, 0], [1, 6], [3, 3], [1, 6], [27, 0]],
  [[8, 0], [1, 6], [4, 3], [1, 6], [2, 0], [1, 6], [4, 3], [1, 6], [26, 0]],
  [[8, 0], [1, 6], [4, 3], [1, 6], [2, 0], [1, 6], [4, 3], [1, 6], [26, 0]],
  [[9, 0], [5, 6], [2, 0], [5, 6], [27, 0]],
]

// Tail + trailing empty rows (at idle positions)
const tailAndEmpty: RLERow[] = [
  [[5, 0], [1, 6], [2, 3], [1, 6], [39, 0]], // row 43
  [[6, 0], [2, 6], [40, 0]],                  // row 44
  [[48, 0]], [[48, 0]], [[48, 0]],             // rows 45-47
]

// ── Frame builder ────────────────────────────────────────────────────

const SHIFT = 1 // body tilts 1px right (forward lean)

function buildFrame(
  spokeAngleDeg: number,
  paws: RLERow[],
): RLEFrame {
  // 1. Draw wheel onto grid
  const grid = makeWheelGrid(spokeAngleDeg)

  // 2. Assemble full hamster RLE (48 rows)
  const hamsterRLE: RLERow[] = [
    ...bodyRows,     // rows 0-38  (39 rows)
    ...paws,         // rows 39-42 ( 4 rows)
    ...tailAndEmpty, // rows 43-47 ( 5 rows)
  ]

  // 3. Decode, shift, and overlay hamster on top of wheel
  for (let y = 0; y < 48; y++) {
    const raw = decodeRLE(hamsterRLE[y])
    for (let x = 0; x < 48; x++) {
      const src = x - SHIFT
      const colour = src >= 0 && src < 48 ? raw[src] : 0
      if (colour !== 0) grid[y][x] = colour
    }
  }

  // 4. Encode grid back to RLE
  return grid.map((row) => encodeRLE(row))
}

// ── 8 frames: spokes rotate 45°/frame, paws alternate each frame ────

const frames: RLEFrame[] = Array.from({ length: 8 }, (_, i) =>
  buildFrame(i * 45, i % 2 === 0 ? pawsSpread : pawsCompressed),
)

export const runningAnimation: AnimationDef = {
  fps: 10,
  loop: true,
  frames,
}
