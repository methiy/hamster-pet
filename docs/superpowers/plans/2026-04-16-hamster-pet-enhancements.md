# Hamster Pet Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add functional settings (always-on-top, size), new shop items (decorations, furniture, gear), item effects (visual overlays + stat buffs), and a toast notification system to the hamster desktop pet.

**Architecture:** Four independent modules wired into existing composable/component structure. New composables (`useToast`, `useBuff`) and data files (`decorations`, `furniture`) integrate with existing `useInventory`, `useAdventure`, `useSave`. Toast system provides global feedback. Buff system reads equipped items and owned furniture to compute multipliers consumed by inventory/adventure logic.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Vite, Tauri 2.0 window APIs

**Verification:** No test framework is installed. Each task verifies via `npm run build` (runs `vue-tsc --noEmit && vite build`) which checks TypeScript types and produces a production build.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/composables/useToast.ts` | Toast state management (reactive toast queue, show/remove) |
| `src/composables/useBuff.ts` | Buff calculation from equipped decorations + owned furniture |
| `src/data/decorations.ts` | Decoration item definitions (6 items with position/buff metadata) |
| `src/data/furniture.ts` | Furniture item definitions (5 items with position/buff metadata) |
| `src/components/ToastNotification.vue` | Toast UI component (fixed top-right, stacked, animated) |
| `src/components/WardrobePanel.vue` | Decoration equip/unequip UI panel |

### Modified Files
| File | Changes |
|------|---------|
| `src/data/foods.ts` | Add `effect` field to Food interface, add 3 new foods |
| `src/data/locations.ts` | Add 3 new locations (mine, island, observatory) |
| `src/data/souvenirs.ts` | Add 9 new souvenirs for new locations |
| `src/composables/useInventory.ts` | Accept buff multiplier, add decoration/furniture purchase methods |
| `src/composables/useAdventure.ts` | Add 3 new gear flags, read buff values for rewards |
| `src/composables/useSave.ts` | Persist settings, decorations, furniture, new gear flags |
| `src/components/SettingsPanel.vue` | Wire up alwaysOnTop + size via props/emits to parent |
| `src/components/ShopWindow.vue` | Tabbed layout with 4 categories, emit new purchase events |
| `src/components/FeedMenu.vue` | Emit food effect type for special foods |
| `src/components/ContextMenu.vue` | Add "衣柜" menu item |
| `src/components/HamsterSprite.vue` | Wrap canvas in container div for overlay support |
| `src/App.vue` | Integrate all new systems: toast, buff, wardrobe, settings, new shop events |

---

### Task 1: Toast Notification System — Composable

**Files:**
- Create: `src/composables/useToast.ts`

- [ ] **Step 1: Create useToast.ts**

```typescript
// src/composables/useToast.ts
import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'reward' | 'info' | 'warning'
  icon: string
  title: string
  message?: string
  duration: number
}

let nextId = 0

const toasts = ref<Toast[]>([])

export function useToast() {
  function showToast(opts: {
    type: Toast['type']
    icon: string
    title: string
    message?: string
    duration?: number
  }) {
    const toast: Toast = {
      id: nextId++,
      type: opts.type,
      icon: opts.icon,
      title: opts.title,
      message: opts.message,
      duration: opts.duration ?? 3000,
    }
    // Max 3 visible, remove oldest if over limit
    if (toasts.value.length >= 3) {
      toasts.value.splice(0, 1)
    }
    toasts.value.push(toast)

    setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }

  function removeToast(id: number) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  return { toasts, showToast, removeToast }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds (new file is unused but should compile)

- [ ] **Step 3: Commit**

```bash
git add src/composables/useToast.ts
git commit -m "feat: add useToast composable for notification system"
```

---

### Task 2: Toast Notification System — Component

**Files:**
- Create: `src/components/ToastNotification.vue`

- [ ] **Step 1: Create ToastNotification.vue**

```vue
<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="'toast-' + toast.type"
          @click="removeToast(toast.id)"
        >
          <span class="toast-icon">{{ toast.icon }}</span>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 280px;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  pointer-events: auto;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  color: #333;
}

.toast-message {
  margin-top: 2px;
  color: #666;
  font-size: 11px;
}

/* Type backgrounds */
.toast-success {
  background: rgba(232, 245, 233, 0.95);
  border-left: 3px solid #4caf50;
}

.toast-reward {
  background: rgba(255, 248, 225, 0.95);
  border-left: 3px solid #ff9800;
}

.toast-info {
  background: rgba(227, 242, 253, 0.95);
  border-left: 3px solid #2196f3;
}

.toast-warning {
  background: rgba(255, 243, 224, 0.95);
  border-left: 3px solid #ff9800;
}

/* Transition animations */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.toast-move {
  transition: transform 0.25s ease;
}
</style>
```

- [ ] **Step 2: Mount ToastNotification in App.vue**

In `src/App.vue`, add the import and component:

After the existing imports (line 93):
```typescript
import SettingsPanel from './components/SettingsPanel.vue'
```
Add:
```typescript
import ToastNotification from './components/ToastNotification.vue'
```

In the template, add right before the closing `</div>` of `.app-container` (before line 79):
```vue
    <ToastNotification />
```

- [ ] **Step 3: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/ToastNotification.vue src/App.vue
git commit -m "feat: add ToastNotification component with slide-in animation"
```

---

### Task 3: Data Files — New Foods, Locations, Souvenirs

**Files:**
- Modify: `src/data/foods.ts`
- Modify: `src/data/locations.ts`
- Modify: `src/data/souvenirs.ts`

- [ ] **Step 1: Add effect field to Food interface and add 3 new foods**

Replace the entire `src/data/foods.ts`:

```typescript
export interface Food {
  id: string
  name: string
  emoji: string
  price: number
  effect?: 'happy' | 'special_happy'
}

export const foods: Food[] = [
  { id: 'sunflower', name: '葵花籽', emoji: '🌻', price: 5 },
  { id: 'bread', name: '面包', emoji: '🍞', price: 10 },
  { id: 'strawberry', name: '草莓', emoji: '🍓', price: 12 },
  { id: 'apple', name: '苹果', emoji: '🍎', price: 15 },
  { id: 'cheese', name: '奶酪', emoji: '🧀', price: 20 },
  { id: 'cupcake', name: '小蛋糕', emoji: '🧁', price: 25, effect: 'happy' },
  { id: 'nuts', name: '坚果拼盘', emoji: '🥜', price: 30 },
  { id: 'deluxe_meal', name: '豪华大餐', emoji: '🍱', price: 50, effect: 'special_happy' },
]
```

- [ ] **Step 2: Add 3 new locations to locations.ts**

Append to the `locations` array in `src/data/locations.ts`, before the closing `]`:

```typescript
  {
    id: 'mine',
    name: '废弃矿洞',
    emoji: '⛏️',
    description: '黑暗的矿洞中闪烁着微光',
    postcardDescription: '幽暗的矿洞深处，宝石在岩壁上闪闪发光',
    possibleSouvenirs: ['crystal_gem', 'ruby_ore', 'ancient_coin'],
    unlockCondition: 'hasTreasureMap',
  },
  {
    id: 'island',
    name: '神秘海岛',
    emoji: '🏝️',
    description: '碧蓝海水环绕的小岛',
    postcardDescription: '棕榈树下，仓鼠在沙滩上留下了小脚印',
    possibleSouvenirs: ['pearl_necklace', 'starfish_new', 'message_bottle'],
    unlockCondition: 'hasBoatTicket',
  },
  {
    id: 'observatory',
    name: '星空天文台',
    emoji: '🔭',
    description: '星光璀璨的天文台穹顶',
    postcardDescription: '巨大的望远镜对准了璀璨的银河',
    possibleSouvenirs: ['meteor_fragment', 'star_map', 'moon_rock'],
    unlockCondition: 'hasTelescope',
  },
