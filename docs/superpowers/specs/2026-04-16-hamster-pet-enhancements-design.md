# Hamster Pet Enhancements Design

Date: 2026-04-16

## Overview

Four enhancements to the hamster desktop pet application:

1. **Settings activation** — Make "Always on Top" and "Size" settings functional
2. **New shop items** — Add decorations, furniture, foods, and exploration gear
3. **Item effects** — Visual overlays and stat buffs for purchased items
4. **Toast notifications** — Feedback system for purchases, rewards, and events

## 1. Settings Activation

### Always on Top (置顶显示)

- Call Tauri `getCurrentWindow().setAlwaysOnTop(bool)` on toggle
- Immediate effect on change
- Persist to localStorage via `useSave.ts`

### Size Adjustment (大小)

- Three sizes: 小 (small), 中 (medium, default), 大 (large)
- Implementation: CSS `transform: scale(factor)` on the hamster container
  - Small: `scale(0.67)` — effectively 32×32
  - Medium: `scale(1.0)` — current 48×48
  - Large: `scale(1.33)` — effectively 64×64
- Also call Tauri `getCurrentWindow().setSize()` to resize the window proportionally
- Immediate effect on change
- Persist to localStorage via `useSave.ts`

### Persistence

Add `settings` field to save data in `useSave.ts`:

```typescript
settings: {
  alwaysOnTop: boolean  // default false
  size: 'small' | 'medium' | 'large'  // default 'medium'
}
```

Load settings on app start and apply them immediately.

## 2. New Shop Items

### Shop UI Redesign

Convert `ShopWindow.vue` from a single list to a tabbed layout with 4 categories:

| Tab | Icon | Contents |
|-----|------|----------|
| 食物 | 🍽️ | 8 food items (consumable) |
| 装饰 | 👒 | 6 decoration items (one-time, wearable) |
| 家具 | 🏠 | 5 furniture items (one-time, permanent) |
| 装备 | 🎒 | 5 exploration gear (one-time, unlock locations) |

### New Foods (3 items added to existing 5)

| ID | Name | Emoji | Price | Effect |
|----|------|-------|-------|--------|
| strawberry | 草莓 | 🍓 | 12 | Basic food |
| cupcake | 小蛋糕 | 🧁 | 25 | Triggers happy animation on feed |
| deluxe_meal | 豪华大餐 | 🍱 | 50 | Triggers special happy animation + grateful dialogue |

### Decorations (6 items, one-time purchase, equippable)

| ID | Name | Emoji | Price | Position | Buff |
|----|------|-------|-------|----------|------|
| crown | 小皇冠 | 👑 | 80 | Head top | coinMultiplier +20% |
| sunglasses | 墨镜 | 🕶️ | 60 | Face | adventureTimeReduction -10% |
| bow | 蝴蝶结 | 🎀 | 40 | Ear | None (cosmetic) |
| bell | 小铃铛 | 🔔 | 50 | Neck | souvenirChanceBonus +10% |
| backpack | 小背包 | 🎒 | 70 | Back | adventureCoinBonus +30% |
| wreath | 花环 | 💐 | 45 | Head top | None (cosmetic) |

### Furniture (5 items, one-time purchase, always visible when owned)

| ID | Name | Emoji | Price | Position | Buff |
|----|------|-------|-------|----------|------|
| wheel | 仓鼠跑轮 | 🎡 | 120 | Right of hamster | coinMultiplier +50% (1.5/min) |
| nest | 温暖小窝 | 🏠 | 150 | Left of hamster | offlineCoinCap 120 (from 60) |
| swing | 小秋千 | 🪁 | 80 | Upper right | None (cosmetic) |
| sunflower_pot | 向日葵盆栽 | 🌻 | 60 | Lower left | None (cosmetic) |
| treasure_chest | 宝藏箱 | 📦 | 200 | Lower right | adventureCoinBonus +50% |

### Exploration Gear (3 new + 2 existing)

Existing: tent (⛺, 100 coins, unlocks forest), scarf (🧣, 100 coins, unlocks snowmountain)

| ID | Name | Emoji | Price | Unlocks |
|----|------|-------|-------|---------|
| treasure_map | 藏宝图 | 🗺️ | 150 | 废弃矿洞 (mine) |
| boat_ticket | 船票 | 🎫 | 180 | 神秘海岛 (island) |
| telescope | 望远镜 | 🔭 | 200 | 星空天文台 (observatory) |

### New Adventure Locations (3)

