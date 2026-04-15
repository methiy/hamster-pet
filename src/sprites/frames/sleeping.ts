import type { AnimationDef, RLEFrame, RLERow } from '../types'

// ── Shared row sections ──────────────────────────────────────────────

const E: RLERow = [[48, 0]]

// Ears (5 rows) — identical to idle
const ears: RLERow[] = [
  [[10, 0], [2, 6], [4, 0], [2, 6], [6, 0], [2, 6], [4, 0], [2, 6], [16, 0]],
  [[9, 0], [1, 6], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 6], [4, 0], [1, 6], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 6], [19, 0]],
  [[9, 0], [1, 6], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 6], [4, 0], [1, 6], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 6], [19, 0]],
  [[8, 0], [1, 6], [2, 5], [1, 1], [2, 0], [1, 1], [2, 5], [1, 6], [2, 0], [1, 6], [2, 5], [1, 1], [2, 0], [1, 1], [2, 5], [1, 6], [18, 0]],
  [[8, 0], [1, 6], [1, 5], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 5], [1, 6], [18, 0]],
]

// Head top (7 rows)
const headTop: RLERow[] = [
  [[9, 0], [1, 6], [2, 1], [1, 6], [2, 1], [2, 6], [2, 1], [1, 6], [2, 1], [1, 6], [25, 0]],
  [[8, 0], [1, 6], [14, 1], [1, 6], [24, 0]],
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  [[6, 0], [1, 6], [18, 1], [1, 6], [22, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
]

// Closed eyes + blush (4 rows) — horizontal line eyes, no pupils
const closedEyes: RLERow[] = [
  [[5, 0], [1, 6], [4, 1], [3, 6], [6, 1], [3, 6], [4, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [2, 1], [2, 5], [8, 1], [2, 5], [6, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [2, 1], [2, 5], [3, 1], [6, 1], [3, 1], [2, 5], [2, 1], [1, 6], [21, 0]],
]

// Nose + closed mouth (4 rows) — peaceful sleeping face
const sleepFace: RLERow[] = [
  [[5, 0], [1, 6], [8, 1], [2, 7], [2, 1], [2, 7], [6, 1], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [9, 1], [2, 6], [9, 1], [1, 6], [21, 0]],
  [[6, 0], [1, 6], [17, 1], [1, 6], [23, 0]],
  [[7, 0], [1, 6], [14, 1], [2, 4], [1, 6], [23, 0]],
]

// Curled body (13 rows) — 1 row shorter than base for sleeping pose
const bodyCurled: RLERow[] = [
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [1, 4], [1, 6], [21, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [4, 1], [1, 4], [1, 6], [20, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [8, 2], [6, 1], [2, 4], [1, 6], [19, 0]],
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [2, 4], [1, 6], [20, 0]],
  [[6, 0], [1, 6], [6, 1], [6, 2], [5, 1], [2, 4], [1, 6], [21, 0]],
  [[7, 0], [1, 6], [5, 1], [4, 2], [5, 1], [2, 4], [1, 6], [23, 0]],
  [[7, 0], [1, 6], [5, 1], [2, 2], [5, 1], [2, 4], [1, 6], [25, 0]],
  [[8, 0], [1, 6], [10, 1], [2, 4], [1, 6], [26, 0]],
]

// Expanded body (15 rows) — breathing in, slightly wider
const bodyExpanded: RLERow[] = [
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [1, 4], [1, 6], [21, 0]],
  [[4, 0], [1, 6], [1, 3], [6, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  [[4, 0], [1, 6], [1, 3], [6, 1], [10, 2], [5, 1], [2, 4], [1, 6], [18, 0]],
  [[4, 0], [1, 6], [1, 3], [6, 1], [10, 2], [5, 1], [2, 4], [1, 6], [18, 0]],
  [[4, 0], [1, 6], [1, 3], [6, 1], [10, 2], [5, 1], [2, 4], [1, 6], [18, 0]],
  [[4, 0], [1, 6], [1, 3], [6, 1], [10, 2], [5, 1], [2, 4], [1, 6], [18, 0]],
  [[4, 0], [1, 6], [1, 3], [6, 1], [10, 2], [5, 1], [2, 4], [1, 6], [18, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [2, 4], [1, 6], [18, 0]],
  [[5, 0], [1, 6], [1, 3], [5, 1], [8, 2], [5, 1], [2, 4], [1, 6], [20, 0]],
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [2, 4], [1, 6], [20, 0]],
  [[6, 0], [1, 6], [6, 1], [6, 2], [5, 1], [2, 4], [1, 6], [21, 0]],
  [[7, 0], [1, 6], [5, 1], [4, 2], [5, 1], [2, 4], [1, 6], [23, 0]],
  [[8, 0], [1, 6], [5, 1], [2, 2], [5, 1], [2, 4], [1, 6], [24, 0]],
  [[8, 0], [1, 6], [11, 1], [2, 4], [1, 6], [25, 0]],
]

// Paws for curled body (4 rows)
const pawsCurled: RLERow[] = [
  [[8, 0], [1, 6], [3, 3], [1, 6], [4, 0], [1, 6], [3, 3], [1, 6], [26, 0]],
  [[7, 0], [1, 6], [4, 3], [1, 6], [4, 0], [1, 6], [4, 3], [1, 6], [25, 0]],
  [[7, 0], [1, 6], [4, 3], [1, 6], [4, 0], [1, 6], [4, 3], [1, 6], [25, 0]],
  [[8, 0], [5, 6], [4, 0], [5, 6], [26, 0]],
]

// Paws for expanded body (3 rows)
const pawsExpanded: RLERow[] = [
  [[8, 0], [1, 6], [3, 3], [1, 6], [4, 0], [1, 6], [3, 3], [1, 6], [26, 0]],
  [[7, 0], [1, 6], [4, 3], [1, 6], [4, 0], [1, 6], [4, 3], [1, 6], [25, 0]],
  [[8, 0], [5, 6], [4, 0], [5, 6], [26, 0]],
]

// Tail (2 rows)
const tail: RLERow[] = [
  [[5, 0], [1, 6], [2, 3], [1, 6], [39, 0]],
  [[6, 0], [2, 6], [40, 0]],
]

// ── Floating "z" rows (3×3 pixel z using palette 9 — blue) ──────────

// z low: rows 2-4, columns 28-30
const zLowR0: RLERow = [[28, 0], [3, 9], [17, 0]]
const zLowR1: RLERow = [[29, 0], [1, 9], [18, 0]]
const zLowR2: RLERow = [[28, 0], [3, 9], [17, 0]]

// z mid: rows 1-3, columns 29-31
const zMidR0: RLERow = [[29, 0], [3, 9], [16, 0]]
const zMidR1: RLERow = [[30, 0], [1, 9], [17, 0]]
const zMidR2: RLERow = [[29, 0], [3, 9], [16, 0]]

// z high: rows 0-2, columns 30-32
const zHighR0: RLERow = [[30, 0], [3, 9], [15, 0]]
const zHighR1: RLERow = [[31, 0], [1, 9], [16, 0]]
const zHighR2: RLERow = [[30, 0], [3, 9], [15, 0]]

// ── Composed frames ─────────────────────────────────────────────────

// Frame A: curled body, z near head (low)
const sleepCurledZLow: RLEFrame = [
  // rows 0-4: z at rows 2-4
  E, E, zLowR0, zLowR1, zLowR2,
  // rows 5-9: ears
  ...ears,
  // rows 10-16: head top
  ...headTop,
  // rows 17-20: closed eyes + blush
  ...closedEyes,
  // rows 21-24: sleeping face
  ...sleepFace,
  // rows 25-37: curled body (13 rows)
  ...bodyCurled,
  // rows 38-41: paws
  ...pawsCurled,
  // rows 42-43: tail
  ...tail,
  // rows 44-47: empty
  E, E, E, E,
]

// Frame B: expanded body (breathing in), z rising (mid)
const sleepExpandedZMid: RLEFrame = [
  // rows 0-4: z at rows 1-3
  E, zMidR0, zMidR1, zMidR2, E,
  // rows 5-9: ears
  ...ears,
  // rows 10-16: head top
  ...headTop,
  // rows 17-20: closed eyes + blush
  ...closedEyes,
  // rows 21-24: sleeping face
  ...sleepFace,
  // rows 25-39: expanded body (15 rows)
  ...bodyExpanded,
  // rows 40-42: paws
  ...pawsExpanded,
  // rows 43-44: tail
  ...tail,
  // rows 45-47: empty
  E, E, E,
]

// Frame C: curled body, z at top (high)
const sleepCurledZHigh: RLEFrame = [
  // rows 0-4: z at rows 0-2
  zHighR0, zHighR1, zHighR2, E, E,
  // rows 5-9: ears
  ...ears,
  // rows 10-16: head top
  ...headTop,
  // rows 17-20: closed eyes + blush
  ...closedEyes,
  // rows 21-24: sleeping face
  ...sleepFace,
  // rows 25-37: curled body (13 rows)
  ...bodyCurled,
  // rows 38-41: paws
  ...pawsCurled,
  // rows 42-43: tail
  ...tail,
  // rows 44-47: empty
  E, E, E, E,
]

// Frame D: expanded body (breathing in), z restarting low
const sleepExpandedZLow: RLEFrame = [
  // rows 0-4: z at rows 2-4
  E, E, zLowR0, zLowR1, zLowR2,
  // rows 5-9: ears
  ...ears,
  // rows 10-16: head top
  ...headTop,
  // rows 17-20: closed eyes + blush
  ...closedEyes,
  // rows 21-24: sleeping face
  ...sleepFace,
  // rows 25-39: expanded body (15 rows)
  ...bodyExpanded,
  // rows 40-42: paws
  ...pawsExpanded,
  // rows 43-44: tail
  ...tail,
  // rows 45-47: empty
  E, E, E,
]

// ── Animation: 8 frames @ 3 fps, looping ────────────────────────────

export const sleepingAnimation: AnimationDef = {
  fps: 3,
  loop: true,
  frames: [
    sleepCurledZLow,     // 1 — curled, z near head
    sleepCurledZLow,     // 2
    sleepExpandedZMid,   // 3 — breathe in, z rises
    sleepExpandedZMid,   // 4
    sleepCurledZHigh,    // 5 — exhale, z at top
    sleepCurledZHigh,    // 6
    sleepExpandedZLow,   // 7 — breathe in, new z cycle
    sleepExpandedZLow,   // 8
  ],
}