```

- [ ] **Step 3: Add 9 new souvenirs to souvenirs.ts**

Append to the `souvenirs` array in `src/data/souvenirs.ts`, before the closing `]`:

```typescript
  // --- Mine souvenirs ---
  {
    id: 'crystal_gem',
    name: '水晶宝石',
    emoji: '💎',
    description: '矿洞深处发现的透明水晶',
    rarity: 'common',
    fromLocations: ['mine'],
  },
  {
    id: 'ruby_ore',
    name: '红宝石矿',
    emoji: '🔴',
    description: '闪耀着红色光芒的珍贵矿石',
    rarity: 'rare',
    fromLocations: ['mine'],
  },
  {
    id: 'ancient_coin',
    name: '远古金币',
    emoji: '🪙',
    description: '矿洞中发现的神秘古代钱币',
    rarity: 'legendary',
    fromLocations: ['mine'],
  },
  // --- Island souvenirs ---
  {
    id: 'pearl_necklace',
    name: '珍珠项链',
    emoji: '📿',
    description: '用海岛珍珠串成的项链',
    rarity: 'common',
    fromLocations: ['island'],
  },
  {
    id: 'starfish_new',
    name: '彩色海星',
    emoji: '🌟',
    description: '海岛浅滩发现的彩色海星',
    rarity: 'common',
    fromLocations: ['island'],
  },
  {
    id: 'message_bottle',
    name: '漂流瓶',
    emoji: '🍶',
    description: '海浪送来的装着信件的瓶子',
    rarity: 'rare',
    fromLocations: ['island'],
  },
  // --- Observatory souvenirs ---
  {
    id: 'meteor_fragment',
    name: '流星碎片',
    emoji: '☄️',
    description: '坠落的流星留下的闪亮碎片',
    rarity: 'rare',
    fromLocations: ['observatory'],
  },
  {
    id: 'star_map',
    name: '星图',
    emoji: '🌌',
    description: '记录着星座位置的古老星图',
    rarity: 'common',
    fromLocations: ['observatory'],
  },
  {
    id: 'moon_rock',
    name: '月球岩石',
    emoji: '🌑',
    description: '据说是从月球带回的神秘岩石',
    rarity: 'legendary',
    fromLocations: ['observatory'],
  },
```

- [ ] **Step 4: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/data/foods.ts src/data/locations.ts src/data/souvenirs.ts
git commit -m "feat: add new foods, locations, and souvenirs"
```

---

### Task 4: Data Files — Decorations and Furniture

**Files:**
- Create: `src/data/decorations.ts`
- Create: `src/data/furniture.ts`

- [ ] **Step 1: Create decorations.ts**

```typescript
// src/data/decorations.ts
export type DecorationSlot = 'head_top' | 'face' | 'ear' | 'neck' | 'back'

export interface BuffEffect {
  coinMultiplier?: number          // e.g. 0.2 means +20%
  adventureTimeReduction?: number  // e.g. 0.1 means -10%
  souvenirChanceBonus?: number     // e.g. 0.1 means +10%
  adventureCoinBonus?: number      // e.g. 0.3 means +30%
}

export interface Decoration {
  id: string
  name: string
  emoji: string
  price: number
  slot: DecorationSlot
  buff?: BuffEffect
}

export const decorations: Decoration[] = [
  {
    id: 'crown',
    name: '小皇冠',
    emoji: '👑',
    price: 80,
    slot: 'head_top',
    buff: { coinMultiplier: 0.2 },
  },
  {
    id: 'sunglasses',
    name: '墨镜',
    emoji: '🕶️',
    price: 60,
    slot: 'face',
    buff: { adventureTimeReduction: 0.1 },
  },
  {
    id: 'bow',
    name: '蝴蝶结',
    emoji: '🎀',
    price: 40,
    slot: 'ear',
  },
  {
    id: 'bell',
    name: '小铃铛',
    emoji: '🔔',
    price: 50,
    slot: 'neck',
    buff: { souvenirChanceBonus: 0.1 },
  },
  {
    id: 'backpack',
    name: '小背包',
    emoji: '🎒',
    price: 70,
    slot: 'back',
    buff: { adventureCoinBonus: 0.3 },
  },
  {
    id: 'wreath',
    name: '花环',
    emoji: '💐',
    price: 45,
    slot: 'head_top',
  },
]
```

- [ ] **Step 2: Create furniture.ts**

```typescript
// src/data/furniture.ts
import type { BuffEffect } from './decorations'

export type FurniturePosition = 'right' | 'left' | 'upper_right' | 'lower_left' | 'lower_right'

export interface Furniture {
  id: string
  name: string
  emoji: string
  price: number
  position: FurniturePosition
  buff?: BuffEffect
  offlineCoinCap?: number  // overrides the default 60 cap
}

export const furniture: Furniture[] = [
  {
    id: 'wheel',
    name: '仓鼠跑轮',
    emoji: '🎡',
    price: 120,
    position: 'right',
    buff: { coinMultiplier: 0.5 },
  },
  {
    id: 'nest',
    name: '温暖小窝',
    emoji: '🏠',
    price: 150,
    position: 'left',
    offlineCoinCap: 120,
  },
  {
    id: 'swing',
    name: '小秋千',
    emoji: '🪁',
    price: 80,
    position: 'upper_right',
  },
  {
    id: 'sunflower_pot',
    name: '向日葵盆栽',
    emoji: '🌻',
    price: 60,
    position: 'lower_left',
  },
  {
    id: 'treasure_chest',
    name: '宝藏箱',
    emoji: '📦',
    price: 200,
    position: 'lower_right',
    buff: { adventureCoinBonus: 0.5 },
  },
]
```

- [ ] **Step 3: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/data/decorations.ts src/data/furniture.ts
git commit -m "feat: add decoration and furniture data definitions"
```

---

### Task 5: Buff System Composable

**Files:**
- Create: `src/composables/useBuff.ts`

- [ ] **Step 1: Create useBuff.ts**

```typescript
// src/composables/useBuff.ts
import { computed, type Ref } from 'vue'
import { decorations } from '../data/decorations'
import { furniture } from '../data/furniture'

export interface BuffValues {
  coinMultiplier: number
  adventureTimeReduction: number
  souvenirChanceBonus: number
  adventureCoinBonus: number
  offlineCoinCap: number
}