| ID | Name | Emoji | Description | Unlock | Possible Souvenirs |
|----|------|-------|-------------|--------|-------------------|
| mine | 废弃矿洞 | ⛏️ | 黑暗的矿洞中闪烁着微光 | hasTreasureMap | crystal, ruby_ore, ancient_coin |
| island | 神秘海岛 | 🏝️ | 碧蓝海水环绕的小岛 | hasBoatTicket | pearl_necklace, starfish, message_bottle |
| observatory | 星空天文台 | 🔭 | 星光璀璨的天文台穹顶 | hasTelescope | meteor_fragment, star_map, moon_rock |

Each new location also needs a `postcardDescription` for the PostcardGallery SVG scene:
- mine: "幽暗的矿洞深处，宝石在岩壁上闪闪发光"
- island: "棕榈树下，仓鼠在沙滩上留下了小脚印"
- observatory: "巨大的望远镜对准了璀璨的银河"

### New Souvenirs (9 for new locations)

| ID | Name | Emoji | Rarity | From |
|----|------|-------|--------|------|
| crystal | 水晶石 | 💎 | common | mine |
| ruby_ore | 红宝石矿 | 🔴 | rare | mine |
| ancient_coin | 远古金币 | 🪙 | legendary | mine |
| pearl_necklace | 珍珠项链 | 📿 | common | island |
| starfish | 海星 | ⭐ | common | island |
| message_bottle | 漂流瓶 | 🍶 | rare | island |
| meteor_fragment | 流星碎片 | ☄️ | rare | observatory |
| star_map | 星图 | 🌌 | common | observatory |
| moon_rock | 月球岩石 | 🌑 | legendary | observatory |

## 3. Item Effects System

### Visual Effects

#### Decoration Overlays

Decorations are emoji elements absolutely positioned over the hamster sprite. Each decoration has a defined position slot:

```
Position slots (relative to 48×48 hamster sprite):
  head_top:   top: -8px, left: 50%, transform: translateX(-50%)
  face:       top: 12px, left: 50%, transform: translateX(-50%)
  ear:        top: 2px, right: 2px
  neck:       top: 22px, left: 50%, transform: translateX(-50%)
  back:       top: 16px, right: -4px
```

Only one decoration per slot can be worn. Crown and wreath share `head_top` — only one active at a time.

Implementation: Wrap `HamsterSprite` in a container div. Overlay emoji elements with `position: absolute` and `pointer-events: none`. Scale with the hamster when size setting changes.

#### Furniture Display

Furniture emoji positioned around the hamster in fixed spots:

```
Positions (relative to hamster center):
  right:       right: -30px, bottom: 0
  left:        left: -30px, bottom: 0
  upper_right: right: -25px, top: -10px
  lower_left:  left: -25px, bottom: -5px
  lower_right: right: -25px, bottom: -5px
```

All owned furniture is always visible (no equip/unequip).

#### Wardrobe Panel

New `WardrobePanel.vue` component accessible from the right-click context menu (new item: 👗 衣柜).

Displays all owned decorations. Click to toggle equipped state. Shows which slot each item occupies and highlights conflicts.

### Buff System

New `useBuff.ts` composable:

```typescript
interface BuffValues {
  coinMultiplier: number         // Default 1.0, multiplied by passive coin rate
  adventureTimeReduction: number // Default 0, percentage reduction in adventure duration
  souvenirChanceBonus: number    // Default 0, added to souvenir drop probability
  adventureCoinBonus: number     // Default 0, percentage bonus to adventure coin rewards
  offlineCoinCap: number         // Default 60, max offline coins
}
```

Computation:
- Iterate all equipped decorations + all owned furniture
- Sum percentage bonuses additively (e.g., crown +20% + wheel +50% = coinMultiplier 1.7)
- `offlineCoinCap` takes the maximum value from any source

Consumers:
- `useInventory.ts` reads `coinMultiplier` for passive coin timer (floor result to integer)
- `useAdventure.ts` reads `adventureTimeReduction`, `souvenirChanceBonus`, `adventureCoinBonus`
- `useSave.ts` reads `offlineCoinCap` for offline coin calculation

### Food Effects

| Food | Animation | Dialogue |
|------|-----------|----------|
| Basic (sunflower, bread, apple, cheese, nuts, strawberry) | Standard eating (3-6s) | Random eating phrase |
| cupcake | Eating (3s) → Happy (2s) | "好好吃的蛋糕！🎂" |
| deluxe_meal | Eating (4s) → Happy (3s) with extra bounce | "这是什么神仙美食！太幸福了！✨" |

### Persistence

Add to save data:

