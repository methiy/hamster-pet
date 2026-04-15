import type { AnimationDef, RLEFrame, RLERow } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────
const E: RLERow = [[48, 0]] // empty row

/** Shift frame upward by `px` rows (remove top rows, add transparent at bottom) */
function shiftUp(frame: RLEFrame, px: number): RLEFrame {
  return [...frame.slice(px), ...Array<RLERow>(px).fill(E)]
}

// ── Base happy frame ────────────────────────────────────────────────
// Differences from idle base:
//   • ∩-shaped happy eyes (inverted-U arcs, open at bottom)
//   • Bigger blush (+1px each side → 3px wide)
//   • Arms raised outward (2px nubs on body rows 26-30)
const happyBase: RLEFrame = [
  // Row 0-4: empty
  E, E, E, E, E,

  // Row 5: ear tips
  [[10, 0], [2, 6], [4, 0], [2, 6], [6, 0], [2, 6], [4, 0], [2, 6], [16, 0]],
  // Row 6: ears outer
  [[9, 0], [1, 6], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 6], [4, 0], [1, 6], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 6], [19, 0]],
  // Row 7: ears with pink inner
  [[9, 0], [1, 6], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 6], [4, 0], [1, 6], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 6], [19, 0]],
  // Row 8: ears wider
  [[8, 0], [1, 6], [2, 5], [1, 1], [2, 0], [1, 1], [2, 5], [1, 6], [2, 0], [1, 6], [2, 5], [1, 1], [2, 0], [1, 1], [2, 5], [1, 6], [18, 0]],
  // Row 9: ears base / top of head
  [[8, 0], [1, 6], [1, 5], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 5], [1, 6], [2, 0], [1, 6], [1, 5], [1, 1], [1, 6], [2, 0], [1, 6], [1, 1], [1, 5], [1, 6], [18, 0]],

  // Row 10: head top outline
  [[9, 0], [1, 6], [2, 1], [1, 6], [2, 1], [2, 6], [2, 1], [1, 6], [2, 1], [1, 6], [25, 0]],
  // Row 11: head outline widens
  [[8, 0], [1, 6], [14, 1], [1, 6], [24, 0]],
  // Row 12: head
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  // Row 13: head
  [[6, 0], [1, 6], [18, 1], [1, 6], [22, 0]],
  // Row 14: head widens
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  // Row 15: head
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],
  // Row 16: head — above eyes
  [[5, 0], [1, 6], [20, 1], [1, 6], [21, 0]],

  // Row 17: happy eyes — ∩ arc tops (same outline bar as idle)
  [[5, 0], [1, 6], [4, 1], [3, 6], [6, 1], [3, 6], [4, 1], [1, 6], [21, 0]],
  // Row 18: happy eyes — ∩ arc sides (outline only at edges, gold centre)
  [[5, 0], [1, 6], [4, 1], [1, 6], [1, 1], [1, 6], [6, 1], [1, 6], [1, 1], [1, 6], [4, 1], [1, 6], [21, 0]],
  // Row 19: no eye bottom — bigger blush (3px each side)
  [[5, 0], [1, 6], [1, 1], [3, 5], [12, 1], [3, 5], [1, 1], [1, 6], [21, 0]],
  // Row 20: bigger blush row
  [[5, 0], [1, 6], [1, 1], [3, 5], [12, 1], [3, 5], [1, 1], [1, 6], [21, 0]],

  // Row 21: nose (same as idle)
  [[5, 0], [1, 6], [8, 1], [2, 7], [2, 1], [2, 7], [6, 1], [1, 6], [21, 0]],
  // Row 22: mouth line (same as idle)
  [[5, 0], [1, 6], [8, 1], [1, 6], [4, 1], [1, 6], [6, 1], [1, 6], [21, 0]],
  // Row 23: teeth / lower mouth (same as idle)
  [[6, 0], [1, 6], [7, 1], [1, 12], [2, 8], [1, 12], [6, 1], [1, 6], [23, 0]],
  // Row 24: chin
  [[7, 0], [1, 6], [14, 1], [2, 4], [1, 6], [23, 0]],

  // Row 25: neck/body top
  [[7, 0], [1, 6], [16, 1], [1, 6], [23, 0]],
  // Row 26: body + arm nubs (2px each side)
  [[4, 0], [1, 6], [1, 3], [1, 6], [5, 1], [8, 2], [5, 1], [1, 4], [1, 6], [1, 3], [1, 6], [19, 0]],
  // Row 27: body + arm nubs
  [[3, 0], [1, 6], [1, 3], [1, 6], [1, 3], [5, 1], [10, 2], [4, 1], [1, 4], [1, 6], [1, 3], [1, 6], [18, 0]],
  // Row 28: body widest + arm nubs
  [[3, 0], [1, 6], [1, 3], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [1, 3], [1, 6], [17, 0]],
  // Row 29: body + arm nubs
  [[3, 0], [1, 6], [1, 3], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [1, 3], [1, 6], [17, 0]],
  // Row 30: body + arm nubs (last arm row)
  [[3, 0], [1, 6], [1, 3], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [1, 3], [1, 6], [17, 0]],
  // Row 31: body (no arms)
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  // Row 32: body
  [[5, 0], [1, 6], [1, 3], [5, 1], [10, 2], [5, 1], [1, 4], [1, 6], [19, 0]],
  // Row 33: body belly narrows
  [[5, 0], [1, 6], [1, 3], [5, 1], [8, 2], [6, 1], [2, 4], [1, 6], [19, 0]],
  // Row 34: body lower
  [[6, 0], [1, 6], [5, 1], [8, 2], [5, 1], [2, 4], [1, 6], [20, 0]],
  // Row 35: body narrowing
  [[6, 0], [1, 6], [6, 1], [6, 2], [5, 1], [2, 4], [1, 6], [21, 0]],
  // Row 36: body bottom
  [[7, 0], [1, 6], [5, 1], [4, 2], [5, 1], [2, 4], [1, 6], [23, 0]],
  // Row 37: body closing
  [[7, 0], [1, 6], [5, 1], [2, 2], [5, 1], [2, 4], [1, 6], [25, 0]],
  // Row 38: body bottom outline
  [[8, 0], [1, 6], [10, 1], [2, 4], [1, 6], [26, 0]],

  // Row 39: paws top
  [[8, 0], [1, 6], [3, 3], [1, 6], [4, 0], [1, 6], [3, 3], [1, 6], [26, 0]],
  // Row 40: paws
  [[7, 0], [1, 6], [4, 3], [1, 6], [4, 0], [1, 6], [4, 3], [1, 6], [25, 0]],
  // Row 41: paws bottom
  [[7, 0], [1, 6], [4, 3], [1, 6], [4, 0], [1, 6], [4, 3], [1, 6], [25, 0]],
  // Row 42: paws outline bottom
  [[8, 0], [5, 6], [4, 0], [5, 6], [26, 0]],

  // Row 43: tail
  [[5, 0], [1, 6], [2, 3], [1, 6], [39, 0]],
  // Row 44: tail tip
  [[6, 0], [2, 6], [40, 0]],

  // Row 45-47: empty
  E, E, E,
]

// ── 10 frames @ 8fps: bounce cycle ─────────────────────────────────
// Frames 1-2  : base position
// Frames 3-4  : shifted up 2px
// Frames 5-6  : shifted up 4px  (peak of bounce)
// Frames 7-8  : shifted up 2px  (descending)
// Frames 9-10 : back to base
export const happyAnimation: AnimationDef = {
  fps: 8,
  loop: true,
  frames: [
    happyBase,              // 1 — ground
    happyBase,              // 2 — ground
    shiftUp(happyBase, 2),  // 3 — rising
    shiftUp(happyBase, 2),  // 4 — rising
    shiftUp(happyBase, 4),  // 5 — peak
    shiftUp(happyBase, 4),  // 6 — peak
    shiftUp(happyBase, 2),  // 7 — falling
    shiftUp(happyBase, 2),  // 8 — falling
    happyBase,              // 9 — ground
    happyBase,              // 10 — ground
  ],
}