export function useBuff(
  equippedDecorations: Ref<string[]>,
  ownedFurniture: Ref<string[]>
) {
  const buffValues = computed<BuffValues>(() => {
    let coinMultiplier = 1.0
    let adventureTimeReduction = 0
    let souvenirChanceBonus = 0
    let adventureCoinBonus = 0
    let offlineCoinCap = 60

    // Sum buffs from equipped decorations
    for (const decoId of equippedDecorations.value) {
      const deco = decorations.find(d => d.id === decoId)
      if (deco?.buff) {
        coinMultiplier += deco.buff.coinMultiplier ?? 0
        adventureTimeReduction += deco.buff.adventureTimeReduction ?? 0
        souvenirChanceBonus += deco.buff.souvenirChanceBonus ?? 0
        adventureCoinBonus += deco.buff.adventureCoinBonus ?? 0
      }
    }

    // Sum buffs from owned furniture
    for (const furnId of ownedFurniture.value) {
      const furn = furniture.find(f => f.id === furnId)
      if (furn?.buff) {
        coinMultiplier += furn.buff.coinMultiplier ?? 0
        adventureTimeReduction += furn.buff.adventureTimeReduction ?? 0
        souvenirChanceBonus += furn.buff.souvenirChanceBonus ?? 0
        adventureCoinBonus += furn.buff.adventureCoinBonus ?? 0
      }
      if (furn?.offlineCoinCap && furn.offlineCoinCap > offlineCoinCap) {
        offlineCoinCap = furn.offlineCoinCap
      }
    }

    return {
      coinMultiplier,
      adventureTimeReduction,
      souvenirChanceBonus,
      adventureCoinBonus,
      offlineCoinCap,
    }
  })

  return { buffValues }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/composables/useBuff.ts
git commit -m "feat: add useBuff composable for item stat calculations"
```

---

### Task 6: Update useInventory to Accept Buff Multiplier

**Files:**
- Modify: `src/composables/useInventory.ts`

- [ ] **Step 1: Rewrite useInventory.ts to support buffs, decorations, furniture**

Replace the entire file with:

```typescript
import { ref, computed } from 'vue'
import { foods, type Food } from '../data/foods'
import { decorations } from '../data/decorations'
import { furniture } from '../data/furniture'

export interface OwnedFood {
  id: string
  quantity: number
}

export function useInventory() {
  const coins = ref(50)
  const ownedFoods = ref<OwnedFood[]>([])
  const ownedDecorations = ref<string[]>([])
  const equippedDecorations = ref<string[]>([])
  const ownedFurniture = ref<string[]>([])

  function buyFood(foodId: string): boolean {
    const food = foods.find(f => f.id === foodId)
    if (!food) return false
    if (coins.value < food.price) return false

    coins.value -= food.price
    const existing = ownedFoods.value.find(f => f.id === foodId)
    if (existing) {
      existing.quantity++
    } else {
      ownedFoods.value.push({ id: foodId, quantity: 1 })
    }
    return true
  }

  function useFood(foodId: string): boolean {
    const existing = ownedFoods.value.find(f => f.id === foodId)
    if (!existing || existing.quantity <= 0) return false
    existing.quantity--
    if (existing.quantity === 0) {
      ownedFoods.value = ownedFoods.value.filter(f => f.id !== foodId)
    }
    return true
  }

  function getFoodDetails(foodId: string): Food | undefined {
    return foods.find(f => f.id === foodId)
  }

  const totalFoodCount = computed(() =>
    ownedFoods.value.reduce((sum, f) => sum + f.quantity, 0)
  )

  function buyDecoration(decoId: string): boolean {
    const deco = decorations.find(d => d.id === decoId)
    if (!deco) return false
    if (coins.value < deco.price) return false
    if (ownedDecorations.value.includes(decoId)) return false

    coins.value -= deco.price
    ownedDecorations.value.push(decoId)
    return true
  }

  function toggleEquipDecoration(decoId: string): boolean {
    if (!ownedDecorations.value.includes(decoId)) return false

    const idx = equippedDecorations.value.indexOf(decoId)
    if (idx !== -1) {
      // Unequip
      equippedDecorations.value.splice(idx, 1)
      return true
    }

    // Check slot conflict
    const deco = decorations.find(d => d.id === decoId)
    if (!deco) return false

    // Remove any equipped decoration in the same slot
    equippedDecorations.value = equippedDecorations.value.filter(eId => {
      const equipped = decorations.find(d => d.id === eId)
      return equipped?.slot !== deco.slot
    })
    equippedDecorations.value.push(decoId)
    return true
  }

  function buyFurniture(furnId: string): boolean {
    const furn = furniture.find(f => f.id === furnId)
    if (!furn) return false
    if (coins.value < furn.price) return false
    if (ownedFurniture.value.includes(furnId)) return false

    coins.value -= furn.price
    ownedFurniture.value.push(furnId)
    return true
  }

  function startCoinTimer(getCoinMultiplier?: () => number) {
    coinTimer = setInterval(() => {
      const multiplier = getCoinMultiplier?.() ?? 1
      coins.value += Math.max(1, Math.floor(multiplier))
    }, 60000)
  }

  function stopCoinTimer() {
    if (coinTimer) {
      clearInterval(coinTimer)
      coinTimer = null
    }
  }

  return {
    coins,
    ownedFoods,
    ownedDecorations,
    equippedDecorations,
    ownedFurniture,
    totalFoodCount,
    buyFood,
    useFood,
    getFoodDetails,
    buyDecoration,
    toggleEquipDecoration,
    buyFurniture,
    startCoinTimer,
    stopCoinTimer,
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: May fail if App.vue doesn't pass the new argument yet — that's expected at this step since `coinMultiplier` is optional. Should compile.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useInventory.ts
git commit -m "feat: extend useInventory with decorations, furniture, and buff support"
```

---

### Task 7: Update useAdventure to Support New Gear and Buffs

**Files:**
- Modify: `src/composables/useAdventure.ts`

- [ ] **Step 1: Rewrite useAdventure.ts with new gear flags and buff parameters**

Replace the entire file with:

```typescript
import { ref, computed } from 'vue'
import { locations, type Location } from '../data/locations'
import { souvenirs, type Souvenir } from '../data/souvenirs'

export interface AdventureState {
  isOnAdventure: boolean
  locationId: string | null
  endTime: number | null
}

export interface AdventureBuffs {
  adventureTimeReduction: number
  souvenirChanceBonus: number
  adventureCoinBonus: number
}

export function useAdventure() {
  const isOnAdventure = ref(false)
  const adventureLocation = ref<Location | null>(null)
  const adventureEndTime = ref<number | null>(null)
  const collectedPostcards = ref<Set<string>>(new Set())
  const collectedSouvenirs = ref<string[]>([])

  // Special items (boolean flags)
  const hasTent = ref(false)
  const hasScarf = ref(false)
  const hasTreasureMap = ref(false)
  const hasBoatTicket = ref(false)
  const hasTelescope = ref(false)

  const availableLocations = computed(() => {
    return locations.filter(loc => {
      if (!loc.unlockCondition) return true
      if (loc.unlockCondition === 'hasTent') return hasTent.value
      if (loc.unlockCondition === 'hasScarf') return hasScarf.value
      if (loc.unlockCondition === 'hasTreasureMap') return hasTreasureMap.value
      if (loc.unlockCondition === 'hasBoatTicket') return hasBoatTicket.value
      if (loc.unlockCondition === 'hasTelescope') return hasTelescope.value
      return false
    })
  })

  function startAdventure(buffs?: AdventureBuffs) {
    if (isOnAdventure.value) return null
    if (availableLocations.value.length === 0) return null

    const loc = availableLocations.value[Math.floor(Math.random() * availableLocations.value.length)]
    adventureLocation.value = loc
    // 30-120 seconds for testing
    let duration = Math.floor(Math.random() * 90 + 30) * 1000
    // Apply time reduction buff
    if (buffs?.adventureTimeReduction) {
      duration = Math.floor(duration * (1 - buffs.adventureTimeReduction))
    }
    adventureEndTime.value = Date.now() + duration
    isOnAdventure.value = true
    return loc
  }

  function checkAdventureReturn(buffs?: AdventureBuffs): { postcard: boolean; souvenir: Souvenir | null; coins: number } | null {
    if (!isOnAdventure.value || !adventureEndTime.value) return null
    if (Date.now() < adventureEndTime.value) return null

    const loc = adventureLocation.value!
    let coinReward = Math.floor(Math.random() * 15) + 5
    // Apply coin bonus buff
    if (buffs?.adventureCoinBonus) {
      coinReward = Math.floor(coinReward * (1 + buffs.adventureCoinBonus))
    }

    const rewards: { postcard: boolean; souvenir: Souvenir | null; coins: number } = {
      postcard: false,
      souvenir: null,
      coins: coinReward,
    }

    // 50% chance to get a new postcard (if not already collected)
    if (!collectedPostcards.value.has(loc.id) && Math.random() < 0.5) {
      collectedPostcards.value.add(loc.id)
      rewards.postcard = true
    }

    // Pick a souvenir from possible ones
    const souvenirBaseChance = 0.7 + (buffs?.souvenirChanceBonus ?? 0)
    if (loc.possibleSouvenirs.length > 0 && Math.random() < souvenirBaseChance) {
      const souvenirId = loc.possibleSouvenirs[Math.floor(Math.random() * loc.possibleSouvenirs.length)]
      const souvenirData = souvenirs.find(s => s.id === souvenirId)
      if (souvenirData) {
        let keep = true
        if (souvenirData.rarity === 'rare' && Math.random() > 0.4) keep = false
        if (souvenirData.rarity === 'legendary' && Math.random() > 0.15) keep = false
        if (keep) {
          collectedSouvenirs.value.push(souvenirId)
          rewards.souvenir = souvenirData
        }
      }
    }

    // Reset adventure state
    isOnAdventure.value = false
    adventureLocation.value = null
    adventureEndTime.value = null

    return rewards
  }

  function getAdventureData() {
    return {
      isOnAdventure: isOnAdventure.value,
      locationId: adventureLocation.value?.id ?? null,
      endTime: adventureEndTime.value,
      collectedPostcards: Array.from(collectedPostcards.value),
      collectedSouvenirs: collectedSouvenirs.value,
      hasTent: hasTent.value,
      hasScarf: hasScarf.value,
      hasTreasureMap: hasTreasureMap.value,
      hasBoatTicket: hasBoatTicket.value,
      hasTelescope: hasTelescope.value,
    }
  }

  function loadAdventureData(data: any) {
    if (!data) return
    collectedPostcards.value = new Set(data.collectedPostcards ?? [])
    collectedSouvenirs.value = data.collectedSouvenirs ?? []
    hasTent.value = data.hasTent ?? false
    hasScarf.value = data.hasScarf ?? false
    hasTreasureMap.value = data.hasTreasureMap ?? false
    hasBoatTicket.value = data.hasBoatTicket ?? false
    hasTelescope.value = data.hasTelescope ?? false

    // Restore ongoing adventure
    if (data.isOnAdventure && data.endTime) {
      isOnAdventure.value = true
      adventureEndTime.value = data.endTime
      adventureLocation.value = locations.find(l => l.id === data.locationId) ?? null
    }
  }

  return {
    isOnAdventure,
    adventureLocation,
    adventureEndTime,
    collectedPostcards,
    collectedSouvenirs,
    hasTent,
    hasScarf,
    hasTreasureMap,
    hasBoatTicket,
    hasTelescope,
    availableLocations,
    startAdventure,
    checkAdventureReturn,
    getAdventureData,
    loadAdventureData,
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds (startAdventure/checkAdventureReturn buffs param is optional)

- [ ] **Step 3: Commit**

```bash
git add src/composables/useAdventure.ts
git commit -m "feat: extend useAdventure with new gear flags and buff parameters"
```

---

### Task 8: Update useSave to Persist All New State

**Files:**
- Modify: `src/composables/useSave.ts`

- [ ] **Step 1: Rewrite useSave.ts to handle settings, decorations, furniture**

Replace the entire file with:

```typescript
import type { OwnedFood } from './useInventory'
import type { Ref } from 'vue'

export interface SettingsData {
  alwaysOnTop: boolean
  size: 'small' | 'medium' | 'large'
}

interface SaveData {
  coins: number
  ownedFoods: OwnedFood[]
  lastSave: number
  settings?: SettingsData
  ownedDecorations?: string[]
  equippedDecorations?: string[]
  ownedFurniture?: string[]
  adventure?: {
    isOnAdventure: boolean
    locationId: string | null
    endTime: number | null
    collectedPostcards: string[]
    collectedSouvenirs: string[]
    hasTent: boolean
    hasScarf: boolean
    hasTreasureMap: boolean
    hasBoatTicket: boolean
    hasTelescope: boolean
  }
}

const SAVE_KEY = 'hamster-pet-save'

export function useSave(
  coins: Ref<number>,
  ownedFoods: Ref<OwnedFood[]>,
  adventureFns?: {
    getAdventureData: () => any
    loadAdventureData: (data: any) => void
  },
  extras?: {
    ownedDecorations: Ref<string[]>
    equippedDecorations: Ref<string[]>
    ownedFurniture: Ref<string[]>
    settings: Ref<SettingsData>
    offlineCoinCap: Ref<number>
  }
) {
  let saveTimer: ReturnType<typeof setInterval> | null = null

  function save() {
    const data: SaveData = {
      coins: coins.value,
      ownedFoods: ownedFoods.value,
      lastSave: Date.now(),
    }
    if (adventureFns) {
      data.adventure = adventureFns.getAdventureData()
    }
    if (extras) {
      data.settings = extras.settings.value
      data.ownedDecorations = extras.ownedDecorations.value
      data.equippedDecorations = extras.equippedDecorations.value
      data.ownedFurniture = extras.ownedFurniture.value
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // localStorage might not be available
    }
  }

  function load(): { offlineMinutes: number; offlineCoins: number } {
    let offlineMinutes = 0
    let offlineCoins = 0
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return { offlineMinutes, offlineCoins }
      const data: SaveData = JSON.parse(raw)

      coins.value = data.coins ?? 50
      ownedFoods.value = data.ownedFoods ?? []

      // Restore extras before calculating offline coins (need furniture for cap)
      if (extras) {
        extras.ownedDecorations.value = data.ownedDecorations ?? []
        extras.equippedDecorations.value = data.equippedDecorations ?? []
        extras.ownedFurniture.value = data.ownedFurniture ?? []
        if (data.settings) {
          extras.settings.value = data.settings
        }
      }

      // Grant offline coins (1 per minute away)
      if (data.lastSave) {
        offlineMinutes = Math.floor((Date.now() - data.lastSave) / 60000)
        const cap = extras?.offlineCoinCap.value ?? 60
        offlineCoins = Math.min(offlineMinutes, cap)
        coins.value += offlineCoins
      }

      if (adventureFns && data.adventure) {
        adventureFns.loadAdventureData(data.adventure)
      }
    } catch {
      // corrupted save, ignore
    }
    return { offlineMinutes, offlineCoins }
  }

  function startAutoSave() {
    saveTimer = setInterval(save, 30000)
  }

  function stopAutoSave() {
    if (saveTimer) {
      clearInterval(saveTimer)
      saveTimer = null
    }
  }

  return {
    save,
    load,
    startAutoSave,
    stopAutoSave,
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build may have issues due to App.vue not yet passing extras — but the `extras` param is optional so should compile. Verify.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSave.ts
git commit -m "feat: extend useSave with settings, decorations, and furniture persistence"
```

---

### Task 9: Settings Panel — Wire Up to Tauri APIs

**Files:**
- Modify: `src/components/SettingsPanel.vue`

- [ ] **Step 1: Rewrite SettingsPanel.vue to use props/emits instead of local state**

Replace the entire file with:

```vue
<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="settings-panel" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="settings-title">⚙️ 设置</h2>

        <div class="setting-row">
          <span class="setting-label">🔊 音效</span>
          <label class="toggle">
            <input type="checkbox" :checked="true" disabled />
            <span class="toggle-slider toggle-disabled"></span>
          </label>
        </div>

        <div class="setting-row">
          <span class="setting-label">🎯 置顶显示</span>
          <label class="toggle">
            <input type="checkbox" :checked="alwaysOnTop" @change="emit('update:alwaysOnTop', !alwaysOnTop)" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <span class="setting-label">📐 大小</span>
          <div class="size-selector">
            <button
              v-for="opt in sizeOptions"
              :key="opt.value"
              class="size-btn"
              :class="{ active: size === opt.value }"
              @click="emit('update:size', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="about-section">
          <div class="about-text">仓鼠宠物 v0.3.0</div>
          <div class="about-heart">❤️</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  alwaysOnTop: boolean
  size: string
}>()

const emit = defineEmits<{
  close: []
  'update:alwaysOnTop': [value: boolean]
  'update:size': [value: string]
}>()

const sizeOptions = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.settings-panel {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 320px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 13px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
}

.settings-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(92, 64, 51, 0.1);
}

.setting-label {
  font-weight: 600;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #ccc;
  border-radius: 22px;
  transition: background 0.2s;
}

.toggle-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle input:checked + .toggle-slider {
  background: #F2A65A;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.size-selector {
  display: flex;
  gap: 4px;
}

.size-btn {
  padding: 4px 12px;
  border: 1px solid rgba(92, 64, 51, 0.2);
  border-radius: 6px;
  background: white;
  color: #5C4033;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.size-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.size-btn:hover:not(.active) {
  background: rgba(242, 166, 90, 0.1);
}

.about-section {
  margin-top: 20px;
  text-align: center;
  padding: 12px;
  background: rgba(92, 64, 51, 0.05);
  border-radius: 8px;
}

.about-text {
  font-size: 13px;
  font-weight: 600;
  color: #5C4033;
}

.about-heart {
  font-size: 18px;
  margin-top: 4px;
}
</style>
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: May warn about App.vue not passing new props — will be fixed in final integration task.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsPanel.vue
git commit -m "feat: wire SettingsPanel to use props/emits for alwaysOnTop and size"
```

---

### Task 10: Shop Window — Tabbed Layout with All Categories

**Files:**
- Modify: `src/components/ShopWindow.vue`

- [ ] **Step 1: Rewrite ShopWindow.vue with tabbed layout**

Replace the entire file with:

```vue
<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="shop-window" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="shop-title">🏪 商店</h2>
        <div class="coins-display">🪙 {{ coins }} 金币</div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.icon }} {{ tab.label }}
          </button>
        </div>

        <!-- Food tab -->
        <div v-if="activeTab === 'food'" class="items-grid">
          <div v-for="food in foods" :key="food.id" class="item-card">
            <span class="item-emoji">{{ food.emoji }}</span>
            <span class="item-name">{{ food.name }}</span>
            <span class="item-price">🪙 {{ food.price }}</span>
            <div v-if="food.effect" class="item-effect">
              {{ food.effect === 'happy' ? '😊 开心' : '✨ 超开心' }}
            </div>
            <button
              class="buy-btn"
              :disabled="coins < food.price"
              @click="emit('buyFood', food.id)"
            >
              购买
            </button>
          </div>
        </div>

        <!-- Decoration tab -->
        <div v-if="activeTab === 'decoration'" class="items-grid">
          <div v-for="deco in decorations" :key="deco.id" class="item-card">
            <span class="item-emoji">{{ deco.emoji }}</span>
            <span class="item-name">{{ deco.name }}</span>
            <span class="item-price">🪙 {{ deco.price }}</span>
            <div v-if="deco.buff" class="item-effect">{{ getBuffText(deco.buff) }}</div>
            <button
              v-if="!ownedDecorations.includes(deco.id)"
              class="buy-btn"
              :disabled="coins < deco.price"
              @click="emit('buyDecoration', deco.id)"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
        </div>

        <!-- Furniture tab -->
        <div v-if="activeTab === 'furniture'" class="items-grid">
          <div v-for="furn in furnitureItems" :key="furn.id" class="item-card">
            <span class="item-emoji">{{ furn.emoji }}</span>
            <span class="item-name">{{ furn.name }}</span>
            <span class="item-price">🪙 {{ furn.price }}</span>
            <div v-if="furn.buff || furn.offlineCoinCap" class="item-effect">
              {{ getFurnitureBuffText(furn) }}
            </div>
            <button
              v-if="!ownedFurniture.includes(furn.id)"
              class="buy-btn"
              :disabled="coins < furn.price"
              @click="emit('buyFurniture', furn.id)"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
        </div>

        <!-- Gear tab -->
        <div v-if="activeTab === 'gear'" class="items-grid">
          <div v-for="gear in gearItems" :key="gear.id" class="item-card">
            <span class="item-emoji">{{ gear.emoji }}</span>
            <span class="item-name">{{ gear.name }}</span>
            <span class="item-price">🪙 {{ gear.price }}</span>
            <div class="item-effect">🔓 {{ gear.unlocks }}</div>
            <button
              v-if="!gear.owned"
              class="buy-btn"
              :disabled="coins < gear.price"
              @click="emit('buyGear', gear.id)"
            >
              购买
            </button>
            <span v-else class="owned-badge">已拥有 ✓</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { foods } from '../data/foods'
import { decorations } from '../data/decorations'
import { furniture } from '../data/furniture'
import type { BuffEffect } from '../data/decorations'
import type { Furniture } from '../data/furniture'

const props = defineProps<{
  coins: number
  hasTent: boolean
  hasScarf: boolean
  hasTreasureMap: boolean
  hasBoatTicket: boolean
  hasTelescope: boolean
  ownedDecorations: string[]
  ownedFurniture: string[]
}>()

const emit = defineEmits<{
  close: []
  buyFood: [foodId: string]
  buyDecoration: [decoId: string]
  buyFurniture: [furnId: string]
  buyGear: [gearId: string]
}>()

const activeTab = ref<'food' | 'decoration' | 'furniture' | 'gear'>('food')

const tabs = [
  { key: 'food' as const, icon: '🍽️', label: '食物' },
  { key: 'decoration' as const, icon: '👒', label: '装饰' },
  { key: 'furniture' as const, icon: '🏠', label: '家具' },
  { key: 'gear' as const, icon: '🎒', label: '装备' },
]

const furnitureItems = furniture

const gearItems = computed(() => [
  { id: 'tent', emoji: '⛺', name: '帐篷', price: 100, unlocks: '森林', owned: props.hasTent },
  { id: 'scarf', emoji: '🧣', name: '围巾', price: 100, unlocks: '雪山', owned: props.hasScarf },
  { id: 'treasure_map', emoji: '🗺️', name: '藏宝图', price: 150, unlocks: '废弃矿洞', owned: props.hasTreasureMap },
  { id: 'boat_ticket', emoji: '🎫', name: '船票', price: 180, unlocks: '神秘海岛', owned: props.hasBoatTicket },
  { id: 'telescope', emoji: '🔭', name: '望远镜', price: 200, unlocks: '星空天文台', owned: props.hasTelescope },
])

function getBuffText(buff: BuffEffect): string {
  if (buff.coinMultiplier) return `💰 金币 +${buff.coinMultiplier * 100}%`
  if (buff.adventureTimeReduction) return `⏱️ 冒险时间 -${buff.adventureTimeReduction * 100}%`
  if (buff.souvenirChanceBonus) return `🎁 纪念品 +${buff.souvenirChanceBonus * 100}%`
  if (buff.adventureCoinBonus) return `💰 冒险金币 +${buff.adventureCoinBonus * 100}%`
  return ''
}

function getFurnitureBuffText(furn: Furniture): string {
  if (furn.buff?.coinMultiplier) return `💰 金币 +${furn.buff.coinMultiplier * 100}%`
  if (furn.buff?.adventureCoinBonus) return `💰 冒险金币 +${furn.buff.adventureCoinBonus * 100}%`
  if (furn.offlineCoinCap) return `💤 离线上限 ${furn.offlineCoinCap}`
  return ''
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.shop-window {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 380px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 12px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
}

.shop-title {
  text-align: center;
  margin: 0 0 8px;
  font-size: 20px;
}

.coins-display {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #F2A65A;
  margin-bottom: 12px;
  padding: 6px 12px;
  background: rgba(242, 166, 90, 0.12);
  border-radius: 8px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.tab-btn {
  flex: 1;
  padding: 6px 4px;
  border: 1px solid rgba(92, 64, 51, 0.15);
  border-radius: 8px;
  background: white;
  color: #5C4033;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.tab-btn.active {
  background: #F2A65A;
  color: white;
  border-color: #F2A65A;
}

.tab-btn:hover:not(.active) {
  background: rgba(242, 166, 90, 0.1);
}

.items-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.item-card {
  background: white;
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(92, 64, 51, 0.1);
}

.item-emoji {
  font-size: 28px;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
}

.item-price {
  font-size: 12px;
  color: #F2A65A;
}

.item-effect {
  font-size: 10px;
  color: #6ab04c;
  text-align: center;
}

.buy-btn {
  margin-top: 4px;
  padding: 4px 16px;
  border: none;
  border-radius: 6px;
  background: #F2A65A;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.buy-btn:hover:not(:disabled) {
  background: #e0943f;
}

.buy-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.owned-badge {
  margin-top: 4px;
  font-size: 12px;
  color: #6ab04c;
  font-weight: 600;
}
</style>
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ShopWindow.vue
git commit -m "feat: redesign ShopWindow with tabbed layout and all item categories"
```

---

### Task 11: Context Menu — Add Wardrobe Entry

**Files:**
- Modify: `src/components/ContextMenu.vue`

- [ ] **Step 1: Add wardrobe menu item to ContextMenu.vue**

In the template, add a new menu item after the souvenir line (after `<div class="menu-item" @click="emit('souvenir')">🎁 纪念品</div>`):

```vue
        <div class="menu-item" @click="emit('wardrobe')">👗 衣柜</div>
```

In the emits, add `wardrobe`:

```typescript
const emit = defineEmits<{
  feed: []
  shop: []
  postcard: []
  souvenir: []
  wardrobe: []
  settings: []
  quit: []
  close: []
}>()
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ContextMenu.vue
git commit -m "feat: add wardrobe entry to context menu"
```

---

### Task 12: Wardrobe Panel Component

**Files:**
- Create: `src/components/WardrobePanel.vue`

- [ ] **Step 1: Create WardrobePanel.vue**

```vue
<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="wardrobe-panel" @click.stop>
        <button class="close-btn" @click="emit('close')">✕</button>
        <h2 class="wardrobe-title">👗 衣柜</h2>

        <div v-if="ownedItems.length === 0" class="empty-msg">
          还没有装饰品，去商店买一些吧！
        </div>

        <div v-else class="items-grid">
          <div
            v-for="item in ownedItems"
            :key="item.id"
            class="item-card"
            :class="{ equipped: item.equipped }"
            @click="emit('toggleEquip', item.id)"
          >
            <span class="item-emoji">{{ item.emoji }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-slot">{{ slotLabels[item.slot] }}</span>
            <span v-if="item.equipped" class="equip-badge">穿戴中</span>
            <span v-else class="equip-hint">点击穿戴</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { decorations, type DecorationSlot } from '../data/decorations'

const props = defineProps<{
  ownedDecorations: string[]
  equippedDecorations: string[]
}>()

const emit = defineEmits<{
  close: []
  toggleEquip: [decoId: string]
}>()

const slotLabels: Record<DecorationSlot, string> = {
  head_top: '👆 头顶',
  face: '👓 面部',
  ear: '👂 耳朵',
  neck: '📿 脖子',
  back: '🎒 背部',
}

const ownedItems = computed(() => {
  return props.ownedDecorations.map(id => {
    const deco = decorations.find(d => d.id === id)
    return {
      id,
      name: deco?.name ?? id,
      emoji: deco?.emoji ?? '❓',
      slot: deco?.slot ?? ('head_top' as DecorationSlot),
      equipped: props.equippedDecorations.includes(id),
    }
  })
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 5000;
  padding: 10px;
  overflow-y: auto;
}

.wardrobe-panel {
  background: #FFF8F0;
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 320px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(92, 64, 51, 0.25);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #5C4033;
  font-size: 12px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #5C4033;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(92, 64, 51, 0.1);
}

.wardrobe-title {
  text-align: center;
  margin: 0 0 16px;
  font-size: 20px;
}

.empty-msg {
  text-align: center;
  font-size: 13px;
  color: #999;
  padding: 20px 0;
}

.items-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.item-card {
  background: white;
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(92, 64, 51, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.item-card:hover {
  background: rgba(242, 166, 90, 0.08);
}

.item-card.equipped {
  border-color: #F2A65A;
  background: rgba(242, 166, 90, 0.08);
}

.item-emoji {
  font-size: 28px;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
}

.item-slot {
  font-size: 10px;
  color: #999;
}

.equip-badge {
  font-size: 11px;
  color: #F2A65A;
  font-weight: 600;
}

.equip-hint {
  font-size: 10px;
  color: #ccc;
}
</style>
```

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/WardrobePanel.vue
git commit -m "feat: add WardrobePanel for managing decoration equipment"
```

---

### Task 13: App.vue — Full Integration

**Files:**
- Modify: `src/App.vue`

This is the largest task — it wires together all new systems.

- [ ] **Step 1: Rewrite App.vue with all integrations**

Replace the entire file with:

```vue
<template>
  <div
    class="app-container"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onRightClick"
    @dblclick="onDoubleClick"
  >
    <!-- Hamster sits at bottom center of a larger transparent window -->
    <div class="hamster-area" :style="hamsterScaleStyle">
      <SpeechBubble
        :text="speechText"
        :visible="speechVisible"
        @hide="speechVisible = false"
      />

      <!-- Decoration overlays -->
      <div class="decoration-layer">
        <span
          v-for="deco in visibleDecorations"
          :key="deco.id"
          class="decoration-emoji"
          :style="deco.style"
        >
          {{ deco.emoji }}
        </span>
      </div>

      <!-- Furniture around hamster -->
      <span
        v-for="furn in visibleFurniture"
        :key="furn.id"
        class="furniture-emoji"
        :style="furn.style"
      >
        {{ furn.emoji }}
      </span>

      <HamsterSprite
        :state="displayState"
        @region-click="onRegionClick"
        @region-hover="onRegionHover"
        @miss-click="onMissClick"
      />
    </div>

    <ContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      @feed="onFeed"
      @shop="onShop"
      @postcard="onPostcard"
      @souvenir="onSouvenir"
      @wardrobe="onWardrobe"
      @settings="onSettings"
      @quit="onQuit"
      @close="closeMenu"
    />

    <!-- Status note when on adventure -->
    <StatusNote
      v-if="isOnAdventure && adventureLocation && adventureEndTime"
      :location-emoji="adventureLocation.emoji"
      :location-name="adventureLocation.name"
      :end-time="adventureEndTime"
    />

    <!-- Popups -->
    <ShopWindow
      v-if="showShop"
      :coins="coins"
      :has-tent="hasTent"
      :has-scarf="hasScarf"
      :has-treasure-map="hasTreasureMap"
      :has-boat-ticket="hasBoatTicket"
      :has-telescope="hasTelescope"
      :owned-decorations="ownedDecorations"
      :owned-furniture="ownedFurniture"
      @close="showShop = false"
      @buy-food="onBuyFood"
      @buy-decoration="onBuyDecoration"
      @buy-furniture="onBuyFurniture"
      @buy-gear="onBuyGear"
    />

    <FeedMenu
      v-if="showFeed"
      :owned-foods="ownedFoods"
      @close="showFeed = false"
      @feed="onFeedItem"
    />

    <PostcardGallery
      v-if="showPostcards"
      :collected-postcards="collectedPostcards"
      @close="showPostcards = false"
    />

    <SouvenirShelf
      v-if="showSouvenirs"
      :collected-souvenirs="collectedSouvenirs"
      @close="showSouvenirs = false"
    />

    <WardrobePanel
      v-if="showWardrobe"
      :owned-decorations="ownedDecorations"
      :equipped-decorations="equippedDecorations"
      @close="showWardrobe = false"
      @toggle-equip="onToggleEquip"
    />

    <SettingsPanel
      v-if="showSettings"
      :always-on-top="settings.alwaysOnTop"
      :size="settings.size"
      @close="showSettings = false"
      @update:always-on-top="onToggleAlwaysOnTop"
      @update:size="onChangeSize"
    />

    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import HamsterSprite from './components/HamsterSprite.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import ContextMenu from './components/ContextMenu.vue'
import StatusNote from './components/StatusNote.vue'
import ShopWindow from './components/ShopWindow.vue'
import FeedMenu from './components/FeedMenu.vue'
import PostcardGallery from './components/PostcardGallery.vue'
import SouvenirShelf from './components/SouvenirShelf.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ToastNotification from './components/ToastNotification.vue'
import WardrobePanel from './components/WardrobePanel.vue'
import { useHamster } from './composables/useHamster'
import { useInventory } from './composables/useInventory'
import { useAdventure } from './composables/useAdventure'
import { useSave, type SettingsData } from './composables/useSave'
import { useBuff } from './composables/useBuff'
import { useToast } from './composables/useToast'
import { CLICK_PHRASES, HOVER_PHRASES, REACTION_MAP } from './data/hamsterPhrases'
import type { BodyRegion } from './data/hamsterPhrases'
import { decorations } from './data/decorations'
import { furniture } from './data/furniture'
import { foods } from './data/foods'

// --- Settings ---
const settings = ref<SettingsData>({
  alwaysOnTop: false,
  size: 'medium',
})

// --- Core composables ---
const { currentState, displayState, triggerHappy, feedHamster, setState, triggerReaction } = useHamster()
const { showToast } = useToast()

// Inventory needs buff multiplier — create inventory first, then buff, then wire
const {
  coins,
  ownedFoods,
  ownedDecorations,
  equippedDecorations,
  ownedFurniture,
  buyFood,
  useFood,
  getFoodDetails,
  buyDecoration,
  toggleEquipDecoration,
  buyFurniture,
  startCoinTimer,
  stopCoinTimer,
} = useInventory()

// Buff system
const { buffValues } = useBuff(equippedDecorations, ownedFurniture)

const {
  isOnAdventure,
  adventureLocation,
  adventureEndTime,
  collectedPostcards,
  collectedSouvenirs,
  hasTent,
  hasScarf,
  hasTreasureMap,
  hasBoatTicket,
  hasTelescope,
  startAdventure,
  checkAdventureReturn,
  getAdventureData,
  loadAdventureData,
} = useAdventure()

const offlineCoinCap = computed(() => buffValues.value.offlineCoinCap)

const { save, load, startAutoSave, stopAutoSave } = useSave(coins, ownedFoods, {
  getAdventureData,
  loadAdventureData,
}, {
  ownedDecorations,
  equippedDecorations,
  ownedFurniture,
  settings,
  offlineCoinCap,
})

// --- Context menu ---
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

// --- Popup states ---
const showShop = ref(false)
const showFeed = ref(false)
const showPostcards = ref(false)
const showSouvenirs = ref(false)
const showSettings = ref(false)
const showWardrobe = ref(false)

// --- Speech bubble ---
const speechText = ref('')
const speechVisible = ref(false)

// --- Hover cooldown ---
let lastHoverSpeechTime = 0

// --- Any popup open ---
const anyPopupOpen = computed(() =>
  showShop.value || showFeed.value || showPostcards.value ||
  showSouvenirs.value || showSettings.value || showWardrobe.value
)

// --- Click debounce ---
let clickTimer: ReturnType<typeof setTimeout> | null = null
let pendingRegion: BodyRegion | null = null

// --- Scale style ---
const sizeScaleMap: Record<string, number> = {
  small: 0.67,
  medium: 1.0,
  large: 1.33,
}

const hamsterScaleStyle = computed(() => {
  const scale = sizeScaleMap[settings.value.size] ?? 1.0
  if (scale === 1.0) return {}
  return { transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'bottom center' }
})

// --- Visible decorations ---
const decoPositionStyles: Record<string, Record<string, string>> = {
  head_top: { position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', fontSize: '16px', pointerEvents: 'none', zIndex: '10' },
  face: { position: 'absolute', top: '35px', left: '50%', transform: 'translateX(-50%)', fontSize: '14px', pointerEvents: 'none', zIndex: '10' },
  ear: { position: 'absolute', top: '8px', right: '18px', fontSize: '12px', pointerEvents: 'none', zIndex: '10' },
  neck: { position: 'absolute', top: '55px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', pointerEvents: 'none', zIndex: '10' },
  back: { position: 'absolute', top: '40px', right: '10px', fontSize: '14px', pointerEvents: 'none', zIndex: '10' },
}

const visibleDecorations = computed(() => {
  return equippedDecorations.value.map(id => {
    const deco = decorations.find(d => d.id === id)
    return {
      id,
      emoji: deco?.emoji ?? '❓',
      style: decoPositionStyles[deco?.slot ?? 'head_top'] ?? {},
    }
  })
})

// --- Visible furniture ---
const furnPositionStyles: Record<string, Record<string, string>> = {
  right: { position: 'absolute', right: '-30px', bottom: '0', fontSize: '22px', pointerEvents: 'none' },
  left: { position: 'absolute', left: '-30px', bottom: '0', fontSize: '22px', pointerEvents: 'none' },
  upper_right: { position: 'absolute', right: '-25px', top: '-10px', fontSize: '20px', pointerEvents: 'none' },
  lower_left: { position: 'absolute', left: '-25px', bottom: '-5px', fontSize: '18px', pointerEvents: 'none' },
  lower_right: { position: 'absolute', right: '-25px', bottom: '-5px', fontSize: '20px', pointerEvents: 'none' },
}

const visibleFurniture = computed(() => {
  return ownedFurniture.value.map(id => {
    const furn = furniture.find(f => f.id === id)
    return {
      id,
      emoji: furn?.emoji ?? '❓',
      style: furnPositionStyles[furn?.position ?? 'right'] ?? {},
    }
  })
})

// --- Drag ---
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (menuVisible.value || anyPopupOpen.value) return
  try { getCurrentWindow().startDragging() } catch { /* Not in Tauri */ }
}

function onMissClick(_e: MouseEvent) {
  if (menuVisible.value || anyPopupOpen.value) return
  try { getCurrentWindow().startDragging() } catch { /* Not in Tauri */ }
}

function onRightClick(e: MouseEvent) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

function closeMenu() {
  menuVisible.value = false
}

function onDoubleClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    pendingRegion = null
  }
  closeMenu()
  triggerHappy()
}

// --- Interaction ---
function onRegionClick(region: BodyRegion) {
  pendingRegion = region
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    if (pendingRegion) {
      handleRegionClick(pendingRegion)
      pendingRegion = null
    }
    clickTimer = null
  }, 250)
}

function handleRegionClick(region: BodyRegion) {
  const phrases = CLICK_PHRASES[region]
  speechText.value = phrases[Math.floor(Math.random() * phrases.length)]
  speechVisible.value = true
  const reaction = REACTION_MAP[region]
  triggerReaction(reaction.state, reaction.duration)
}

function onRegionHover(region: BodyRegion | null) {
  if (!region) return
  const now = Date.now()
  if (now - lastHoverSpeechTime < 5000) return
  if (Math.random() > 0.3) return
  lastHoverSpeechTime = now
  speechText.value = HOVER_PHRASES[Math.floor(Math.random() * HOVER_PHRASES.length)]
  speechVisible.value = true
}

// --- Menu actions ---
function onFeed() {
  closeMenu()
  showFeed.value = true
}

function onFeedItem(foodId: string) {
  if (useFood(foodId)) {
    const food = getFoodDetails(foodId)
    feedHamster()

    // Special food effects
    if (food?.effect === 'happy') {
      setTimeout(() => triggerHappy(), 3000)
      showToast({ type: 'success', icon: '🎉', title: `仓鼠吃了 ${food.emoji} ${food.name}`, message: '好好吃的蛋糕！😊' })
    } else if (food?.effect === 'special_happy') {
      setTimeout(() => { triggerHappy() }, 3000)
      showToast({ type: 'success', icon: '✨', title: `仓鼠吃了 ${food.emoji} ${food.name}`, message: '这是什么神仙美食！太幸福了！' })
    } else {
      showToast({ type: 'success', icon: '🎉', title: `仓鼠吃了 ${food?.emoji ?? '🍽️'} ${food?.name ?? foodId}`, message: '看起来很满足~' })
    }
  }
  showFeed.value = false
}

function onShop() {
  closeMenu()
  showShop.value = true
}

function onBuyFood(foodId: string) {
  const food = foods.find(f => f.id === foodId)
  if (!food) return
  if (coins.value < food.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${food.price - coins.value} 金币` })
    return
  }
  if (buyFood(foodId)) {
    showToast({ type: 'success', icon: '🎉', title: `成功购买 ${food.emoji} ${food.name} ×1` })
  }
}

function onBuyDecoration(decoId: string) {
  const deco = decorations.find(d => d.id === decoId)
  if (!deco) return
  if (coins.value < deco.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${deco.price - coins.value} 金币` })
    return
  }
  if (buyDecoration(decoId)) {
    const buffText = deco.buff
      ? (deco.buff.coinMultiplier ? `金币收入 +${deco.buff.coinMultiplier * 100}%` :
         deco.buff.adventureTimeReduction ? `冒险时间 -${deco.buff.adventureTimeReduction * 100}%` :
         deco.buff.souvenirChanceBonus ? `纪念品概率 +${deco.buff.souvenirChanceBonus * 100}%` :
         deco.buff.adventureCoinBonus ? `冒险金币 +${deco.buff.adventureCoinBonus * 100}%` : '')
      : ''
    showToast({ type: 'success', icon: '🎉', title: `获得 ${deco.emoji} ${deco.name}！`, message: buffText || undefined })
  }
}