```typescript
{
  // existing fields...
  ownedDecorations: string[]      // IDs of owned decorations
  equippedDecorations: string[]   // IDs of currently equipped decorations
  ownedFurniture: string[]        // IDs of owned furniture
  adventure: {
    // existing fields...
    hasTreasureMap: boolean
    hasBoatTicket: boolean
    hasTelescope: boolean
  }
}
```

## 4. Toast Notification System

### Component: `ToastNotification.vue`

Position: Fixed, top-right corner of window.
Max visible: 3 toasts stacked vertically (newest on top).
Auto-dismiss: 3 seconds.
Animation: Slide in from right, fade out.

### Toast Types

| Type | Icon | Background | Use Case |
|------|------|------------|----------|
| success | 🎉 | Green (#E8F5E9) | Purchase success, feed success |
| reward | ✨ | Gold (#FFF8E1) | Adventure rewards |
| info | ℹ️ | Blue (#E3F2FD) | General info, offline earnings |
| warning | ⚠️ | Orange (#FFF3E0) | Insufficient coins |

### Composable: `useToast.ts`

```typescript
interface Toast {
  id: number
  type: 'success' | 'reward' | 'info' | 'warning'
  icon: string
  title: string
  message?: string
  duration?: number  // default 3000ms
}

const { toasts, showToast, removeToast } = useToast()
```

### Trigger Points

| Event | Type | Example Content |
|-------|------|-----------------|
| Buy food | success | "🎉 成功购买 🌻 葵花籽 ×1" |
| Buy decoration | success | "🎉 获得 👑 小皇冠！金币收入 +20%" |
| Buy furniture | success | "🎉 获得 🎡 仓鼠跑轮！被动收入提升" |
| Buy gear | success | "🎉 获得 🗺️ 藏宝图！解锁废弃矿洞" |
| Insufficient coins | warning | "⚠️ 金币不够啦~ 还差 XX 金币" |
| Adventure return - coins | reward | "✨ 冒险归来！获得 12 金币" |
| Adventure return - postcard | reward | "✨ 收到新明信片！📮 公园风景" |
| Adventure return - souvenir | reward | "✨ 发现纪念品！🐚 贝壳项链（稀有）" |
| Feed hamster | success | "🎉 仓鼠吃了 🌻 葵花籽，看起来很满足~" |
| Offline earnings | info | "ℹ️ 你离开了 XX 分钟，获得 XX 金币" |

### Multi-reward Handling

When adventure returns multiple rewards (coins + postcard + souvenir), show them as separate toasts with 500ms stagger delay so they cascade in visually.

## File Changes Summary

### New Files
- `src/components/ToastNotification.vue` — Toast UI component
- `src/components/WardrobePanel.vue` — Decoration equip/unequip UI
- `src/composables/useToast.ts` — Toast state management
- `src/composables/useBuff.ts` — Buff calculation from items
- `src/data/decorations.ts` — Decoration item definitions
- `src/data/furniture.ts` — Furniture item definitions

### Modified Files
- `src/components/SettingsPanel.vue` — Wire up alwaysOnTop and size to Tauri APIs + persistence
- `src/components/ShopWindow.vue` — Tabbed layout, new item categories, toast integration
- `src/components/FeedMenu.vue` — Toast on feed, special food effects
- `src/components/HamsterSprite.vue` — Wrap in container for decoration/furniture overlays
- `src/components/ContextMenu.vue` — Add "衣柜" menu item
- `src/composables/useInventory.ts` — Read buff multipliers, add decoration/furniture purchase methods
- `src/composables/useAdventure.ts` — Read buff values, add new locations/souvenirs/gear flags
- `src/composables/useSave.ts` — Persist settings, decorations, furniture, new gear flags
- `src/data/foods.ts` — Add 3 new foods with effect metadata
- `src/data/locations.ts` — Add 3 new locations
- `src/data/souvenirs.ts` — Add 9 new souvenirs
- `src/App.vue` — Mount ToastNotification, integrate toast calls for adventure returns and offline earnings

## Economy Balance

### Income Sources
| Source | Rate | With Max Buffs |
|--------|------|----------------|
| Passive coins | 1/min | 1.7/min (crown +20% + wheel +50%) |
| Adventure coins | 5-15 per trip | 11.7-27.3 (backpack +30% + chest +50%) |
| Offline coins | Max 60 | Max 120 (nest) |

### Total Shop Cost
| Category | Total Cost |
|----------|------------|
| All foods (one of each) | 167 coins |
| All decorations | 345 coins |
| All furniture | 610 coins |
| All gear (including existing) | 830 coins |
| **Grand Total** | **1,952 coins** |

This creates a progression arc of roughly 20-30 hours of play to buy everything, which feels appropriate for a casual desktop pet.