function onBuyFurniture(furnId: string) {
  const furn = furniture.find(f => f.id === furnId)
  if (!furn) return
  if (coins.value < furn.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${furn.price - coins.value} 金币` })
    return
  }
  if (buyFurniture(furnId)) {
    showToast({ type: 'success', icon: '🎉', title: `获得 ${furn.emoji} ${furn.name}！`, message: furn.buff ? '属性加成已生效' : undefined })
  }
}

function onBuyGear(gearId: string) {
  const gearMap: Record<string, { price: number; flag: () => void; emoji: string; name: string; unlocks: string }> = {
    tent: { price: 100, flag: () => { hasTent.value = true }, emoji: '⛺', name: '帐篷', unlocks: '森林' },
    scarf: { price: 100, flag: () => { hasScarf.value = true }, emoji: '🧣', name: '围巾', unlocks: '雪山' },
    treasure_map: { price: 150, flag: () => { hasTreasureMap.value = true }, emoji: '🗺️', name: '藏宝图', unlocks: '废弃矿洞' },
    boat_ticket: { price: 180, flag: () => { hasBoatTicket.value = true }, emoji: '🎫', name: '船票', unlocks: '神秘海岛' },
    telescope: { price: 200, flag: () => { hasTelescope.value = true }, emoji: '🔭', name: '望远镜', unlocks: '星空天文台' },
  }

  const gear = gearMap[gearId]
  if (!gear) return
  if (coins.value < gear.price) {
    showToast({ type: 'warning', icon: '⚠️', title: '金币不够啦~', message: `还差 ${gear.price - coins.value} 金币` })
    return
  }
  coins.value -= gear.price
  gear.flag()
  showToast({ type: 'success', icon: '🎉', title: `获得 ${gear.emoji} ${gear.name}！`, message: `解锁 ${gear.unlocks}` })
}

function onToggleEquip(decoId: string) {
  toggleEquipDecoration(decoId)
}

function onPostcard() {
  closeMenu()
  showPostcards.value = true
}

function onSouvenir() {
  closeMenu()
  showSouvenirs.value = true
}

function onWardrobe() {
  closeMenu()
  showWardrobe.value = true
}

function onSettings() {
  closeMenu()
  showSettings.value = true
}

function onToggleAlwaysOnTop(value: boolean) {
  settings.value = { ...settings.value, alwaysOnTop: value }
  try { getCurrentWindow().setAlwaysOnTop(value) } catch { /* Not in Tauri */ }
}

function onChangeSize(value: string) {
  settings.value = { ...settings.value, size: value as SettingsData['size'] }
  // Optionally resize window
  const sizeMap: Record<string, [number, number]> = {
    small: [160, 180],
    medium: [240, 260],
    large: [320, 340],
  }
  const dims = sizeMap[value]
  if (dims) {
    try {
      const { LogicalSize } = await import('@tauri-apps/api/dpi')
      getCurrentWindow().setSize(new LogicalSize(dims[0], dims[1]))
    } catch { /* Not in Tauri */ }
  }
}

async function onQuit() {
  closeMenu()
  save()
  try { await getCurrentWindow().close() } catch { window.close() }
}

// --- Adventure integration ---
let adventureTimer: ReturnType<typeof setInterval> | null = null

watch(currentState, (newState) => {
  if (newState === 'adventure_out' && !isOnAdventure.value) {
    startAdventure({
      adventureTimeReduction: buffValues.value.adventureTimeReduction,
      souvenirChanceBonus: buffValues.value.souvenirChanceBonus,
      adventureCoinBonus: buffValues.value.adventureCoinBonus,
    })
  }
})

function pollAdventure() {
  if (!isOnAdventure.value) return
  const rewards = checkAdventureReturn({
    adventureTimeReduction: buffValues.value.adventureTimeReduction,
    souvenirChanceBonus: buffValues.value.souvenirChanceBonus,
    adventureCoinBonus: buffValues.value.adventureCoinBonus,
  })
  if (rewards) {
    setState('adventure_back')
    coins.value += rewards.coins

    // Show reward toasts with stagger
    showToast({ type: 'reward', icon: '✨', title: '冒险归来！', message: `获得 ${rewards.coins} 金币` })

    if (rewards.postcard) {
      setTimeout(() => {
        showToast({ type: 'reward', icon: '📮', title: '收到新明信片！', message: adventureLocation?.value?.name ? `${adventureLocation.value.name} 风景` : undefined })
      }, 500)
    }

    if (rewards.souvenir) {
      const rarityLabel = rewards.souvenir.rarity === 'legendary' ? '传说' : rewards.souvenir.rarity === 'rare' ? '稀有' : '普通'
      setTimeout(() => {
        showToast({ type: 'reward', icon: '🎁', title: `发现纪念品！`, message: `${rewards.souvenir!.emoji} ${rewards.souvenir!.name}（${rarityLabel}）` })
      }, rewards.postcard ? 1000 : 500)
    }
  }
}

onMounted(() => {
  const { offlineMinutes, offlineCoins } = load()

  // Apply settings
  if (settings.value.alwaysOnTop) {
    try { getCurrentWindow().setAlwaysOnTop(true) } catch { /* Not in Tauri */ }
  }

  // Show offline earnings toast
  if (offlineCoins > 0) {
    showToast({ type: 'info', icon: 'ℹ️', title: `离开了 ${offlineMinutes} 分钟`, message: `获得 ${offlineCoins} 金币` })
  }

  startCoinTimer()
  startAutoSave()
  adventureTimer = setInterval(pollAdventure, 5000)
  if (isOnAdventure.value) {
    setState('adventure_out')
  }
})

onUnmounted(() => {
  save()
  stopCoinTimer()
  stopAutoSave()
  if (adventureTimer) clearInterval(adventureTimer)
  if (clickTimer) clearTimeout(clickTimer)
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  background: transparent;
  position: relative;
  overflow: visible;
  cursor: grab;
}

.app-container:active {
  cursor: grabbing;
}

.hamster-area {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
}

.decoration-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.decoration-emoji {
  position: absolute;
  pointer-events: none;
}

.furniture-emoji {
  position: absolute;
  pointer-events: none;
}
</style>
```

- [ ] **Step 2: Fix the async issue in onChangeSize**

The `onChangeSize` function uses top-level `await` inside a non-async function. Fix it by making it async:

The function signature is already correct in the code above (uses `await import(...)` inside `onChangeSize`). However, since `onChangeSize` is not marked `async`, we need to adjust. Replace `onChangeSize` with:

```typescript
function onChangeSize(value: string) {
  settings.value = { ...settings.value, size: value as SettingsData['size'] }
  const sizeMap: Record<string, [number, number]> = {
    small: [160, 180],
    medium: [240, 260],
    large: [320, 340],
  }
  const dims = sizeMap[value]
  if (dims) {
    import('@tauri-apps/api/dpi').then(({ LogicalSize }) => {
      getCurrentWindow().setSize(new LogicalSize(dims[0], dims[1]))
    }).catch(() => { /* Not in Tauri */ })
  }
}
```

Note: In the full rewrite above, replace the `onChangeSize` function with this corrected version.

- [ ] **Step 3: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Build succeeds. Fix any type errors that arise.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate all new systems - toast, buff, wardrobe, settings, new shop"
```

---

### Task 14: Wire Coin Timer to Buff Multiplier

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update App.vue to pass buff getter to startCoinTimer**

In `src/App.vue`, change:
```typescript
  startCoinTimer()
```
To:
```typescript
  startCoinTimer(() => buffValues.value.coinMultiplier)
```

This is already included in the Task 13 rewrite of App.vue. Verify the line exists in `onMounted`. If Task 13 already has this, this task is a no-op verification.

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`

- [ ] **Step 3: Commit (if changes were needed)**

```bash
git add src/App.vue
git commit -m "feat: wire coin timer to buff multiplier for passive income boost"
```

---

### Task 15: PostcardGallery — Support New Locations

**Files:**
- Modify: `src/components/PostcardGallery.vue`

- [ ] **Step 1: Add SVG scenes for new locations**

Check the PostcardGallery component for how it renders location scenes. Add cases for the 3 new location IDs (`mine`, `island`, `observatory`) in whatever switch/map generates the SVG content.

Read `src/components/PostcardGallery.vue` to find the exact pattern, then add the 3 new location scene renderers following the same pattern. The new locations should automatically appear in the gallery since it iterates over the `locations` array from `data/locations.ts`.

If the component uses a `sceneMap` or similar, add entries:
- `mine`: Dark cave with gem sparkles
- `island`: Palm trees with sand and waves
- `observatory`: Dome with telescope and stars

- [ ] **Step 2: Verify build passes**

Run: `cd /data/workspace/hamster-pet && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/PostcardGallery.vue
git commit -m "feat: add postcard scenes for mine, island, and observatory"
```

---

### Task 16: Final Build Verification and Version Bump

**Files:**
- Modify: `package.json` (version bump)

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "0.1.0"` to `"version": "0.3.0"`.

- [ ] **Step 2: Full build verification**

Run: `cd /data/workspace/hamster-pet && npm run build`
Expected: Clean build with zero errors.

- [ ] **Step 3: Verify dev server starts**

Run: `cd /data/workspace/hamster-pet && timeout 15 npm run dev 2>&1 || true`
Expected: Dev server starts without compilation errors.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "chore: bump version to 0.3.0 with all enhancements"
git push
```
